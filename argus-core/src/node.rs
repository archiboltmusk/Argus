//! Source-agnostic view of one catalog item, built from the models Argus already has
//! (`Meta`, `Stream`, recipes, OPDS entries, OAI records). It never replaces them: mappers
//! produce a `Node`, `merge` folds nodes that are provably the same item into one card.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeKind {
    Video,
    Series,
    Course,
    Document,
    Audio,
}

/// Where a source sits before per-source scoring. Declaration order is the default ranking.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Tier {
    Local,
    Debrid,
    Http,
    P2p,
}

pub const DEFAULT_TIER_ORDER: [Tier; 4] = [Tier::Local, Tier::Debrid, Tier::Http, Tier::P2p];

/// `ns` is lowercase (`imdb`, `tmdb`, `isbn`, `doi`, `ia`, `oai`, ...). Namespaces whose ids are
/// only unique within a kind must encode it in `ns` (for example `tmdb:movie`).
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub struct ExternalId {
    pub ns: String,
    pub value: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Origin {
    pub feed_id: String,
    pub item_id: String,
}

impl Origin {
    pub fn key(&self) -> String {
        format!("{}/{}", self.feed_id, self.item_id)
    }
}

/// Deliberately has no headers or credentials: those stay in the secret store, scoped to the
/// feed origin, so a node can be logged or indexed safely.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRef {
    pub tier: Tier,
    /// The feed's own ordering (recipe `priority`, addon return order); lower is better.
    pub priority: u32,
    pub feed_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub uri: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub kind: NodeKind,
    pub title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub year: Option<u16>,
    /// BCP 47 primary subtag, lowercase (`en`, `hi`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(default)]
    pub creators: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(default)]
    pub ids: Vec<ExternalId>,
    pub origins: Vec<Origin>,
    #[serde(default)]
    pub sources: Vec<SourceRef>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub breadcrumbs: Vec<String>,
    /// Open fields from the originating model, kept so nothing an addon sent is lost.
    #[serde(default, flatten)]
    pub extra: BTreeMap<String, serde_json::Value>,
}
