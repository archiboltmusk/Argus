fn main() {
    // libmpv from Homebrew; the release job bundles it into the .app with
    // dylibbundler so end users need nothing installed.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        for dir in ["/opt/homebrew/lib", "/usr/local/lib"] {
            if std::path::Path::new(dir).exists() {
                println!("cargo:rustc-link-search=native={dir}");
            }
        }
    }
    tauri_build::build()
}
