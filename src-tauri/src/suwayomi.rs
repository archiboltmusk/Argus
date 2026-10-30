//! Automatic background daemon supervisor for Suwayomi-Server / Tachidesk.
//!
//! Eliminates the friction of manually starting the server before launching Argus:
//! - Multi-tier auto-discovery across Applications, ~/Downloads, ~/Desktop, Home, and system PATH.
//! - Direct headless binary execution without opening Terminal windows.
//! - Running process table detection (prevents duplicate instances).
//! - Fast TCP socket probing with incremental backoff.
//! - Reports live status (Running, Stopped, Starting, NotFound).

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;

const DEFAULT_SUWAYOMI_PORT: u16 = 4567;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SuwayomiDaemonStatus {
    pub is_running: bool,
    pub is_installed: bool,
    pub installed_path: Option<String>,
    pub port: u16,
    pub base_url: String,
}

#[derive(Clone, Debug)]
pub struct SuwayomiLaunchSpec {
    pub display_path: PathBuf,
    pub executable: PathBuf,
    pub args: Vec<String>,
    pub working_dir: Option<PathBuf>,
    pub is_app_bundle: bool,
}

static DAEMON_STARTED_BY_ARGUS: AtomicBool = AtomicBool::new(false);
static CUSTOM_SUWAYOMI_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

/// Checks whether local port 4567 (or configured port) is actively listening.
pub fn is_suwayomi_listening(port: u16) -> bool {
    use std::net::{SocketAddr, TcpStream};
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(350)).is_ok()
}

/// Checks whether a Suwayomi or Tachidesk process is already running in memory.
pub fn is_suwayomi_process_running() -> bool {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        if let Ok(output) = Command::new("pgrep").args(["-f", "-i", "suwayomi"]).output() {
            if output.status.success() && !output.stdout.is_empty() {
                return true;
            }
        }
        if let Ok(output) = Command::new("pgrep").args(["-f", "-i", "tachidesk"]).output() {
            if output.status.success() && !output.stdout.is_empty() {
                return true;
            }
        }
    }
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("tasklist").args(["/fi", "imagename eq Suwayomi*"]).output() {
            let s = String::from_utf8_lossy(&output.stdout).to_lowercase();
            if s.contains("suwayomi") || s.contains("tachidesk") {
                return true;
            }
        }
    }
    false
}

/// Inspects a specific directory to see if it is a valid Suwayomi/Tachidesk installation.
fn inspect_suwayomi_dir(folder: &Path) -> Option<SuwayomiLaunchSpec> {
    if !folder.is_dir() {
        return None;
    }

    #[cfg(target_os = "macos")]
    {
        // 1. Check for bundled bin/Suwayomi-Server script (Preferred headless launch)
        let bin = folder.join("bin").join("Suwayomi-Server");
        if bin.is_file() {
            return Some(SuwayomiLaunchSpec {
                display_path: folder.to_path_buf(),
                executable: bin,
                args: Vec::new(),
                working_dir: Some(folder.to_path_buf()),
                is_app_bundle: false,
            });
        }

        // 2. Check for bundled JRE + Launcher JAR
        let jre_java = folder.join("jre").join("bin").join("java");
        let jar = folder.join("Suwayomi-Launcher.jar");
        if jre_java.is_file() && jar.is_file() {
            return Some(SuwayomiLaunchSpec {
                display_path: folder.to_path_buf(),
                executable: jre_java,
                args: vec!["-jar".to_string(), "Suwayomi-Launcher.jar".to_string()],
                working_dir: Some(folder.to_path_buf()),
                is_app_bundle: false,
            });
        }

        // 3. Check for Suwayomi Launcher.command script
        let cmd_script = folder.join("Suwayomi Launcher.command");
        if cmd_script.is_file() {
            return Some(SuwayomiLaunchSpec {
                display_path: folder.to_path_buf(),
                executable: PathBuf::from("/bin/bash"),
                args: vec![cmd_script.to_string_lossy().to_string()],
                working_dir: Some(folder.to_path_buf()),
                is_app_bundle: false,
            });
        }
    }

    #[cfg(target_os = "windows")]
    {
        let exe = folder.join("Suwayomi-Server.exe");
        if exe.is_file() {
            return Some(SuwayomiLaunchSpec {
                display_path: folder.to_path_buf(),
                executable: exe,
                args: Vec::new(),
                working_dir: Some(folder.to_path_buf()),
                is_app_bundle: false,
            });
        }

        let bat = folder.join("bin").join("Suwayomi-Server.bat");
        if bat.is_file() {
            return Some(SuwayomiLaunchSpec {
                display_path: folder.to_path_buf(),
                executable: bat,
                args: Vec::new(),
                working_dir: Some(folder.to_path_buf()),
                is_app_bundle: false,
            });
        }
    }

    #[cfg(target_os = "linux")]
    {
        let bin = folder.join("bin").join("Suwayomi-Server");
        if bin.is_file() {
            return Some(SuwayomiLaunchSpec {
                display_path: folder.to_path_buf(),
                executable: bin,
                args: Vec::new(),
                working_dir: Some(folder.to_path_buf()),
                is_app_bundle: false,
            });
        }
    }

    None
}

