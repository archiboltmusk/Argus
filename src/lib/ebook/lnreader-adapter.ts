import { DOM_PRELUDE } from "@/lib/manga/sources/mangayomi/prelude/dom";
import { CRYPTO_PRELUDE } from "@/lib/manga/sources/mangayomi/prelude/crypto";
import { PROVIDER_CHEERIO } from "@/lib/streams/plugins/provider-compat/cheerio";
import type { EBookPluginManifest } from "./extensions";

/**
 * Checks whether an eBook extension script is an LNReader web scraper plugin
 */
export function isLNReaderSource(
  source: string,
  repoUrl?: string,
  entryUrl?: string,
): boolean {
  if (repoUrl && /lnreader/i.test(repoUrl)) return true;
  if (entryUrl && /lnreader/i.test(entryUrl)) return true;
  return (
    source.includes("popularNovels") ||
    source.includes("@libs/fetch") ||
    source.includes("@libs/novelStatus") ||
    source.includes("MadaraPlugin") ||
    source.includes("LightNovelWPPlugin")
  );
}

export const LNREADER_ENV_PRELUDE = String.raw`
var __g = (typeof self !== "undefined") ? self : (typeof globalThis !== "undefined") ? globalThis : {};
var module = { exports: {} };
var exports = module.exports;

// DayJS shim
function dayjs(val) {
  var d = val ? new Date(val) : new Date();
  var obj = {
    format: function (fmt) {
      if (isNaN(d.getTime())) return "Invalid Date";
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    },
    subtract: function (amt, unit) {
      var mult = unit === "second" ? 1000 : unit === "minute" ? 60000 : unit === "hours" ? 3600000 : 86400000;
      return dayjs(new Date(d.getTime() - (amt || 0) * mult));
    },
    add: function (amt, unit) {
      var mult = unit === "second" ? 1000 : unit === "minute" ? 60000 : unit === "hours" ? 3600000 : 86400000;
      return dayjs(new Date(d.getTime() + (amt || 0) * mult));
    }
  };
  return obj;
}
dayjs.default = dayjs;

// Storage mock
var __storage = {
  storage: {
    get: function (_k) { return null; },
    set: function (_k, _v) {}
  }
};

// Novel status enum mock
var __novelStatus = {
  NovelStatus: {
    Ongoing: "Ongoing",
    Completed: "Completed",
    Unknown: "Unknown",
    OnHiatus: "OnHiatus",
    Cancelled: "Cancelled"
  }
};

// Default cover mock
var __defaultCover = {
  defaultCover: ""
};

// Form data shim
function FormDataShim() {
  this._fields = [];
}
FormDataShim.prototype.append = function (name, value) {
  this._fields.push([encodeURIComponent(name), encodeURIComponent(value)]);
};
FormDataShim.prototype.toString = function () {
  return this._fields.map(function (pair) { return pair[0] + "=" + pair[1]; }).join("&");
};
if (typeof FormData === "undefined") {
  __g.FormData = FormDataShim;
}

// Fetch API shim routing through argus.http
function __fetchApi(url, init) {
  init = init || {};
  var headers = init.headers || {};
  var body = init.body;
  var method = init.method || "GET";

  if (body && typeof body === "object" && typeof body.toString === "function") {
    body = body.toString();
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  }

  return argus.http(String(url), {
    method: method,
    headers: headers,
    body: typeof body === "string" ? body : undefined
  }).then(function (res) {
    return {
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      headers: res.headers || {},
      text: function () { return Promise.resolve(res.body || ""); },
      json: function () {
        try { return Promise.resolve(JSON.parse(res.body || "{}")); }
        catch (e) { return Promise.resolve({}); }
      }
    };
  });
}

function __fetchFile(url, init) {
  return __fetchApi(url, init).then(function (res) {
    return res.text();
  });
}

var __fetchModule = {
  fetchApi: __fetchApi,
  fetchFile: __fetchFile
};

var __htmlparser2 = {
  Parser: function (handler) {
    this.handler = handler;
    this.write = function () {};
    this.end = function () {};
  },
  parseDocument: function (html) {
    return cheerio.load(html)._root;
  }
};

function require(modName) {
  var m = String(modName || "").toLowerCase();
  if (m === "cheerio") return cheerio;
  if (m === "dayjs") return dayjs;
  if (m === "htmlparser2") return __htmlparser2;
  if (m.indexOf("fetch") >= 0) return __fetchModule;
  if (m.indexOf("defaultcover") >= 0) return __defaultCover;
  if (m.indexOf("novelstatus") >= 0) return __novelStatus;
  if (m.indexOf("storage") >= 0) return __storage;
  return {};
}
`;

