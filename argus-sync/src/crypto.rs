use chacha20poly1305::aead::{Aead, KeyInit, Payload};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};

use crate::map::Op;

pub const KEY_LEN: usize = 32;
pub const NONCE_LEN: usize = 24;

#[derive(Debug, PartialEq, Eq)]
pub enum CryptoError {
    /// Wrong key, tampered or truncated data, or wrong context.
    Open,
    Encode,
}

/// Encrypt a batch of ops for transport. Output is `nonce || ciphertext`.
/// `context` (for example a profile id) is authenticated but not stored, so a
/// blob sealed for one profile cannot be replayed into another.
/// The caller must supply a fresh random nonce per call; the crate never
/// reads randomness so it stays deterministic and wasm-safe.
pub fn seal(
    key: &[u8; KEY_LEN],
    nonce: &[u8; NONCE_LEN],
    context: &[u8],
    ops: &[Op],
) -> Result<Vec<u8>, CryptoError> {
    let plain = serde_json::to_vec(ops).map_err(|_| CryptoError::Encode)?;
    let cipher = XChaCha20Poly1305::new(key.into());
    let ct = cipher
        .encrypt(
            XNonce::from_slice(nonce),
            Payload {
                msg: &plain,
                aad: context,
            },
        )
        .map_err(|_| CryptoError::Encode)?;
    let mut out = Vec::with_capacity(NONCE_LEN + ct.len());
    out.extend_from_slice(nonce);
    out.extend_from_slice(&ct);
    Ok(out)
}

pub fn open(key: &[u8; KEY_LEN], context: &[u8], blob: &[u8]) -> Result<Vec<Op>, CryptoError> {
    if blob.len() < NONCE_LEN {
        return Err(CryptoError::Open);
    }
    let (nonce, ct) = blob.split_at(NONCE_LEN);
    let cipher = XChaCha20Poly1305::new(key.into());
    let plain = cipher
        .decrypt(
            XNonce::from_slice(nonce),
            Payload {
                msg: ct,
                aad: context,
            },
        )
        .map_err(|_| CryptoError::Open)?;
    serde_json::from_slice(&plain).map_err(|_| CryptoError::Open)
}
