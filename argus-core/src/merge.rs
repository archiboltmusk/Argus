//! Conservative, derived-at-read-time merging of `Node`s.
//!
//! A false merge hides a different work (remake, other-language edition, other translation) and
//! the user cannot notice it, while a missed merge costs one extra card. So nodes merge
//! automatically only on a shared strong id; title matches are returned as suggestions.
//! Inputs are never mutated, and `never_merge` pairs make any merge undoable.

use crate::node::{ExternalId, Node, SourceRef, Tier, DEFAULT_TIER_ORDER};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use unicode_normalization::{char::is_combining_mark, UnicodeNormalization};

/// Namespaces that identify a work. Everything else (feed-local ids) never merges anything.
const STRONG_NS: [&str; 5] = ["imdb", "tmdb", "isbn", "doi", "ia"];

fn is_strong(id: &ExternalId) -> bool {
    STRONG_NS
        .iter()
        .any(|ns| id.ns == *ns || id.ns.strip_prefix(ns).is_some_and(|r| r.starts_with(':')))
}

/// Origin keys (`feed_id/item_id`) the user split apart; never merged again.
pub type NeverMerge = [(String, String)];

#[derive(Debug, Clone)]
pub struct Card {
    pub node: Node,
    /// Indices into the input slice, ascending.
    pub members: Vec<usize>,
    /// Shared strong ids that caused the merge, for display ("same IMDb id").
    pub reason: Vec<ExternalId>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Suggestion {
    pub a: usize,
    pub b: usize,
}

#[derive(Debug, Clone)]
pub struct MergeResult {
    pub cards: Vec<Card>,
    /// Pairs of card indices that look like the same item but share no strong id.
    pub suggestions: Vec<Suggestion>,
}

pub fn normalize_title(raw: &str) -> String {
    let folded: String = raw
        .nfkd()
        .filter(|c| !is_combining_mark(*c))
        .flat_map(char::to_lowercase)
        .map(|c| if c.is_alphanumeric() { c } else { ' ' })
        .collect();
    let mut words: Vec<&str> = folded.split_whitespace().collect();
    if words.len() > 1 && matches!(words[0], "the" | "a" | "an") {
        words.remove(0);
    }
    words.join(" ")
}

struct Group {
    members: Vec<usize>,
    ids: BTreeSet<ExternalId>,
    origins: BTreeSet<String>,
}

fn strong_by_ns(ids: &BTreeSet<ExternalId>) -> BTreeMap<&str, BTreeSet<&str>> {
    let mut out: BTreeMap<&str, BTreeSet<&str>> = BTreeMap::new();
    for id in ids.iter().filter(|i| is_strong(i)) {
        out.entry(id.ns.as_str())
            .or_default()
            .insert(id.value.as_str());
    }
    out
}

fn conflicting_ids(a: &Group, b: &Group) -> bool {
    let (sa, sb) = (strong_by_ns(&a.ids), strong_by_ns(&b.ids));
    sa.iter()
        .any(|(ns, va)| sb.get(ns).is_some_and(|vb| va.is_disjoint(vb)))
}

fn blocked(a: &Group, b: &Group, never: &NeverMerge) -> bool {
    never.iter().any(|(x, y)| {
        (a.origins.contains(x) && b.origins.contains(y))
            || (a.origins.contains(y) && b.origins.contains(x))
    })
}

fn find(parent: &mut [usize], mut i: usize) -> usize {
    while parent[i] != i {
        parent[i] = parent[parent[i]];
        i = parent[i];
    }
    i
}

pub fn merge_nodes(nodes: &[Node], never: &NeverMerge) -> MergeResult {
    merge_nodes_with_order(nodes, never, &DEFAULT_TIER_ORDER)
}

pub fn merge_nodes_with_order(nodes: &[Node], never: &NeverMerge, order: &[Tier]) -> MergeResult {
    let mut parent: Vec<usize> = (0..nodes.len()).collect();
    let mut groups: Vec<Option<Group>> = nodes
        .iter()
        .enumerate()
        .map(|(i, n)| {
            Some(Group {
                members: vec![i],
                ids: n.ids.iter().cloned().collect(),
                origins: n.origins.iter().map(|o| o.key()).collect(),
            })
        })
        .collect();

    // Index nodes by strong id so candidate pairs come from buckets, not an all-pairs scan.
    let mut by_id: HashMap<&ExternalId, Vec<usize>> = HashMap::new();
    for (i, n) in nodes.iter().enumerate() {
        for id in n.ids.iter().filter(|id| is_strong(id)) {
            by_id.entry(id).or_default().push(i);
        }
    }
    let mut candidates: Vec<(usize, usize)> = Vec::new();
    for list in by_id.values() {
        for w in list.windows(2) {
            candidates.push((w[0].min(w[1]), w[0].max(w[1])));
        }
    }
    candidates.sort_unstable();
    candidates.dedup();

    for (i, j) in candidates {
        let (ri, rj) = (find(&mut parent, i), find(&mut parent, j));
        if ri == rj {
            continue;
        }
        let (ga, gb) = (groups[ri].as_ref().unwrap(), groups[rj].as_ref().unwrap());
        // Kind and conflicting ids block always. Year and language differences do not block a
        // shared id (sources disagree by a year on release vs premiere), only title matching.
        if nodes[ga.members[0]].kind != nodes[gb.members[0]].kind
            || conflicting_ids(ga, gb)
            || blocked(ga, gb, never)
        {
            continue;
        }
        let (keep, drop) = (ri.min(rj), ri.max(rj));
        let absorbed = groups[drop].take().unwrap();
        let g = groups[keep].as_mut().unwrap();
        g.members.extend(absorbed.members);
        g.members.sort_unstable();
        g.ids.extend(absorbed.ids);
        g.origins.extend(absorbed.origins);
        parent[drop] = keep;
    }

    let cards: Vec<Card> = groups
        .into_iter()
        .flatten()
        .map(|g| build_card(nodes, g, order))
        .collect();
    let suggestions = suggest(&cards, never);
    MergeResult { cards, suggestions }
}

fn build_card(nodes: &[Node], g: Group, order: &[Tier]) -> Card {
    let mut node = nodes[g.members[0]].clone();
    let mut shared: BTreeMap<&ExternalId, usize> = BTreeMap::new();
    for &m in &g.members {
        for id in nodes[m].ids.iter().filter(|i| is_strong(i)) {
            *shared.entry(id).or_default() += 1;
        }
    }
    let reason = if g.members.len() > 1 {
        shared
            .into_iter()
            .filter(|(_, n)| *n > 1)
            .map(|(id, _)| id.clone())
            .collect()
    } else {
        Vec::new()
    };
    for &m in &g.members[1..] {
        let n = &nodes[m];
        node.year = node.year.or(n.year);
        node.language = node.language.take().or_else(|| n.language.clone());
        node.summary = node.summary.take().or_else(|| n.summary.clone());
        node.parent_id = node.parent_id.take().or_else(|| n.parent_id.clone());
        if node.breadcrumbs.is_empty() {
            node.breadcrumbs = n.breadcrumbs.clone();
        }
        for c in &n.creators {
            if !node.creators.contains(c) {
                node.creators.push(c.clone());
            }
        }
        for id in &n.ids {
            if !node.ids.contains(id) {
                node.ids.push(id.clone());
            }
        }
        for o in &n.origins {
            if !node.origins.contains(o) {
                node.origins.push(o.clone());
            }
        }
        node.sources.extend(n.sources.iter().cloned());
        for (k, v) in &n.extra {
            node.extra.entry(k.clone()).or_insert_with(|| v.clone());
        }
    }
    sort_sources(&mut node.sources, order);
    Card {
        node,
        members: g.members,
        reason,
    }
}

/// Tier first (user-orderable), then the feed's own priority. Exact duplicate uris collapse.
fn sort_sources(sources: &mut Vec<SourceRef>, order: &[Tier]) {
    let rank = |t: Tier| order.iter().position(|o| *o == t).unwrap_or(order.len());
    sources.sort_by_key(|s| (rank(s.tier), s.priority));
    let mut seen = BTreeSet::new();
    sources.retain(|s| s.uri.as_ref().is_none_or(|u| seen.insert(u.clone())));
}

fn suggest(cards: &[Card], never: &NeverMerge) -> Vec<Suggestion> {
    let mut buckets: HashMap<(crate::node::NodeKind, String), Vec<usize>> = HashMap::new();
    for (i, c) in cards.iter().enumerate() {
        let t = normalize_title(&c.node.title);
        if !t.is_empty() {
            buckets.entry((c.node.kind, t)).or_default().push(i);
        }
    }
    let creators = |c: &Card| -> BTreeSet<String> {
        c.node
            .creators
            .iter()
            .map(|s| normalize_title(s))
            .filter(|s| !s.is_empty())
            .collect()
    };
    let group = |c: &Card| Group {
        members: c.members.clone(),
        ids: c.node.ids.iter().cloned().collect(),
        origins: c.node.origins.iter().map(|o| o.key()).collect(),
    };
    let mut out = Vec::new();
    for list in buckets.values() {
        for (x, &a) in list.iter().enumerate() {
            for &b in &list[x + 1..] {
                let (ca, cb) = (&cards[a], &cards[b]);
                let (ya, yb) = (ca.node.year, cb.node.year);
                let same_year = matches!((ya, yb), (Some(p), Some(q)) if p == q);
                let lang_ok = match (&ca.node.language, &cb.node.language) {
                    (Some(p), Some(q)) => p == q,
                    _ => true,
                };
                let (ga, gb) = (group(ca), group(cb));
                if same_year
                    && lang_ok
                    && !creators(ca).is_disjoint(&creators(cb))
                    && !conflicting_ids(&ga, &gb)
                    && !blocked(&ga, &gb, never)
                {
                    out.push(Suggestion {
                        a: a.min(b),
                        b: a.max(b),
                    });
                }
            }
        }
    }
    out.sort_by_key(|s| (s.a, s.b));
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::node::{NodeKind, Origin};

    fn id(ns: &str, v: &str) -> ExternalId {
        ExternalId {
            ns: ns.into(),
            value: v.into(),
        }
    }

    fn node(feed: &str, item: &str, title: &str, year: Option<u16>, ids: Vec<ExternalId>) -> Node {
        Node {
            kind: NodeKind::Video,
            title: title.into(),
            year,
            language: None,
            creators: vec![],
            summary: None,
            ids,
            origins: vec![Origin {
                feed_id: feed.into(),
                item_id: item.into(),
            }],
            sources: vec![],
            parent_id: None,
            breadcrumbs: vec![],
            extra: Default::default(),
        }
    }

    fn src(tier: Tier, priority: u32, uri: &str) -> SourceRef {
        SourceRef {
            tier,
            priority,
            feed_id: "f".into(),
            uri: Some(uri.into()),
        }
    }

    #[test]
    fn shared_strong_id_merges_and_ranks_sources_by_tier() {
        let mut a = node(
            "jf",
            "1",
            "Metropolis",
            Some(1927),
            vec![id("imdb", "tt0017136")],
        );
        a.sources = vec![
            src(Tier::Http, 1, "https://a/x.mp4"),
            src(Tier::P2p, 1, "magnet:a"),
        ];
        let mut b = node(
            "ia",
            "m",
            "Metropolis",
            Some(1927),
            vec![id("imdb", "tt0017136")],
        );
        b.sources = vec![
            src(Tier::Local, 1, "/mnt/m.mkv"),
            src(Tier::Debrid, 1, "https://d/m"),
        ];
        let r = merge_nodes(&[a, b], &[]);
        assert_eq!(r.cards.len(), 1);
        let c = &r.cards[0];
        assert_eq!(c.members, vec![0, 1]);
        assert_eq!(c.reason, vec![id("imdb", "tt0017136")]);
        let tiers: Vec<Tier> = c.node.sources.iter().map(|s| s.tier).collect();
        assert_eq!(
            tiers,
            vec![Tier::Local, Tier::Debrid, Tier::Http, Tier::P2p]
        );
        assert_eq!(c.node.origins.len(), 2);
    }

    #[test]
    fn user_tier_order_is_respected() {
        let mut a = node("f", "1", "T", None, vec![id("imdb", "tt1")]);
        a.sources = vec![src(Tier::Local, 1, "/a"), src(Tier::Http, 1, "https://h")];
        let r = merge_nodes_with_order(&[a], &[], &[Tier::Http, Tier::Local]);
        assert_eq!(r.cards[0].node.sources[0].tier, Tier::Http);
    }

    #[test]
    fn remake_with_different_year_and_ids_stays_separate_and_is_not_suggested() {
        let a = node("f", "1", "Dune", Some(1984), vec![id("imdb", "tt0087182")]);
        let b = node("g", "2", "Dune", Some(2021), vec![id("imdb", "tt1160419")]);
        let r = merge_nodes(&[a, b], &[]);
        assert_eq!(r.cards.len(), 2);
        assert!(r.suggestions.is_empty());
    }

    #[test]
    fn conflicting_ids_never_merge_even_with_a_shared_one() {
        let a = node(
            "f",
            "1",
            "X",
            Some(2000),
            vec![id("imdb", "tt1"), id("ia", "same")],
        );
        let b = node(
            "g",
            "2",
            "X",
            Some(2000),
            vec![id("imdb", "tt2"), id("ia", "same")],
        );
        assert_eq!(merge_nodes(&[a, b], &[]).cards.len(), 2);
    }

    #[test]
    fn different_kind_never_merges() {
        let a = node("f", "1", "Hamlet", Some(1996), vec![id("imdb", "tt1")]);
        let mut b = node("g", "2", "Hamlet", Some(1996), vec![id("imdb", "tt1")]);
        b.kind = NodeKind::Document;
        assert_eq!(merge_nodes(&[a, b], &[]).cards.len(), 2);
    }

    #[test]
    fn title_only_match_is_a_suggestion_not_a_merge() {
        let mut a = node("f", "1", "The Principles of Anatomy", Some(1975), vec![]);
        a.creators = vec!["J. Smith".into()];
        let mut b = node("g", "2", "Principles of Anatomy", Some(1975), vec![]);
        b.creators = vec!["j smith".into()];
        let r = merge_nodes(&[a, b], &[]);
        assert_eq!(r.cards.len(), 2);
        assert_eq!(r.suggestions, vec![Suggestion { a: 0, b: 1 }]);
    }

    #[test]
    fn title_match_needs_year_creator_and_compatible_language() {
        let mk = |y: Option<u16>, lang: Option<&str>, who: &str| {
            let mut n = node("f", who, "Same Title", y, vec![]);
            n.language = lang.map(Into::into);
            n.creators = vec!["Ann".into()];
            n
        };
        assert!(
            merge_nodes(&[mk(None, None, "1"), mk(Some(2000), None, "2")], &[])
                .suggestions
                .is_empty()
        );
        assert!(merge_nodes(
            &[
                mk(Some(2000), Some("en"), "1"),
                mk(Some(2000), Some("hi"), "2")
            ],
            &[]
        )
        .suggestions
        .is_empty());
        let mut no_creator = mk(Some(2000), None, "3");
        no_creator.creators.clear();
        assert!(merge_nodes(&[mk(Some(2000), None, "1"), no_creator], &[])
            .suggestions
            .is_empty());
    }

    #[test]
    fn never_merge_pair_splits_a_card() {
        let a = node("jf", "1", "T", None, vec![id("imdb", "tt1")]);
        let b = node("ia", "2", "T", None, vec![id("imdb", "tt1")]);
        let never = vec![("jf/1".to_string(), "ia/2".to_string())];
        assert_eq!(merge_nodes(&[a, b], &never).cards.len(), 2);
    }

    #[test]
    fn feed_local_ids_do_not_merge() {
        let a = node("f", "1", "T", None, vec![id("opds", "1")]);
        let b = node("g", "2", "T", None, vec![id("opds", "1")]);
        assert_eq!(merge_nodes(&[a, b], &[]).cards.len(), 2);
    }

    #[test]
    fn chain_cannot_merge_through_a_conflict() {
        let a = node("a", "1", "T", None, vec![id("imdb", "tt1")]);
        let b = node(
            "b",
            "2",
            "T",
            None,
            vec![id("imdb", "tt1"), id("isbn", "9")],
        );
        let c = node(
            "c",
            "3",
            "T",
            None,
            vec![id("isbn", "9"), id("imdb", "tt2")],
        );
        let r = merge_nodes(&[a, b, c], &[]);
        assert_eq!(r.cards.len(), 2);
    }

    #[test]
    fn missing_year_with_shared_id_merges_and_fills_gaps() {
        let a = node("f", "1", "T", None, vec![id("tmdb:movie", "5")]);
        let b = node("g", "2", "T", Some(1999), vec![id("tmdb:movie", "5")]);
        let r = merge_nodes(&[a, b], &[]);
        assert_eq!(r.cards.len(), 1);
        assert_eq!(r.cards[0].node.year, Some(1999));
    }

    #[test]
    fn ten_thousand_nodes_merge_quickly() {
        let nodes: Vec<Node> = (0..10_000)
            .map(|i| {
                node(
                    "f",
                    &i.to_string(),
                    &format!("Title {}", i % 5000),
                    Some(2000),
                    vec![id("imdb", &format!("tt{}", i % 5000))],
                )
            })
            .collect();
        let start = std::time::Instant::now();
        let r = merge_nodes(&nodes, &[]);
        assert_eq!(r.cards.len(), 5000);
        assert!(start.elapsed().as_secs() < 5);
    }
}
