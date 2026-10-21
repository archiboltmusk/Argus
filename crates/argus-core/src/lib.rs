//! Argus core: everything that is not UI or platform glue.
//!
//! Every frontend (desktop, mobile, TV, web) talks to this crate, so behaviour
//! stays identical across devices and bugs get fixed once.

pub mod downloads;
pub mod episodes;
pub mod error;
pub mod fallback;
pub mod library;
pub mod model;
pub mod player;
pub mod ranking;
pub mod sources;
pub mod torrent;
pub mod trust;

pub use error::{Error, Result};
// Re-exported so every shell uses the exact same versions as the core.
pub use {futures, reqwest};

/// User agent sent to every remote service.
pub const USER_AGENT: &str = concat!("Argus/", env!("CARGO_PKG_VERSION"));

/// Shared HTTP client with sane timeouts. Reuse it; building clients is slow.
pub fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .connect_timeout(std::time::Duration::from_secs(5))
        .timeout(std::time::Duration::from_secs(15))
        .pool_idle_timeout(std::time::Duration::from_secs(90))
        .build()
        .expect("static client config is valid")
}
