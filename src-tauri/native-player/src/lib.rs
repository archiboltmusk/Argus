use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    Manager, Runtime, State,
};

struct NativePlayer<R: Runtime>(PluginHandle<R>);

#[tauri::command]
async fn request<R: Runtime>(
    _app: tauri::AppHandle<R>,
    state: State<'_, NativePlayer<R>>,
    method: String,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    if !matches!(method.as_str(), "load" | "control" | "snapshot" | "close") {
        return Err("Unsupported native player operation".into());
    }
    state
        .0
        .run_mobile_plugin(&method, payload)
        .map_err(|e| e.to_string())
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("native-player")
        .invoke_handler(tauri::generate_handler![request])
        .setup(|app, api| {
            let handle = api.register_android_plugin("app.argus.player", "NativePlayerPlugin")?;
            app.manage(NativePlayer(handle));
            Ok(())
        })
        .build()
}