/// Scans child directories inside a parent folder matching Suwayomi/Tachidesk naming.
fn scan_parent_folder(parent: &Path) -> Option<SuwayomiLaunchSpec> {
    if !parent.is_dir() {
        return None;
    }
    let entries = std::fs::read_dir(parent).ok()?;
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            let name = p.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
            if name.contains("suwayomi") || name.contains("tachidesk") {
                if let Some(spec) = inspect_suwayomi_dir(&p) {
                    return Some(spec);
                }
            }
        }
    }
    None
}

/// Multi-tier discovery algorithm across system paths and user directories.
pub fn find_suwayomi_launch_spec() -> Option<SuwayomiLaunchSpec> {
    // 0. User custom path priority
    if let Ok(guard) = CUSTOM_SUWAYOMI_PATH.lock() {
        if let Some(custom) = guard.as_ref() {
            if custom.exists() {
                if custom.is_dir() {
                    if let Some(spec) = inspect_suwayomi_dir(custom) {
                        return Some(spec);
                    }
                } else if custom.is_file() {
                    return Some(SuwayomiLaunchSpec {
                        display_path: custom.clone(),
                        executable: custom.clone(),
                        args: Vec::new(),
                        working_dir: custom.parent().map(|p| p.to_path_buf()),
                        is_app_bundle: custom.to_string_lossy().ends_with(".app"),
                    });
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // 1. Standard application bundles
        let app_candidates = [
            "/Applications/Suwayomi-Server.app",
            "/Applications/Tachidesk.app",
        ];
        for candidate in app_candidates {
            let p = Path::new(candidate);
            if p.exists() {
                return Some(SuwayomiLaunchSpec {
                    display_path: p.to_path_buf(),
                    executable: p.to_path_buf(),
                    args: Vec::new(),
                    working_dir: None,
                    is_app_bundle: true,
                });
            }
        }

        // 2. Homebrew / local bin
        let bin_candidates = [
            "/opt/homebrew/bin/suwayomi-server",
            "/usr/local/bin/suwayomi-server",
        ];
        for candidate in bin_candidates {
            let p = Path::new(candidate);
            if p.exists() {
                return Some(SuwayomiLaunchSpec {
                    display_path: p.to_path_buf(),
                    executable: p.to_path_buf(),
                    args: Vec::new(),
                    working_dir: None,
                    is_app_bundle: false,
                });
            }
        }

        // 3. User directories (Downloads, Desktop, Home, Applications)
        if let Ok(home) = std::env::var("HOME") {
            let home_path = PathBuf::from(home);

            // User Applications folder
            let user_app = home_path.join("Applications/Suwayomi-Server.app");
            if user_app.exists() {
                return Some(SuwayomiLaunchSpec {
                    display_path: user_app.clone(),
                    executable: user_app,
                    args: Vec::new(),
                    working_dir: None,
                    is_app_bundle: true,
                });
            }

            // User Downloads folder (Very common for downloaded portable release)
            if let Some(spec) = scan_parent_folder(&home_path.join("Downloads")) {
                return Some(spec);
            }

            // User Desktop folder
            if let Some(spec) = scan_parent_folder(&home_path.join("Desktop")) {
                return Some(spec);
            }

            // User Home folder directly
            if let Some(spec) = scan_parent_folder(&home_path) {
                return Some(spec);
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let p = PathBuf::from(&local_app_data).join("Programs\\Suwayomi-Server\\Suwayomi-Server.exe");
            if p.exists() {
                return Some(SuwayomiLaunchSpec {
                    display_path: p.clone(),
                    executable: p,
                    args: Vec::new(),
                    working_dir: None,
                    is_app_bundle: false,
                });
            }
        }
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            let up = PathBuf::from(userprofile);
            if let Some(spec) = scan_parent_folder(&up.join("Downloads")) {
                return Some(spec);
            }
            if let Some(spec) = scan_parent_folder(&up.join("Desktop")) {
                return Some(spec);
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let candidates = [
            "/usr/bin/suwayomi-server",
            "/usr/local/bin/suwayomi-server",
            "/var/lib/flatpak/exports/bin/org.suwayomi.server",
        ];
        for candidate in candidates {
            let p = Path::new(candidate);
            if p.exists() {
                return Some(SuwayomiLaunchSpec {
                    display_path: p.to_path_buf(),
                    executable: p.to_path_buf(),
                    args: Vec::new(),
                    working_dir: None,
                    is_app_bundle: false,
                });
            }
        }
        if let Ok(home) = std::env::var("HOME") {
            let hp = PathBuf::from(home);
            if let Some(spec) = scan_parent_folder(&hp.join("Downloads")) {
                return Some(spec);
            }
            if let Some(spec) = scan_parent_folder(&hp.join(".local/share")) {
                return Some(spec);
            }
        }
    }

    None
}

/// Allows user to manually set or select their custom Suwayomi-Server directory/executable.
#[tauri::command]
pub fn suwayomi_set_custom_path(path: String) -> SuwayomiDaemonStatus {
    let p = PathBuf::from(path.trim());
    if p.exists() {
        if let Ok(mut guard) = CUSTOM_SUWAYOMI_PATH.lock() {
            *guard = Some(p);
        }
    }
    suwayomi_daemon_status()
}

/// Returns the current running and discovery status of the local Suwayomi daemon.
#[tauri::command]
pub fn suwayomi_daemon_status() -> SuwayomiDaemonStatus {
    let is_running = is_suwayomi_listening(DEFAULT_SUWAYOMI_PORT);
    let installed = find_suwayomi_launch_spec();
    let is_installed = installed.is_some() || is_running || is_suwayomi_process_running();
    let installed_path = installed.map(|s| s.display_path.to_string_lossy().to_string());

    SuwayomiDaemonStatus {
        is_running,
        is_installed,
        installed_path,
        port: DEFAULT_SUWAYOMI_PORT,
        base_url: format!("http://127.0.0.1:{}", DEFAULT_SUWAYOMI_PORT),
    }
}

/// Automatically spawns Suwayomi Server in the background without stealing focus.
#[tauri::command]
pub async fn suwayomi_daemon_start() -> Result<SuwayomiDaemonStatus, String> {
    if is_suwayomi_listening(DEFAULT_SUWAYOMI_PORT) {
        return Ok(suwayomi_daemon_status());
    }

    // If already running in the process table (booting JVM), wait for listening port
    if is_suwayomi_process_running() {
        for _ in 0..16 {
            tokio::time::sleep(Duration::from_millis(500)).await;
            if is_suwayomi_listening(DEFAULT_SUWAYOMI_PORT) {
                return Ok(suwayomi_daemon_status());
            }
        }
    }

    let spec = find_suwayomi_launch_spec().ok_or_else(|| {
        "Suwayomi Server not found on this system. Please place the extracted Suwayomi folder in Downloads, Desktop, or Applications.".to_string()
    })?;

    if spec.is_app_bundle {
        #[cfg(target_os = "macos")]
        {
            let bin_str = spec.executable.to_string_lossy();
            let status = Command::new("open")
                .args(["-g", "-a", &bin_str])
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .map_err(|e| format!("failed to launch Suwayomi app: {}", e))?;
            if !status.success() {
                return Err(format!("open command exited with status: {}", status));
            }
        }
    } else {
        let mut cmd = Command::new(&spec.executable);
        cmd.args(&spec.args);
        if let Some(wd) = &spec.working_dir {
            cmd.current_dir(wd);
        }
        cmd.stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
        }

        cmd.spawn()
            .map_err(|e| format!("failed to spawn Suwayomi ({}): {}", spec.executable.display(), e))?;
    }

    DAEMON_STARTED_BY_ARGUS.store(true, Ordering::SeqCst);

    // Poll until port 4567 responds (up to 20 seconds for JVM startup)
    for _ in 0..40 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        if is_suwayomi_listening(DEFAULT_SUWAYOMI_PORT) {
            break;
        }
    }

    Ok(suwayomi_daemon_status())
}

/// Gracefully stops Suwayomi Server if requested.
#[tauri::command]
pub async fn suwayomi_daemon_stop() -> Result<bool, String> {
    if !is_suwayomi_listening(DEFAULT_SUWAYOMI_PORT) {
        return Ok(true);
    }

    // Try graceful API stop first
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(1500))
        .build()
        .map_err(|e| e.to_string())?;

    let stop_url = format!("http://127.0.0.1:{}/api/v1/settings/server/stop", DEFAULT_SUWAYOMI_PORT);
    let _ = client.post(&stop_url).send().await;

    DAEMON_STARTED_BY_ARGUS.store(false, Ordering::SeqCst);
    tokio::time::sleep(Duration::from_millis(500)).await;

    Ok(!is_suwayomi_listening(DEFAULT_SUWAYOMI_PORT))
}
