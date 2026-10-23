use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use crate::clock::{Hlc, Stamp};

/// One write. `value: None` is a tombstone, so deletes also converge.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Op {
    pub key: String,
    pub value: Option<serde_json::Value>,
    pub stamp: Stamp,
}

/// Map of keys to last-writer-wins registers.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct LwwMap {
    entries: BTreeMap<String, (Option<serde_json::Value>, Stamp)>,
}

impl LwwMap {
    pub fn new() -> Self {
        Self::default()
    }

    /// Write locally and return the op to ship to other devices.
    pub fn set(&mut self, clock: &mut Hlc, now_ms: u64, key: &str, value: serde_json::Value) -> Op {
        self.local(clock, now_ms, key, Some(value))
    }

    pub fn remove(&mut self, clock: &mut Hlc, now_ms: u64, key: &str) -> Op {
        self.local(clock, now_ms, key, None)
    }

    fn local(
        &mut self,
        clock: &mut Hlc,
        now_ms: u64,
        key: &str,
        value: Option<serde_json::Value>,
    ) -> Op {
        let op = Op {
            key: key.to_owned(),
            value,
            stamp: clock.tick(now_ms),
        };
        self.apply(&op);
        op
    }

    /// Apply a remote or local op. Returns true if it changed the state.
    pub fn apply(&mut self, op: &Op) -> bool {
        match self.entries.get(&op.key) {
            Some((_, have)) if *have >= op.stamp => false,
            _ => {
                self.entries
                    .insert(op.key.clone(), (op.value.clone(), op.stamp.clone()));
                true
            }
        }
    }

    /// Apply a remote op and advance `clock` past it.
    pub fn apply_remote(&mut self, clock: &mut Hlc, now_ms: u64, op: &Op) -> bool {
        clock.observe(&op.stamp, now_ms);
        self.apply(op)
    }

    pub fn merge(&mut self, other: &LwwMap) {
        for (key, (value, stamp)) in &other.entries {
            self.apply(&Op {
                key: key.clone(),
                value: value.clone(),
                stamp: stamp.clone(),
            });
        }
    }

    pub fn get(&self, key: &str) -> Option<&serde_json::Value> {
        self.entries.get(key).and_then(|(v, _)| v.as_ref())
    }

    /// Live entries, tombstones skipped.
    pub fn iter(&self) -> impl Iterator<Item = (&str, &serde_json::Value)> {
        self.entries
            .iter()
            .filter_map(|(k, (v, _))| v.as_ref().map(|v| (k.as_str(), v)))
    }

    /// Every register including tombstones, as ops. Send this to a new device.
    pub fn snapshot(&self) -> Vec<Op> {
        self.entries
            .iter()
            .map(|(k, (v, s))| Op {
                key: k.clone(),
                value: v.clone(),
                stamp: s.clone(),
            })
            .collect()
    }
}
