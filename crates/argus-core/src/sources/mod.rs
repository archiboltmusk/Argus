//! Content sources. Each module maps one ecosystem into [`crate::model`].
//!
//! Argus ships with no content of its own: users add addons, debrid keys,
//! media servers or playlists they already have rights to.

pub mod addon;
pub mod debrid;
pub mod iptv;
pub mod jellyfin;
pub mod local;
