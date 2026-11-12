//! Native Android entry point. Loading torrents never creates a WebView.
use jni::{
    objects::{JClass, JString},
    sys::jstring,
    JNIEnv,
};
use serde_json::{json, Value};
use std::sync::OnceLock;

fn runtime() -> &'static tokio::runtime::Runtime {
    static RUNTIME: OnceLock<tokio::runtime::Runtime> = OnceLock::new();
    RUNTIME.get_or_init(|| {
        tokio::runtime::Builder::new_multi_thread()
            .worker_threads(2)
            .enable_all()
            .build()
            .expect("projector runtime")
    })
}

#[no_mangle]
pub extern "system" fn Java_app_argus_player_NativeTorrentBridge_request(
    mut env: JNIEnv,
    _class: JClass,
    directory: JString,
    payload: JString,
) -> jstring {
    let result =
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| -> Result<Value, String> {
            let directory: String = env
                .get_string(&directory)
                .map_err(|_| "Invalid directory")?
                .into();
            let payload: String = env
                .get_string(&payload)
                .map_err(|_| "Invalid request")?
                .into();
            if payload.len() > 32768 {
                return Err("Request too large".into());
            }
            let request: Value = serde_json::from_str(&payload).map_err(|_| "Invalid request")?;
            runtime().block_on(crate::torrent_engine::projector_request(
                std::path::Path::new(&directory),
                request,
            ))
        }))
        .unwrap_or_else(|_| Err("Torrent engine failed safely. Try another source.".into()));
    let value = match result {
        Ok(value) => value,
        Err(error) => json!({"error": error}),
    };
    env.new_string(value.to_string())
        .map(|s| s.into_raw())
        .unwrap_or(std::ptr::null_mut())
}
