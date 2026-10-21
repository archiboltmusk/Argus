//! Safe wrapper over libmpv. mpv's client API is thread-safe, so one handle
//! is shared between the command side (Tauri commands) and the event thread.

mod ffi;

use std::ffi::{c_char, c_void, CStr, CString};

pub struct Mpv {
    ctx: *mut ffi::mpv_handle,
}

// SAFETY: libmpv documents every client API function as thread-safe.
unsafe impl Send for Mpv {}
unsafe impl Sync for Mpv {}

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    None,
    Flag(bool),
    Int(i64),
    Double(f64),
    Str(String),
}

#[derive(Debug, Clone, PartialEq)]
pub enum Event {
    None,
    Shutdown,
    StartFile,
    FileLoaded,
    /// `eof` true when the file played to the end (not stopped / replaced).
    EndFile {
        eof: bool,
        error: Option<String>,
    },
    PlaybackRestart,
    Seek,
    Property {
        name: String,
        value: Value,
    },
    Other,
}

fn cstr(s: &str) -> CString {
    CString::new(s.replace('\0', "")).expect("no interior NULs after replace")
}

fn check(code: i32) -> Result<(), String> {
    if code >= 0 {
        Ok(())
    } else {
        // SAFETY: mpv_error_string returns a static string for any code.
        Err(unsafe { CStr::from_ptr(ffi::mpv_error_string(code)) }
            .to_string_lossy()
            .into_owned())
    }
}

impl Mpv {
    /// Creates and initializes a player. `options` are applied before init
    /// (e.g. `wid`, `vo`, `hwdec`), which is required for most of them.
    pub fn new(options: &[(&str, &str)]) -> Result<Self, String> {
        // SAFETY: plain constructor; NULL means out of memory.
        let ctx = unsafe { ffi::mpv_create() };
        if ctx.is_null() {
            return Err("could not create mpv instance".into());
        }
        let mpv = Self { ctx };
        for (k, v) in options {
            let (k, v) = (cstr(k), cstr(v));
            // SAFETY: ctx is valid, strings are NUL-terminated and outlive the call.
            check(unsafe { ffi::mpv_set_option_string(ctx, k.as_ptr(), v.as_ptr()) })
                .map_err(|e| format!("option {k:?}: {e}"))?;
        }
        // SAFETY: ctx is valid and not yet initialized.
        check(unsafe { ffi::mpv_initialize(ctx) })?;
        Ok(mpv)
    }

    pub fn command(&self, args: &[&str]) -> Result<(), String> {
        let owned: Vec<CString> = args.iter().map(|a| cstr(a)).collect();
        let mut ptrs: Vec<*const c_char> = owned.iter().map(|c| c.as_ptr()).collect();
        ptrs.push(std::ptr::null());
        // SAFETY: NULL-terminated array of valid C strings, alive for the call.
        check(unsafe { ffi::mpv_command(self.ctx, ptrs.as_mut_ptr()) })
    }

    /// Non-blocking variant for slow commands like `loadfile` over network.
    pub fn command_async(&self, args: &[&str]) -> Result<(), String> {
        let owned: Vec<CString> = args.iter().map(|a| cstr(a)).collect();
        let mut ptrs: Vec<*const c_char> = owned.iter().map(|c| c.as_ptr()).collect();
        ptrs.push(std::ptr::null());
        // SAFETY: as above; mpv copies the arguments before returning.
        check(unsafe { ffi::mpv_command_async(self.ctx, 0, ptrs.as_mut_ptr()) })
    }

    pub fn set(&self, name: &str, value: &str) -> Result<(), String> {
        let (n, v) = (cstr(name), cstr(value));
        // SAFETY: valid handle and C strings.
        check(unsafe { ffi::mpv_set_property_string(self.ctx, n.as_ptr(), v.as_ptr()) })
            .map_err(|e| format!("{name}: {e}"))
    }

    /// Node properties (like `track-list`) come back as JSON.
    pub fn get_string(&self, name: &str) -> Option<String> {
        let n = cstr(name);
        // SAFETY: valid handle; result is owned by us and freed with mpv_free.
        unsafe {
            let p = ffi::mpv_get_property_string(self.ctx, n.as_ptr());
            if p.is_null() {
                return None;
            }
            let s = CStr::from_ptr(p).to_string_lossy().into_owned();
            ffi::mpv_free(p as *mut c_void);
            Some(s)
        }
    }

    pub fn observe_double(&self, name: &str) {
        self.observe(name, ffi::MPV_FORMAT_DOUBLE)
    }

