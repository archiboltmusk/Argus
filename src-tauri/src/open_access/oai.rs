//! OAI-PMH `ListRecords` with `oai_dc` (Dublin Core): request URLs and response parsing.
//! arXiv, PubMed Central's open-access set and most institutional repositories speak this.

use super::store::Record;
use quick_xml::events::Event;
use quick_xml::Reader;
use url::Url;

const MAX_TITLE: usize = 500;
const MAX_ABSTRACT: usize = 4000;
const MAX_AUTHORS: usize = 1000;
const MAX_SUBJECT: usize = 500;
const MAX_ID: usize = 500;
const MAX_URL: usize = 2000;

#[derive(Debug, Default, PartialEq)]
pub struct Page {
    pub response_date: Option<String>,
    pub records: Vec<Record>,
    pub deleted: Vec<String>,
    pub resumption_token: Option<String>,
    /// OAI error code. `noRecordsMatch` is an empty result, not a failure; callers decide.
    pub error: Option<String>,
}

/// Accepts the endpoint a user pastes. Credentials in the URL are refused so they cannot leak
/// into logs or the index database.
pub fn validate_base_url(input: &str) -> Result<Url, &'static str> {
    let url = Url::parse(input.trim()).map_err(|_| "url")?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
    {
        return Err("url");
    }
    Ok(url)
}

/// First request keeps the user's own query (such as `set=cs`); a resumption token is exclusive.
pub fn list_records_url(base: &Url, from: Option<&str>, token: Option<&str>) -> Url {
    let mut url = base.clone();
    let kept: Vec<(String, String)> = match token {
        Some(_) => Vec::new(),
        None => base
            .query_pairs()
            .filter(|(key, _)| {
                !matches!(
                    &**key,
                    "verb" | "metadataPrefix" | "from" | "resumptionToken"
                )
            })
            .map(|(key, value)| (key.into_owned(), value.into_owned()))
            .collect(),
    };
    {
        let mut query = url.query_pairs_mut();
        query.clear();
        query.append_pair("verb", "ListRecords");
        match token {
            Some(token) => {
                query.append_pair("resumptionToken", token);
            }
            None => {
                query.append_pair("metadataPrefix", "oai_dc");
                if let Some(from) = from {
                    query.append_pair("from", from);
                }
                for (key, value) in &kept {
                    query.append_pair(key, value);
                }
            }
        }
    }
    url
}

fn local(name: &[u8]) -> String {
    let name = name.rsplit(|byte| *byte == b':').next().unwrap_or(name);
    String::from_utf8_lossy(name).into_owned()
}

fn truncate(mut text: String, max: usize) -> String {
    if text.len() > max {
        let mut end = max;
        while !text.is_char_boundary(end) {
            end -= 1;
        }
        text.truncate(end);
    }
    text
}

fn clean(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn join(parts: &[String], max: usize) -> Option<String> {
    (!parts.is_empty()).then(|| truncate(parts.join("; "), max))
}

fn entity(name: &str) -> Option<char> {
    match name {
        "amp" => Some('&'),
        "lt" => Some('<'),
        "gt" => Some('>'),
        "quot" => Some('"'),
        "apos" => Some('\''),
        _ => {
            let digits = name.strip_prefix('#')?;
            let code = match digits.strip_prefix(['x', 'X']) {
                Some(hex) => u32::from_str_radix(hex, 16).ok()?,
                None => digits.parse().ok()?,
            };
            char::from_u32(code)
        }
    }
}

#[derive(Default)]
struct Draft {
    id: String,
    deleted: bool,
    titles: Vec<String>,
    creators: Vec<String>,
    descriptions: Vec<String>,
    subjects: Vec<String>,
    identifiers: Vec<String>,
    kinds: Vec<String>,
    dates: Vec<String>,
}

fn media_type(kinds: &[String]) -> &'static str {
    let joined = kinds.join(" ").to_lowercase();
    if joined.contains("movingimage") || joined.contains("video") || joined.contains("lecture") {
        "lecture_video"
    } else if joined.contains("sound") || joined.contains("audio") {
        "audiobook"
    } else if joined.contains("manuscript") {
        "manuscript"
    } else {
        "article"
    }
}

