use base64::Engine;
use ring::signature::{UnparsedPublicKey, ED25519};

/// Verifies an Ed25519 signature a plugin author made over the plugin's manifest line. Argus holds
/// no signing key of its own: whether a key is trusted is the user's call, kept on the TS side.
fn verify(public_key_b64: &str, signature_b64: &str, message: &str) -> bool {
    let engine = base64::engine::general_purpose::STANDARD;
    let (Ok(key), Ok(signature)) = (engine.decode(public_key_b64), engine.decode(signature_b64))
    else {
        return false;
    };
    UnparsedPublicKey::new(&ED25519, key)
        .verify(message.as_bytes(), &signature)
        .is_ok()
}

#[tauri::command]
pub fn plugin_verify_signature(
    public_key: String,
    signature: String,
    message: String,
) -> bool {
    verify(&public_key, &signature, &message)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ring::rand::SystemRandom;
    use ring::signature::{Ed25519KeyPair, KeyPair};

    fn sign(message: &str) -> (String, String) {
        let engine = base64::engine::general_purpose::STANDARD;
        let pkcs8 = Ed25519KeyPair::generate_pkcs8(&SystemRandom::new()).unwrap();
        let pair = Ed25519KeyPair::from_pkcs8(pkcs8.as_ref()).unwrap();
        (
            engine.encode(pair.public_key().as_ref()),
            engine.encode(pair.sign(message.as_bytes()).as_ref()),
        )
    }

    #[test]
    fn accepts_a_valid_signature() {
        let (key, sig) = sign("argus.plugin/1\nid\n1.0.0\nabc");
        assert!(verify(&key, &sig, "argus.plugin/1\nid\n1.0.0\nabc"));
    }

    #[test]
    fn rejects_tampered_message_and_garbage() {
        let (key, sig) = sign("argus.plugin/1\nid\n1.0.0\nabc");
        assert!(!verify(&key, &sig, "argus.plugin/1\nid\n1.0.1\nabc"));
        assert!(!verify("not base64!", &sig, "m"));
        assert!(!verify(&key, "AAAA", "m"));
    }
}