/**
 * Wraps and adapts an LNReader JavaScript plugin to Argus's eBook plugin contract
 */
export function buildLNReaderSource(
  rawSource: string,
  manifest: EBookPluginManifest,
): string {
  const safeId = JSON.stringify(manifest.id);
  const safeName = JSON.stringify(manifest.name);

  const epilogue = String.raw`
;(function () {
  var __inst = exports.default || exports.plugin || module.exports;
  if (!__inst || typeof __inst !== "object") {
    for (var k in exports) {
      if (exports[k] && typeof exports[k].popularNovels === "function") {
        __inst = exports[k];
        break;
      }
    }
  }
  if (!__inst) {
    throw new Error("LNReader plugin did not export a valid instance");
  }

  var __novelCache = {};

  function __fetchNovel(itemId) {
    if (__novelCache[itemId]) return Promise.resolve(__novelCache[itemId]);
    var fn = __inst.parseNovel || __inst.parseNovelAndChapters;
    if (typeof fn !== "function") return Promise.resolve({});
    return Promise.resolve(fn.call(__inst, itemId)).then(function (novel) {
      __novelCache[itemId] = novel || {};
      return __novelCache[itemId];
    });
  }

  var __adapted = {
    id: String(__inst.id || ${safeId}),
    name: String(__inst.name || ${safeName}),
    popular: function (offset) {
      var page = Math.floor((Number(offset) || 0) / 24) + 1;
      if (typeof __inst.popularNovels !== "function") return Promise.resolve([]);
      return Promise.resolve(__inst.popularNovels(page, { showLatestNovels: false })).then(function (novels) {
        if (!Array.isArray(novels)) return [];
        return novels.map(function (n) {
          return {
            id: String(n.path || n.url || n.id),
            title: String(n.name || n.title || "Untitled"),
            cover: n.cover || n.coverUrl,
            url: n.path || n.url
          };
        });
      });
    },
    search: function (query, offset) {
      var page = Math.floor((Number(offset) || 0) / 24) + 1;
      if (typeof __inst.searchNovels !== "function") return Promise.resolve([]);
      return Promise.resolve(__inst.searchNovels(String(query || ""), page)).then(function (novels) {
        if (!Array.isArray(novels)) return [];
        return novels.map(function (n) {
          return {
            id: String(n.path || n.url || n.id),
            title: String(n.name || n.title || "Untitled"),
            cover: n.cover || n.coverUrl,
            url: n.path || n.url
          };
        });
      });
    },
    detail: function (itemId) {
      return __fetchNovel(String(itemId)).then(function (novel) {
        return {
          id: String(novel.path || itemId),
          title: String(novel.name || novel.title || "Untitled"),
          cover: novel.cover || novel.coverUrl,
          author: novel.author,
          description: novel.summary || novel.description,
          status: novel.status
        };
      });
    },
    chapters: function (itemId) {
      return __fetchNovel(String(itemId)).then(function (novel) {
        var chs = novel.chapters || [];
        return chs.map(function (ch, idx) {
          return {
            id: String(ch.path || ch.url || idx),
            title: String(ch.name || ch.title || ("Chapter " + (idx + 1))),
            chapter: String(ch.chapterNumber || (idx + 1)),
            publishAt: ch.releaseTime ? String(ch.releaseTime) : undefined
          };
        });
      });
    },
    content: function (chapterId) {
      if (typeof __inst.parseChapter !== "function") return Promise.resolve({ text: "" });
      return Promise.resolve(__inst.parseChapter(String(chapterId))).then(function (res) {
        return { text: typeof res === "string" ? res : (res && res.text) || "" };
      });
    }
  };

  argus.register(__adapted);
  plugin = __adapted;
})();
`;

  return (
    "var __g = (typeof self !== 'undefined') ? self : (typeof globalThis !== 'undefined') ? globalThis : {};\n" +
    DOM_PRELUDE +
    "\n" +
    CRYPTO_PRELUDE +
    "\n" +
    PROVIDER_CHEERIO +
    "\n" +
    LNREADER_ENV_PRELUDE +
    "\n" +
    rawSource +
    "\n" +
    epilogue
  );
}
