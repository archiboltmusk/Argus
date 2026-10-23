//! The page loop behind a sync. Fetching and storing are injected, so the loop has no network or
//! database of its own and neither ever waits on the other's lock.

use super::oai::{self, Page};
use std::future::Future;
use std::time::Duration;
use url::Url;

const MAX_PAGES: usize = 300;
pub const PAGE_DELAY: Duration = Duration::from_millis(500);

#[derive(Debug, Default, Clone, Copy, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SyncReport {
    pub pages: usize,
    pub upserted: usize,
    pub deleted: usize,
    /// False when the page cap stopped the run; syncing again carries on from the same point.
    pub complete: bool,
}

/// Walks `ListRecords` pages. Returns the first response's server date,
/// which becomes the next incremental `from`.
pub async fn harvest<F, FFut, A, AFut>(
    base: &Url,
    from: Option<&str>,
    delay: Duration,
    mut fetch: F,
    mut apply: A,
) -> Result<(SyncReport, Option<String>), String>
where
    F: FnMut(Url) -> FFut,
    FFut: Future<Output = Result<String, String>>,
    A: FnMut(Page) -> AFut,
    AFut: Future<Output = Result<(), String>>,
{
    let mut report = SyncReport::default();
    let mut token: Option<String> = None;
    let mut server_date: Option<String> = None;
    while report.pages < MAX_PAGES {
        let xml = fetch(oai::list_records_url(base, from, token.as_deref())).await?;
        let page = oai::parse_list_records(&xml)
            .map_err(|_| "The repository sent a response Argus could not read.".to_string())?;
        report.pages += 1;
        if server_date.is_none() {
            server_date = page.response_date.clone();
        }
        match page.error.as_deref() {
            Some("noRecordsMatch") => {
                report.complete = true;
                break;
            }
            Some(code) => return Err(format!("The repository refused the request ({code}).")),
            None => {}
        }
        report.upserted += page.records.len();
        report.deleted += page.deleted.len();
        let next = page.resumption_token.clone();
        apply(page).await?;
        match next {
            None => {
                report.complete = true;
                break;
            }
            Some(next) if token.as_deref() == Some(next.as_str()) => {
                return Err("The repository repeated a page.".to_string());
            }
            Some(next) => {
                token = Some(next);
                tokio::time::sleep(delay).await;
            }
        }
    }
    Ok((report, server_date))
}

/// `last_synced_at` holds the server's own timestamp; OAI-PMH `from` takes its date part.
pub fn from_date(last_synced_at: Option<&str>) -> Option<String> {
    let date = last_synced_at?.get(..10)?;
    let bytes = date.as_bytes();
    let shaped = bytes.iter().enumerate().all(|(i, b)| match i {
        4 | 7 => *b == b'-',
        _ => b.is_ascii_digit(),
    });
    shaped.then(|| date.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;
    use std::rc::Rc;

    fn page(ids: &[&str], token: Option<&str>) -> String {
        let records: String = ids
            .iter()
            .map(|id| {
                format!(
                    "<record><header><identifier>{id}</identifier></header><metadata><oai_dc:dc><dc:title>T {id}</dc:title><dc:identifier>https://e.org/{id}</dc:identifier></oai_dc:dc></metadata></record>"
                )
            })
            .collect();
        let token = token
            .map(|t| format!("<resumptionToken>{t}</resumptionToken>"))
            .unwrap_or_default();
        format!("<OAI-PMH><responseDate>2026-10-23T00:00:00Z</responseDate><ListRecords>{records}{token}</ListRecords></OAI-PMH>")
    }

    async fn run(
        pages: Vec<String>,
    ) -> (Result<(SyncReport, Option<String>), String>, Vec<String>) {
        let base = Url::parse("https://e.org/oai").unwrap();
        let queue = Rc::new(RefCell::new(pages.into_iter()));
        let urls = Rc::new(RefCell::new(Vec::new()));
        let seen = Rc::new(RefCell::new(Vec::new()));
        let result = harvest(
            &base,
            Some("2026-01-01"),
            Duration::ZERO,
            |url| {
                urls.borrow_mut().push(url.to_string());
                let next = queue.borrow_mut().next();
                async move { next.ok_or_else(|| "out of pages".to_string()) }
            },
            |page| {
                seen.borrow_mut()
                    .extend(page.records.iter().map(|r| r.id.clone()));
                async { Ok(()) }
            },
        )
        .await;
        let urls = urls.borrow().clone();
        (result, urls)
    }

    #[test]
    fn follows_resumption_tokens_and_reports_server_date() {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_time()
            .build()
            .unwrap();
        let (result, urls) =
            rt.block_on(run(vec![page(&["a", "b"], Some("t1")), page(&["c"], None)]));
        let (report, date) = result.unwrap();
        assert_eq!(
            (report.pages, report.upserted, report.complete),
            (2, 3, true)
        );
        assert_eq!(date.as_deref(), Some("2026-10-23T00:00:00Z"));
        assert!(urls[0].contains("from=2026-01-01") && urls[0].contains("metadataPrefix=oai_dc"));
        assert_eq!(
            urls[1],
            "https://e.org/oai?verb=ListRecords&resumptionToken=t1"
        );
    }

    #[test]
    fn repeated_token_stops_instead_of_looping() {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_time()
            .build()
            .unwrap();
        let pages = vec![page(&["a"], Some("t")), page(&["b"], Some("t"))];
        let (result, _) = rt.block_on(run(pages));
        assert!(result.is_err());
    }

    #[test]
    fn oai_errors_surface_but_no_records_is_complete() {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_time()
            .build()
            .unwrap();
        let none = "<OAI-PMH><responseDate>2026-10-23T00:00:00Z</responseDate><error code=\"noRecordsMatch\"/></OAI-PMH>".to_string();
        let (report, _) = rt.block_on(run(vec![none])).0.unwrap();
        assert!(report.complete && report.upserted == 0);
        let bad = "<OAI-PMH><error code=\"badArgument\"/></OAI-PMH>".to_string();
        assert!(rt.block_on(run(vec![bad])).0.is_err());
    }

    #[test]
    fn from_date_only_accepts_iso_dates() {
        assert_eq!(
            from_date(Some("2026-10-23T00:00:00Z")).as_deref(),
            Some("2026-10-23")
        );
        assert_eq!(from_date(Some("garbage-here")), None);
        assert_eq!(from_date(None), None);
    }
}
