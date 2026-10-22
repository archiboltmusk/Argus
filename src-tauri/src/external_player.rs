use std::process::Command;

fn is_playable_url(url: &str) -> bool {
    let u = url.trim();
    (u.starts_with("http://") || u.starts_with("https://")) && !u.contains(char::is_whitespace)
}

fn run(mut cmd: Command) -> Result<(), String> {
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}

/// Hands a stream URL to a user-installed player. The URL must be http(s) so it
/// can never be read as a flag by the player's argument parser.
#[tauri::command]
pub fn open_in_external_player(player: String, url: String) -> Result<(), String> {
    if !is_playable_url(&url) {
        return Err("unsupported-url".into());
    }
    let url = url.trim().to_string();
    match player.as_str() {
        "iina" if cfg!(target_os = "macos") => {
            let encoded: String = url
                .bytes()
                .map(|b| match b {
                    b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                        (b as char).to_string()
                    }
                    _ => format!("%{:02X}", b),
                })
                .collect();
            let mut c = Command::new("open");
            c.arg(format!("iina://open?url={encoded}"));
            run(c)
        }
        "vlc" if cfg!(target_os = "macos") => {
            let mut c = Command::new("open");
            c.args(["-a", "VLC", "--args", &url]);
            run(c)
        }
        "vlc" => run({
            let mut c = Command::new("vlc");
            c.arg(&url);
            c
        }),
        "mpv" => run({
            let mut c = Command::new("mpv");
            c.arg(&url);
            c
        }),
        _ => Err("unknown-player".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_plain_http_urls_pass() {
        assert!(is_playable_url("https://host/a.mkv"));
        assert!(!is_playable_url("--script=evil"));
        assert!(!is_playable_url("file:///etc/passwd"));
        assert!(!is_playable_url("https://a b"));
    }
}
