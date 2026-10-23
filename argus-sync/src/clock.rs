use serde::{Deserialize, Serialize};

/// Total order over all writes: wall time, then logical counter, then device id.
/// Field order matters, the derived `Ord` compares top to bottom.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct Stamp {
    pub wall_ms: u64,
    pub counter: u32,
    pub device: String,
}

/// Hybrid logical clock for one device.
#[derive(Debug, Clone)]
pub struct Hlc {
    device: String,
    wall_ms: u64,
    counter: u32,
}

impl Hlc {
    pub fn new(device: impl Into<String>) -> Self {
        Self {
            device: device.into(),
            wall_ms: 0,
            counter: 0,
        }
    }

    /// Stamp a local write. Never goes backwards even if `now_ms` does.
    pub fn tick(&mut self, now_ms: u64) -> Stamp {
        if now_ms > self.wall_ms {
            self.wall_ms = now_ms;
            self.counter = 0;
        } else {
            self.counter = self.counter.saturating_add(1);
        }
        self.stamp()
    }

    /// Fold in a stamp seen from another device so later local writes sort after it.
    pub fn observe(&mut self, remote: &Stamp, now_ms: u64) {
        let top = now_ms.max(self.wall_ms).max(remote.wall_ms);
        let counter = match (top == self.wall_ms, top == remote.wall_ms) {
            (true, true) => self.counter.max(remote.counter),
            (true, false) => self.counter,
            (false, true) => remote.counter,
            (false, false) => 0,
        };
        // The next tick bumps the counter, so store the observed one as is.
        self.wall_ms = top;
        self.counter = counter;
    }

    fn stamp(&self) -> Stamp {
        Stamp {
            wall_ms: self.wall_ms,
            counter: self.counter,
            device: self.device.clone(),
        }
    }
}
