//! Minimal hand-written libmpv client API bindings (mpv/client.h, API 2.x).
//! Only what Argus uses; layouts mirror the C structs exactly.

#![allow(non_camel_case_types, dead_code)]

use std::ffi::{c_char, c_int, c_void};

#[repr(C)]
pub struct mpv_handle {
    _private: [u8; 0],
}

pub type mpv_format = c_int;
pub const MPV_FORMAT_NONE: mpv_format = 0;
pub const MPV_FORMAT_STRING: mpv_format = 1;
pub const MPV_FORMAT_FLAG: mpv_format = 3;
pub const MPV_FORMAT_INT64: mpv_format = 4;
pub const MPV_FORMAT_DOUBLE: mpv_format = 5;

pub type mpv_event_id = c_int;
pub const MPV_EVENT_NONE: mpv_event_id = 0;
pub const MPV_EVENT_SHUTDOWN: mpv_event_id = 1;
pub const MPV_EVENT_START_FILE: mpv_event_id = 6;
pub const MPV_EVENT_END_FILE: mpv_event_id = 7;
pub const MPV_EVENT_FILE_LOADED: mpv_event_id = 8;
pub const MPV_EVENT_SEEK: mpv_event_id = 20;
pub const MPV_EVENT_PLAYBACK_RESTART: mpv_event_id = 21;
pub const MPV_EVENT_PROPERTY_CHANGE: mpv_event_id = 22;

pub const MPV_END_FILE_REASON_EOF: c_int = 0;
pub const MPV_END_FILE_REASON_ERROR: c_int = 4;

#[repr(C)]
pub struct mpv_event {
    pub event_id: mpv_event_id,
    pub error: c_int,
    pub reply_userdata: u64,
    pub data: *mut c_void,
}

#[repr(C)]
pub struct mpv_event_property {
    pub name: *const c_char,
    pub format: mpv_format,
    pub data: *mut c_void,
}

#[repr(C)]
pub struct mpv_event_end_file {
    pub reason: c_int,
    pub error: c_int,
    pub playlist_entry_id: i64,
    pub playlist_insert_id: i64,
    pub playlist_insert_num_entries: c_int,
}

#[link(name = "mpv")]
extern "C" {
    pub fn mpv_create() -> *mut mpv_handle;
    pub fn mpv_initialize(ctx: *mut mpv_handle) -> c_int;
    pub fn mpv_terminate_destroy(ctx: *mut mpv_handle);
    pub fn mpv_error_string(error: c_int) -> *const c_char;
    pub fn mpv_free(data: *mut c_void);
    pub fn mpv_set_option_string(
        ctx: *mut mpv_handle,
        name: *const c_char,
        data: *const c_char,
    ) -> c_int;
    pub fn mpv_set_property_string(
        ctx: *mut mpv_handle,
        name: *const c_char,
        data: *const c_char,
    ) -> c_int;
    pub fn mpv_get_property_string(ctx: *mut mpv_handle, name: *const c_char) -> *mut c_char;
    pub fn mpv_command(ctx: *mut mpv_handle, args: *mut *const c_char) -> c_int;
    pub fn mpv_command_async(
        ctx: *mut mpv_handle,
        reply_userdata: u64,
        args: *mut *const c_char,
    ) -> c_int;
    pub fn mpv_observe_property(
        ctx: *mut mpv_handle,
        reply_userdata: u64,
        name: *const c_char,
        format: mpv_format,
    ) -> c_int;
    pub fn mpv_wait_event(ctx: *mut mpv_handle, timeout: f64) -> *mut mpv_event;
}
