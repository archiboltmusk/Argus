use tokio::process::{Child, Command};

pub fn init() {
    #[cfg(windows)]
    win::init();
}

pub fn configure_command(cmd: &mut Command) {
    #[cfg(target_os = "linux")]
    unsafe {
        cmd.pre_exec(|| {
            libc::prctl(libc::PR_SET_PDEATHSIG, libc::SIGKILL);
            Ok(())
        });
    }
    #[cfg(not(target_os = "linux"))]
    let _ = cmd;
}

pub fn adopt(child: &Child) {
    #[cfg(windows)]
    if let Some(handle) = child.raw_handle() {
        win::assign(handle as isize);
    }
    #[cfg(not(windows))]
    let _ = child;
}

pub fn reap_orphans() {
    reap_platform();
}

/// IPC pipe-name markers of the mpv helpers Argus starts for thumbnails and multiview.
/// The Unix path below hands the same two markers to pkill.
#[cfg(any(windows, test))]
const HELPER_SIGNATURES: [&str; 2] = ["argus-thumbs-", "argus-mv-"];

#[cfg(any(windows, test))]
fn is_mpv_image(name: &std::ffi::OsStr) -> bool {
    name.to_string_lossy()
        .to_ascii_lowercase()
        .starts_with("mpv")
}

#[cfg(any(windows, test))]
fn is_helper_command_line(args: &[std::ffi::OsString]) -> bool {
    args.iter().any(|arg| {
        let arg = arg.to_string_lossy().to_ascii_lowercase();
        HELPER_SIGNATURES
            .iter()
            .any(|signature| arg.contains(signature))
    })
}

// Runs on the setup thread before the window can appear, so it must not start a helper
// process. Image names come from a process snapshot, which opens nothing. sysinfo opens
// every process it is asked about, so it is asked only about the ones named mpv*, and
// only to read their command line.
#[cfg(windows)]
fn reap_platform() {
    use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};
    let candidates: Vec<Pid> = win::process_ids(is_mpv_image)
        .into_iter()
        .map(Pid::from_u32)
        .collect();
    if candidates.is_empty() {
        return;
    }
    let mut system = System::new();
    system.refresh_processes_specifics(
        ProcessesToUpdate::Some(&candidates),
        false,
        ProcessRefreshKind::nothing().with_cmd(UpdateKind::Always),
    );
    for pid in candidates {
        // The name is checked again: this is sysinfo's own, later look at the process.
        let orphaned = system.process(pid).is_some_and(|process| {
            is_mpv_image(process.name()) && is_helper_command_line(process.cmd())
        });
        if orphaned {
            win::terminate(pid.as_u32());
        }
    }
}

#[cfg(not(windows))]
fn reap_platform() {
    for signature in ["argus-thumbs-", "argus-mv-"] {
        let _ = std::process::Command::new("pkill")
            .args(["-9", "-f", signature])
            .output();
    }
}

#[cfg(windows)]
mod win {
    use std::sync::OnceLock;
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{CloseHandle, HANDLE};
    use windows::Win32::System::JobObjects::{
        AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
        SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    };

    struct Job(HANDLE);
    unsafe impl Send for Job {}
    unsafe impl Sync for Job {}

    static JOB: OnceLock<Option<Job>> = OnceLock::new();

    pub fn init() {
        JOB.get_or_init(create);
    }

    fn create() -> Option<Job> {
        unsafe {
            let job = CreateJobObjectW(None, PCWSTR::null()).ok()?;
            let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            if SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                &info as *const _ as *const core::ffi::c_void,
                core::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            )
            .is_err()
            {
                let _ = CloseHandle(job);
                return None;
            }
            Some(Job(job))
        }
    }

    pub fn assign(raw: isize) {
        if raw == 0 {
            return;
        }
        let Some(Some(job)) = JOB.get() else {
            return;
        };
        unsafe {
            let _ = AssignProcessToJobObject(job.0, HANDLE(raw as *mut core::ffi::c_void));
        }
    }

    /// Ids of the running processes whose image name satisfies `wanted`. Read from a
    /// snapshot of the process list, so no process is opened.
    pub fn process_ids(wanted: impl Fn(&std::ffi::OsStr) -> bool) -> Vec<u32> {
        use std::os::windows::ffi::OsStringExt;
        use windows::Win32::System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
            TH32CS_SNAPPROCESS,
        };
        let mut ids = Vec::new();
        unsafe {
            let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
                return ids;
            };
            let mut entry = PROCESSENTRY32W {
                dwSize: core::mem::size_of::<PROCESSENTRY32W>() as u32,
                ..Default::default()
            };
            let mut more = Process32FirstW(snapshot, &mut entry).is_ok();
            while more {
                let len = entry
                    .szExeFile
                    .iter()
                    .position(|unit| *unit == 0)
                    .unwrap_or(entry.szExeFile.len());
                if wanted(&std::ffi::OsString::from_wide(&entry.szExeFile[..len])) {
                    ids.push(entry.th32ProcessID);
                }
                more = Process32NextW(snapshot, &mut entry).is_ok();
            }
            let _ = CloseHandle(snapshot);
        }
        ids
    }

    pub fn terminate(pid: u32) {
        use windows::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};
        unsafe {
            if let Ok(process) = OpenProcess(PROCESS_TERMINATE, false, pid) {
                let _ = TerminateProcess(process, 1);
                let _ = CloseHandle(process);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{is_helper_command_line, is_mpv_image};
    use std::ffi::{OsStr, OsString};

    fn args(list: &[&str]) -> Vec<OsString> {
        list.iter().map(OsString::from).collect()
    }

    #[test]
    fn mpv_images_match_by_prefix_whatever_the_case() {
        for name in ["mpv.exe", "MPV.EXE", "mpv", "mpvnet.exe"] {
            assert!(is_mpv_image(OsStr::new(name)), "{name}");
        }
        for name in ["argus.exe", "ffmpeg.exe", "smpv.exe", ""] {
            assert!(!is_mpv_image(OsStr::new(name)), "{name}");
        }
    }

    #[test]
    fn only_argus_helper_pipes_mark_an_orphan() {
        assert!(is_helper_command_line(&args(&[
            "mpv.exe",
            r"--input-ipc-server=\\.\pipe\argus-thumbs-1a2b",
            "--vo=null",
        ])));
        assert!(is_helper_command_line(&args(&[
            "mpv.exe",
            r"--input-ipc-server=\\.\pipe\ARGUS-MV-7",
        ])));
        // The user's own external player and unrelated mpv instances must survive.
        assert!(!is_helper_command_line(&args(&[
            "mpv.exe",
            r"--input-ipc-server=\\.\pipe\argus-external-mpv-9",
            "movie.mkv",
        ])));
        assert!(!is_helper_command_line(&args(&["mpv.exe", "movie.mkv"])));
        assert!(!is_helper_command_line(&[]));
    }
}
