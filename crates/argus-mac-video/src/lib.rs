//! Creates the native view libmpv draws into, placed *behind* the
//! transparent WKWebView so the React UI (controls, subtitles menu) overlays
//! the video. mpv renders natively (no WebView compositing), which is what
//! keeps HDR and colors correct on macOS.
//!
//! Kept in its own tiny crate so it can be type-checked for macOS from any
//! host: `cargo check -p argus-mac-video --target aarch64-apple-darwin`.

#[cfg(target_os = "macos")]
mod imp {
    use std::ffi::c_void;

    use objc2::rc::Retained;
    use objc2::{MainThreadMarker, MainThreadOnly};
    use objc2_app_kit::{NSAutoresizingMaskOptions, NSView, NSWindowOrderingMode};

    /// Adds a full-size, layer-backed video view as the bottom-most subview of
    /// `content_view` (the window's content NSView) and returns it as an
    /// opaque pointer suitable for mpv's `wid` option.
    ///
    /// # Safety
    /// `content_view` must be a valid `NSView*`. Must run on the main thread.
    pub unsafe fn attach_video_view(content_view: *mut c_void) -> Option<*mut c_void> {
        let mtm = MainThreadMarker::new()?;
        let parent: &NSView = unsafe { (content_view as *const NSView).as_ref()? };
        let view = NSView::initWithFrame(NSView::alloc(mtm), parent.bounds());
        view.setAutoresizingMask(
            NSAutoresizingMaskOptions::ViewWidthSizable
                | NSAutoresizingMaskOptions::ViewHeightSizable,
        );
        view.setWantsLayer(true);
        view.setHidden(true);
        parent.addSubview_positioned_relativeTo(&view, NSWindowOrderingMode::Below, None);
        // Owned by the view hierarchy from here; leak our +1 so the pointer
        // stays valid for the window's lifetime.
        Some(Retained::into_raw(view) as *mut c_void)
    }

    /// Shows the video view while playing, hides it otherwise.
    ///
    /// # Safety
    /// `view` must come from [`attach_video_view`]. Main thread only.
    pub unsafe fn set_video_visible(view: *mut c_void, visible: bool) {
        if let Some(v) = unsafe { (view as *const NSView).as_ref() } {
            v.setHidden(!visible);
        }
    }
}

#[cfg(target_os = "macos")]
pub use imp::*;
