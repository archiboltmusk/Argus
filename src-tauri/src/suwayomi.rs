//! Automatic background daemon supervisor for Suwayomi-Server / Tachidesk.
//!
//! Eliminates the friction of manually starting the server before launching Argus:
//! - Auto-discovers installed Suwayomi / Tachidesk binaries across macOS, Windows, and Linux.
//! - Checks if port 4567 is already responding.
//! - Spawns the daemon in the background detached from the UI without stealing window focus.
//! - Reports live status (Running, Stopped, Starting, NotFound).

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
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

static DAEMON_STARTED_BY_ARGUS: AtomicBool = AtomicBool::new(false);

/// Checks whether local port 4567 (or configured port) is actively listening.
pub fn is_suwayomi_listening(port: u16) -> bool {
    use std::net::{SocketAddr, TcpStream};
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(350)).is_ok()
}

/// Discovers known installed paths for Suwayomi / Tachidesk on the host system.
pub fn find_suwayomi_binary() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let candidates = [
            "/Applications/Suwayomi-Server.app",
            "/Applications/Tachidesk.app",
            "/opt/homebrew/bin/suwayomi-server",
            "/usr/local/bin/suwayomi-server",
        ];
        for candidate in candidates {
            let p = Path::new(candidate);
            if p.exists() {
                return Some(p.to_path_buf());
            }
        }
        if let Ok(home) = std::env::var("HOME") {
            let user_app = PathBuf::from(&home).join("Applications/Suwayomi-Server.app");
            if user_app.exists() {
                return Some(user_app);
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let p = PathBuf::from(local_app_data).join("Programs\\Suwayomi-Server\\Suwayomi-Server.exe");
            if p.exists() {
                return Some(p);
            }
        }
        if let Ok(prog_files) = std::env::var("ProgramFiles") {
            let p = PathBuf::from(prog_files).join("Suwayomi-Server\\Suwayomi-Server.exe");
            if p.exists() {
                return Some(p);
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
                return Some(p.to_path_buf());
            }
        }
    }

    None
}

/// Returns the current running and discovery status of the local Suwayomi daemon.
#[tauri::command]
pub fn suwayomi_daemon_status() -> SuwayomiDaemonStatus {
    let is_running = is_suwayomi_listening(DEFAULT_SUWAYOMI_PORT);
    let installed = find_suwayomi_binary();
    let is_installed = installed.is_some() || is_running;
    let installed_path = installed.map(|p| p.to_string_lossy().to_string());

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

    let binary = find_suwayomi_binary().ok_or_else(|| {
        "Suwayomi Server not found on this system. Please install Suwayomi Server or configure an existing server URL in Manga Sources.".to_string()
    })?;

    #[cfg(target_os = "macos")]
    {
        let bin_str = binary.to_string_lossy();
        if bin_str.ends_with(".app") {
            // Launch in background (-g: do not bring application to foreground)
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
        } else {
            let _ = Command::new(&binary)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|e| format!("failed to spawn Suwayomi binary: {}", e))?;
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = Command::new(&binary);
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
        cmd.stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("failed to spawn Suwayomi on Windows: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        let _ = Command::new(&binary)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("failed to spawn Suwayomi on Linux: {}", e))?;
    }

    DAEMON_STARTED_BY_ARGUS.store(true, Ordering::SeqCst);

    // Give it a brief moment before returning status
    tokio::time::sleep(Duration::from_millis(800)).await;

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