    pub fn observe_flag(&self, name: &str) {
        self.observe(name, ffi::MPV_FORMAT_FLAG)
    }

    pub fn observe_int(&self, name: &str) {
        self.observe(name, ffi::MPV_FORMAT_INT64)
    }

    fn observe(&self, name: &str, format: ffi::mpv_format) {
        let n = cstr(name);
        // SAFETY: valid handle and C string. Errors only for unknown formats.
        unsafe { ffi::mpv_observe_property(self.ctx, 0, n.as_ptr(), format) };
    }

    /// Blocks up to `timeout` seconds (negative = forever).
    pub fn wait_event(&self, timeout: f64) -> Event {
        // SAFETY: the returned event stays valid until the next wait_event
        // call on this handle; we copy everything out before returning.
        unsafe {
            let ev = &*ffi::mpv_wait_event(self.ctx, timeout);
            match ev.event_id {
                ffi::MPV_EVENT_NONE => Event::None,
                ffi::MPV_EVENT_SHUTDOWN => Event::Shutdown,
                ffi::MPV_EVENT_START_FILE => Event::StartFile,
                ffi::MPV_EVENT_FILE_LOADED => Event::FileLoaded,
                ffi::MPV_EVENT_PLAYBACK_RESTART => Event::PlaybackRestart,
                ffi::MPV_EVENT_SEEK => Event::Seek,
                ffi::MPV_EVENT_END_FILE => {
                    let ef = &*(ev.data as *const ffi::mpv_event_end_file);
                    let error = (ef.reason == ffi::MPV_END_FILE_REASON_ERROR).then(|| {
                        CStr::from_ptr(ffi::mpv_error_string(ef.error))
                            .to_string_lossy()
                            .into_owned()
                    });
                    Event::EndFile {
                        eof: ef.reason == ffi::MPV_END_FILE_REASON_EOF,
                        error,
                    }
                }
                ffi::MPV_EVENT_PROPERTY_CHANGE => {
                    let p = &*(ev.data as *const ffi::mpv_event_property);
                    let name = CStr::from_ptr(p.name).to_string_lossy().into_owned();
                    let value = match p.format {
                        ffi::MPV_FORMAT_DOUBLE => Value::Double(*(p.data as *const f64)),
                        ffi::MPV_FORMAT_FLAG => Value::Flag(*(p.data as *const i32) != 0),
                        ffi::MPV_FORMAT_INT64 => Value::Int(*(p.data as *const i64)),
                        ffi::MPV_FORMAT_STRING => Value::Str(
                            CStr::from_ptr(*(p.data as *const *const c_char))
                                .to_string_lossy()
                                .into_owned(),
                        ),
                        _ => Value::None,
                    };
                    Event::Property { name, value }
                }
                _ => Event::Other,
            }
        }
    }
}

impl Drop for Mpv {
    fn drop(&mut self) {
        // SAFETY: last owner; no other thread may use ctx after this.
        unsafe { ffi::mpv_terminate_destroy(self.ctx) }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Plays a generated 2 s clip headless and checks the event flow,
    /// property observation and JSON track-list access.
    #[test]
    fn plays_generated_clip() {
        let mpv = Mpv::new(&[
            ("vo", "null"),
            ("ao", "null"),
            ("idle", "yes"),
            ("terminal", "no"),
        ])
        .unwrap();
        mpv.observe_double("duration");
        mpv.command(&[
            "loadfile",
            "av://lavfi:testsrc=duration=2:size=320x240:rate=10",
        ])
        .unwrap();
        let (mut loaded, mut duration, mut eof) = (false, None, false);
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(20);
        while std::time::Instant::now() < deadline && !eof {
            match mpv.wait_event(1.0) {
                Event::FileLoaded => {
                    loaded = true;
                    let tracks = mpv.get_string("track-list").unwrap();
                    let parsed: serde_json::Value =
                        serde_json::from_str(&tracks).expect("track-list is JSON");
                    assert_eq!(parsed[0]["type"], "video");
                }
                Event::Property {
                    name,
                    value: Value::Double(d),
                } if name == "duration" => duration = Some(d),
                Event::EndFile { eof: true, .. } => eof = true,
                _ => {}
            }
        }
        assert!(loaded && eof);
        assert!((duration.unwrap() - 2.0).abs() < 0.2);
        assert!(mpv.set("pause", "yes").is_ok());
        assert!(mpv.set("no-such-property", "1").is_err());
    }
}