/// Repositories mostly publish `http://` landing pages that also serve https; the index only
/// stores https links.
fn https_url(identifiers: &[String]) -> Option<String> {
    identifiers.iter().find_map(|value| {
        let value = value.trim();
        let rest = value
            .strip_prefix("https://")
            .or_else(|| value.strip_prefix("http://"))?;
        let url = Url::parse(&format!("https://{rest}")).ok()?;
        (url.host_str().is_some() && url.as_str().len() <= MAX_URL).then(|| url.into())
    })
}

fn year(dates: &[String]) -> Option<i64> {
    dates.iter().find_map(|date| {
        let digits = date.get(..4)?;
        let year: i64 = digits.parse().ok()?;
        (1000..=2999).contains(&year).then_some(year)
    })
}

fn finish(draft: Draft) -> Option<Record> {
    let title = truncate(clean(draft.titles.first()?), MAX_TITLE);
    let direct_url = https_url(&draft.identifiers)?;
    if title.is_empty() || draft.id.is_empty() {
        return None;
    }
    Some(Record {
        id: draft.id,
        title,
        authors: join(&draft.creators, MAX_AUTHORS),
        abstract_text: join(&draft.descriptions, MAX_ABSTRACT),
        subject: join(&draft.subjects, MAX_SUBJECT),
        media_type: media_type(&draft.kinds),
        direct_url,
        published_year: year(&draft.dates),
    })
}

pub fn parse_list_records(xml: &str) -> Result<Page, &'static str> {
    let mut reader = Reader::from_str(xml);
    let mut page = Page::default();
    let mut stack: Vec<String> = Vec::new();
    let mut text = String::new();
    let mut draft: Option<Draft> = None;
    let mut error_code: Option<String> = None;
    loop {
        match reader.read_event().map_err(|_| "xml")? {
            Event::Start(element) => {
                let name = local(element.name().as_ref());
                text.clear();
                match name.as_str() {
                    "record" => draft = Some(Draft::default()),
                    "header" => {
                        if let Some(draft) = draft.as_mut() {
                            for attribute in element.attributes().flatten() {
                                if attribute.key.as_ref() == b"status"
                                    && attribute.value.as_ref() == b"deleted"
                                {
                                    draft.deleted = true;
                                }
                            }
                        }
                    }
                    "error" => {
                        error_code = element
                            .attributes()
                            .flatten()
                            .find(|attribute| attribute.key.as_ref() == b"code")
                            .map(|attribute| {
                                String::from_utf8_lossy(&attribute.value).into_owned()
                            });
                    }
                    _ => {}
                }
                stack.push(name);
            }
            Event::Empty(element) if local(element.name().as_ref()) == "error" => {
                page.error = element
                    .attributes()
                    .flatten()
                    .find(|attribute| attribute.key.as_ref() == b"code")
                    .map(|attribute| String::from_utf8_lossy(&attribute.value).into_owned());
            }
            Event::Text(value) => text.push_str(&value.decode().map_err(|_| "xml")?),
            Event::CData(value) => text.push_str(&String::from_utf8_lossy(&value.into_inner())),
            Event::GeneralRef(value) => {
                let name = value.decode().map_err(|_| "xml")?;
                text.push(entity(&name).ok_or("xml")?);
            }
            Event::End(_) => {
                let Some(name) = stack.pop() else {
                    return Err("xml");
                };
                let parent = stack.last().map(String::as_str).unwrap_or("");
                let value = clean(&text);
                match (name.as_str(), parent) {
                    ("identifier", "header") => {
                        if let Some(draft) = draft.as_mut() {
                            draft.id = truncate(value, MAX_ID);
                        }
                    }
                    ("record", _) => {
                        if let Some(done) = draft.take() {
                            if done.deleted {
                                if !done.id.is_empty() {
                                    page.deleted.push(done.id);
                                }
                            } else if let Some(record) = finish(done) {
                                page.records.push(record);
                            }
                        }
                    }
                    ("resumptionToken", _) if !value.is_empty() => {
                        page.resumption_token = Some(value);
                    }
                    ("responseDate", _) if !value.is_empty() => page.response_date = Some(value),
                    ("error", _) => page.error = error_code.take(),
                    (field, "dc") if !value.is_empty() => {
                        if let Some(draft) = draft.as_mut() {
                            let list = match field {
                                "title" => Some(&mut draft.titles),
                                "creator" => Some(&mut draft.creators),
                                "description" => Some(&mut draft.descriptions),
                                "subject" => Some(&mut draft.subjects),
                                "identifier" => Some(&mut draft.identifiers),
                                "type" => Some(&mut draft.kinds),
                                "date" => Some(&mut draft.dates),
                                _ => None,
                            };
                            if let Some(list) = list {
                                list.push(value);
                            }
                        }
                    }
                    _ => {}
                }
                text.clear();
            }
            Event::Eof => break,
            _ => {}
        }
    }
    Ok(page)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>2026-10-23T07:18:34Z</responseDate>
  <request verb="ListRecords">https://example.org/oai</request>
  <ListRecords>
    <record>
      <header><identifier>oai:example.org:1</identifier><datestamp>2026-01-01</datestamp></header>
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>Fish &amp; Chips:
            A Study</dc:title>
          <dc:creator>Doe, Jane</dc:creator>
          <dc:creator>Roe, Rick</dc:creator>
          <dc:description>About &#233;lan <![CDATA[and <b>cdata</b>]]></dc:description>
          <dc:subject>food</dc:subject>
          <dc:type>Text</dc:type>
          <dc:date>2019-05-04</dc:date>
          <dc:identifier>doi:10.1/x</dc:identifier>
          <dc:identifier>http://example.org/abs/1</dc:identifier>
        </oai_dc:dc>
      </metadata>
    </record>
    <record>
      <header status="deleted"><identifier>oai:example.org:2</identifier></header>
    </record>
    <record>
      <header><identifier>oai:example.org:3</identifier></header>
      <metadata><oai_dc:dc xmlns:oai_dc="x" xmlns:dc="y">
        <dc:title>No link</dc:title><dc:identifier>doi:10.1/y</dc:identifier>
      </oai_dc:dc></metadata>
    </record>
    <record>
      <header><identifier>oai:example.org:4</identifier></header>
      <metadata><oai_dc:dc xmlns:oai_dc="x" xmlns:dc="y">
        <dc:title>Lecture one</dc:title><dc:type>MovingImage</dc:type>
        <dc:identifier>https://example.org/v/4.mp4</dc:identifier>
      </oai_dc:dc></metadata>
    </record>
    <resumptionToken completeListSize="9">tok123</resumptionToken>
  </ListRecords>
