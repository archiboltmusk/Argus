fn main() {
    tauri_plugin::Builder::new(&["request"])
        .android_path("android")
        .build();
}
