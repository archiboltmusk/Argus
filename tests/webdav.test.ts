import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { isVideoName, parseMultistatus, webDavHeaders } from "../src/lib/webdav/client.ts";

(globalThis as { DOMParser?: unknown }).DOMParser = new JSDOM("").window.DOMParser;

const XML = `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">
<d:response><d:href>/dav/Movies/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>
<d:response><d:href>/dav/Movies/a.mkv</d:href><d:propstat><d:prop><d:resourcetype/><d:getcontentlength>42</d:getcontentlength></d:prop></d:propstat></d:response>
<d:response><d:href>/dav/Movies/Sub%20Dir/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>
</d:multistatus>`;

test("parses folders first and skips the folder itself", () => {
  const e = parseMultistatus(XML, "https://h/dav/Movies/");
  assert.deepEqual(
    e.map((x) => [x.name, x.isDir, x.size]),
    [
      ["Sub Dir", true, undefined],
      ["a.mkv", false, 42],
    ],
  );
});

test("builds basic auth only with credentials", () => {
  assert.equal(webDavHeaders({ url: "", user: "u", password: "p" }).Authorization, "Basic dTpw");
  assert.deepEqual(webDavHeaders({ url: "", user: "", password: "" }), {});
});

test("detects video names", () => {
  assert.equal(isVideoName("x.MKV"), true);
  assert.equal(isVideoName("x.nfo"), false);
});
