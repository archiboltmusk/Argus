// Read-only reference plugin: looks a title up in a JSON Feed (https://jsonfeed.org/version/1.1)
// whose items may carry Dublin Core terms, and hands back the attachments the feed lists.
//
// It makes one GET request, to the single host declared in manifest.json. Change FEED_URL and
// `permissions.hosts` together, then update `sha256` (shasum -a 256 plugin.js). The feed is yours:
// Argus ships no feeds and this plugin names no site.
var FEED_URL = "https://feeds.example.org/catalog.json";

var PLAYABLE = /^(video|audio)\//i;

// Dublin Core terms may sit in a `_dc` object using bare or prefixed names ("title", "dc:title").
function dc(item, term) {
  var bag = item && item._dc && typeof item._dc === "object" ? item._dc : {};
  var value = bag[term] != null ? bag[term] : bag["dc:" + term];
  if (Array.isArray(value)) value = value[0];
  return value == null ? "" : String(value).trim();
}

function normalise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function yearOf(item) {
  var m = /\b(\d{4})\b/.exec(dc(item, "date") || String(item.date_published || ""));
  return m ? Number(m[1]) : null;
}

function matches(item, req) {
  var identifier = dc(item, "identifier").toLowerCase();
  if (req.imdbId && identifier === "imdb:" + String(req.imdbId).toLowerCase()) return true;
  var title = normalise(dc(item, "title") || item.title);
  if (!title || title !== normalise(req.title)) return false;
  var year = yearOf(item);
  return !req.year || !year || year === req.year;
}

function streamsFor(feed, req) {
  var items = feed && Array.isArray(feed.items) ? feed.items : [];
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item || typeof item !== "object" || !matches(item, req)) continue;
    var files = Array.isArray(item.attachments) ? item.attachments : [];
    for (var j = 0; j < files.length; j++) {
      var file = files[j];
      if (!file || typeof file.url !== "string" || !/^https:\/\//i.test(file.url)) continue;
      if (!PLAYABLE.test(String(file.mime_type || ""))) continue;
      out.push({
        url: file.url,
        name: dc(item, "creator") || "JSON feed",
        title: file.title || dc(item, "title") || item.title || req.title,
        size: typeof file.size_in_bytes === "number" ? file.size_in_bytes : undefined,
      });
    }
  }
  return out;
}

argus.register({
  id: "json-catalog",
  name: "JSON catalog",
  streams: function (req) {
    return argus.http(FEED_URL, { responseType: "json" }).then(function (feed) {
      return streamsFor(feed, req);
    });
  },
});
