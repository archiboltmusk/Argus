use std::time::Duration;

use tauri::AppHandle;
use tokio::sync::OnceCell;

#[derive(Clone, Debug, serde::Serialize)]
pub struct CastServerStatus {
    pub bundled: bool,
    pub running: bool,
    pub ready: bool,
    pub port: Option<u16>,
    pub last_error: Option<String>,
    pub restart_count: u32,
}

pub fn stop() {
    crate::torrent_engine::stop_lan_server();
}

fn kill_orphan_sidecars() {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/T", "/FI", "IMAGENAME eq stremio-server*"])
            .creation_flags(0x0800_0000)
            .output();
    }
    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("pkill")
            .args(["-f", "stremio-server"])
            .output();
    }
}

/// Filled when the clean-up of sidecars that an older version left running is over.
static LEGACY_CLEANUP: OnceCell<()> = OnceCell::const_new();

/// pkill does not wait for the processes it ends, and a port is held until its process is gone. The
/// updater and the installer allow about as much time after the same kill.
const SIDECAR_EXIT_GRACE: Duration = Duration::from_millis(500);

/// Keeps a clean-up that hangs from holding the LAN listener back for good.
const LEGACY_CLEANUP_WAIT: Duration = Duration::from_secs(10);

/// Runs `cleanup` on a blocking thread, unless that has been done. Every caller returns when the
/// run is over and what it ended has had time to exit.
async fn run_once(done: &OnceCell<()>, cleanup: impl FnOnce() + Send + 'static) {
    done.get_or_init(|| async move {
        let _ = tokio::task::spawn_blocking(cleanup).await;
        tokio::time::sleep(SIDECAR_EXIT_GRACE).await;
    })
    .await;
}

pub fn ensure_started_on_setup(_app: &AppHandle) {
    // Not awaited here: taskkill must not hold the window back.
    tauri::async_runtime::spawn(run_once(&LEGACY_CLEANUP, kill_orphan_sidecars));
}

/// Waits for the clean-up that setup started. Until it is over, an old sidecar can still hold the
/// LAN port.
pub async fn wait_for_legacy_cleanup() {
    let cleanup = run_once(&LEGACY_CLEANUP, kill_orphan_sidecars);
    let _ = tokio::time::timeout(LEGACY_CLEANUP_WAIT, cleanup).await;
}

#[tauri::command]
pub fn stop_stremio_sidecar() {
    kill_orphan_sidecars();
}

#[tauri::command]
pub fn cast_server_status() -> CastServerStatus {
    let (running, port, last_error) = crate::torrent_engine::lan_status();
    CastServerStatus {
        bundled: running,
        running,
        ready: running,
        port,
        last_error,
        restart_count: 0,
    }
}

#[tauri::command]
pub async fn cast_server_restart(app: AppHandle) -> Result<(), String> {
    crate::torrent_engine::start_lan_server(&app)
        .await
        .map(|_| ())
}

#[tauri::command]
pub fn cast_server_stop() {
    crate::torrent_engine::stop_lan_server();
    kill_orphan_sidecars();
}

#[cfg(test)]
mod tests {
    use super::run_once;
    use std::net::{Ipv4Addr, TcpListener};
    use std::time::Duration;
    use tokio::sync::OnceCell;

    #[tokio::test]
    async fn the_port_of_an_old_sidecar_is_free_once_the_cleanup_has_been_awaited() {
        let done = OnceCell::new();
        // Stands in for the old sidecar, which holds its port.
        let sidecar = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let address = sidecar.local_addr().unwrap();

        // Returns before the port is free, as pkill does.
        let setup = run_once(&done, move || {
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(50));
                drop(sidecar);
            });
        });
        let lan_server = async {
            run_once(&done, || panic!("the clean-up has to run only once")).await;
            TcpListener::bind(address).map(drop)
        };

        let ((), bound) = tokio::join!(biased; setup, lan_server);
        bound.expect("the LAN server was started while the old sidecar still held the port");
    }

    #[tokio::test]
    async fn a_cleanup_that_fails_still_lets_the_listener_start() {
        let done = OnceCell::new();
        run_once(&done, || panic!("clean-up failed")).await;
        assert!(done.initialized());
    }
}