</OAI-PMH>"#;

    #[test]
    fn parses_records_deletions_and_token() {
        let page = parse_list_records(SAMPLE).unwrap();
        assert_eq!(page.response_date.as_deref(), Some("2026-10-23T07:18:34Z"));
        assert_eq!(page.resumption_token.as_deref(), Some("tok123"));
        assert_eq!(page.deleted, vec!["oai:example.org:2"]);
        assert_eq!(page.records.len(), 2, "record without a link is skipped");
        let first = &page.records[0];
        assert_eq!(first.id, "oai:example.org:1");
        assert_eq!(first.title, "Fish & Chips: A Study");
        assert_eq!(first.authors.as_deref(), Some("Doe, Jane; Roe, Rick"));
        assert_eq!(
            first.abstract_text.as_deref(),
            Some("About élan and <b>cdata</b>")
        );
        assert_eq!(first.direct_url, "https://example.org/abs/1");
        assert_eq!(first.published_year, Some(2019));
        assert_eq!(first.media_type, "article");
        assert_eq!(page.records[1].media_type, "lecture_video");
    }

    #[test]
    fn no_records_match_is_reported_not_failed() {
        let xml = r#"<OAI-PMH><error code="noRecordsMatch">none</error></OAI-PMH>"#;
        let page = parse_list_records(xml).unwrap();
        assert_eq!(page.error.as_deref(), Some("noRecordsMatch"));
        assert!(page.records.is_empty());
    }

    #[test]
    fn malformed_xml_is_an_error() {
        assert!(parse_list_records("<a><b></a>").is_err());
    }

    #[test]
    fn urls() {
        assert!(validate_base_url("https://u:p@example.org/oai").is_err());
        assert!(validate_base_url("ftp://example.org/oai").is_err());
        assert!(validate_base_url("not a url").is_err());
        let base = validate_base_url("https://example.org/oai?set=cs&verb=Identify").unwrap();
        let first = list_records_url(&base, Some("2026-01-01"), None);
        assert_eq!(
            first.as_str(),
            "https://example.org/oai?verb=ListRecords&metadataPrefix=oai_dc&from=2026-01-01&set=cs"
        );
        let next = list_records_url(&base, Some("2026-01-01"), Some("a b"));
        assert_eq!(
            next.as_str(),
            "https://example.org/oai?verb=ListRecords&resumptionToken=a+b"
        );
    }
}
