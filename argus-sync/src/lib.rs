//! Transport-agnostic library state that converges across devices.
//!
//! Watch progress, watched flags and similar per-item values are
//! last-writer-wins registers keyed by an opaque string. Ordering uses a
//! hybrid logical clock, so devices with skewed wall clocks still agree on a
//! winner. Merging is commutative, associative and idempotent, so ops can
//! arrive in any order, any number of times, over any transport.
//!
//! No network, no randomness, no clock reads: the caller passes wall time and
//! nonces in, which keeps the crate deterministic, testable and wasm-safe.

mod clock;
mod crypto;
mod map;

pub use clock::{Hlc, Stamp};
pub use crypto::{open, seal, CryptoError, KEY_LEN, NONCE_LEN};
pub use map::{LwwMap, Op};
