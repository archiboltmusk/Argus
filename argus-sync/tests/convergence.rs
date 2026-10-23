use argus_sync::{open, seal, CryptoError, Hlc, LwwMap, Op};
use serde_json::json;

fn replay(ops: &[Op]) -> LwwMap {
    let mut m = LwwMap::new();
    for op in ops {
        m.apply(op);
    }
    m
}

#[test]
fn later_write_wins_regardless_of_arrival_order() {
    let (mut a, mut b) = (Hlc::new("mac"), Hlc::new("phone"));
    let (mut ma, mut mb) = (LwwMap::new(), LwwMap::new());
    let o1 = ma.set(&mut a, 1000, "tt1:progress", json!(100));
    let o2 = mb.set(&mut b, 2000, "tt1:progress", json!(250));
    assert_eq!(replay(&[o1.clone(), o2.clone()]), replay(&[o2, o1]));
    assert_eq!(replay(&[]).get("tt1:progress"), None);
}

#[test]
fn clock_skew_does_not_beat_causality() {
    // Phone clock is far ahead, writes first. Mac observes it, then writes later in real time.
    let (mut mac, mut phone) = (Hlc::new("mac"), Hlc::new("phone"));
    let (mut mm, mut pm) = (LwwMap::new(), LwwMap::new());
    let early = pm.set(&mut phone, 9_000_000, "k", json!("phone"));
    mm.apply_remote(&mut mac, 1000, &early);
    let later = mm.set(&mut mac, 1001, "k", json!("mac"));
    pm.apply(&later);
    assert_eq!(mm.get("k"), Some(&json!("mac")));
    assert_eq!(pm.get("k"), Some(&json!("mac")));
}

#[test]
fn equal_wall_time_breaks_tie_by_device_deterministically() {
    let (mut a, mut b) = (Hlc::new("a"), Hlc::new("b"));
    let (mut ma, mut mb) = (LwwMap::new(), LwwMap::new());
    let oa = ma.set(&mut a, 5, "k", json!(1));
    let ob = mb.set(&mut b, 5, "k", json!(2));
    ma.apply(&ob);
    mb.apply(&oa);
    assert_eq!(ma, mb);
    assert_eq!(ma.get("k"), Some(&json!(2)));
}

#[test]
fn apply_is_idempotent_and_reports_change() {
    let mut c = Hlc::new("a");
    let mut m = LwwMap::new();
    let op = m.set(&mut c, 1, "k", json!(1));
    assert!(!m.apply(&op));
    let mut other = LwwMap::new();
    assert!(other.apply(&op));
    assert!(!other.apply(&op));
}

#[test]
fn delete_converges_and_is_not_resurrected_by_stale_write() {
    let (mut a, mut b) = (Hlc::new("a"), Hlc::new("b"));
    let (mut ma, mut mb) = (LwwMap::new(), LwwMap::new());
    let set = ma.set(&mut a, 1, "k", json!(1));
    mb.apply_remote(&mut b, 2, &set);
    let del = mb.remove(&mut b, 3, "k");
    ma.apply(&del);
    ma.apply(&set);
    assert_eq!(ma.get("k"), None);
    assert_eq!(ma, mb);
    assert_eq!(ma.iter().count(), 0);
}

#[test]
fn merge_snapshot_matches_op_replay() {
    let (mut a, mut b) = (Hlc::new("a"), Hlc::new("b"));
    let (mut ma, mut mb) = (LwwMap::new(), LwwMap::new());
    ma.set(&mut a, 1, "x", json!(1));
    ma.set(&mut a, 3, "y", json!(1));
    mb.set(&mut b, 2, "x", json!(2));
    mb.remove(&mut b, 4, "y");
    let mut left = ma.clone();
    left.merge(&mb);
    let mut right = mb.clone();
    right.merge(&ma);
    assert_eq!(left, right);
    assert_eq!(replay(&left.snapshot()), left);
}

#[test]
fn local_clock_never_goes_backwards() {
    let mut c = Hlc::new("a");
    let s1 = c.tick(100);
    let s2 = c.tick(50);
    let s3 = c.tick(50);
    assert!(s1 < s2 && s2 < s3);
}

#[test]
fn seal_roundtrip_and_rejections() {
    let mut c = Hlc::new("a");
    let mut m = LwwMap::new();
    let ops = vec![m.set(&mut c, 1, "k", json!({"pos": 12.5}))];
    let key = [7u8; 32];
    let nonce = [9u8; 24];
    let blob = seal(&key, &nonce, b"profile-1", &ops).unwrap();
    assert!(!blob.windows(3).any(|w| w == b"pos"));
    assert_eq!(open(&key, b"profile-1", &blob).unwrap(), ops);
    assert_eq!(
        open(&[8u8; 32], b"profile-1", &blob),
        Err(CryptoError::Open)
    );
    assert_eq!(open(&key, b"profile-2", &blob), Err(CryptoError::Open));
    let mut bad = blob.clone();
    *bad.last_mut().unwrap() ^= 1;
    assert_eq!(open(&key, b"profile-1", &bad), Err(CryptoError::Open));
    assert_eq!(
        open(&key, b"profile-1", &blob[..10]),
        Err(CryptoError::Open)
    );
}
