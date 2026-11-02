import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import { CommunityTab } from "../src/views/lab/community-tab.tsx";

test("worldwide UI has offline places and private plans, scoped resources, opt-in search and profile cleanup", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "https://argus.invalid/" });
  const originals = {
    window: globalThis.window,
    document: globalThis.document,
    fetch: globalThis.fetch,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(document.getElementById("root")!);
  const payload = readFileSync(
    new URL("./fixtures/community/global-places.json", import.meta.url),
    "utf8",
  );
  let requests = 0;
  let requestedUrl = "";
  let respond: ((response: Response) => void) | undefined;
  let signal: AbortSignal | undefined;
  globalThis.fetch = (async (url, options) => {
    requests++;
    requestedUrl = String(url);
    signal = options?.signal as AbortSignal;
    return new Promise<Response>((resolve) => {
      respond = resolve;
    });
  }) as typeof fetch;
  const button = (text: string) =>
    [...document.querySelectorAll("button")].find((el) => el.textContent?.includes(text))!;
  const click = async (text: string) => {
    await act(() => button(text).click());
  };
  const fill = async (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    const prototype =
      element.tagName === "TEXTAREA"
        ? dom.window.HTMLTextAreaElement.prototype
        : dom.window.HTMLInputElement.prototype;
    await act(() => {
      Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
      element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  };
  const render = async (profileId: string | null, childProfile = false, active = true) => {
    await act(() => root.render(createElement(CommunityTab, { profileId, childProfile, active })));
  };
  try {
    await render(null);
    assert.equal(document.querySelector("section"), null);
    await render("child", true);
    assert.equal(document.querySelector("section"), null);
    await render("adult");
    assert.equal(requests, 0);
    await fill(document.querySelectorAll("input")[0], "An unlisted village");
    await fill(document.querySelectorAll("input")[2], "Slovakia");
    assert.equal(requests, 0);
    await click("Use this place locally");
    assert.match(document.body.textContent!, /Live public web discovery is available/);
    await fill(document.querySelector("textarea")!, "A private community note");
    assert.equal(requests, 0);
    await click("Search live public sources");
    assert.equal(requests, 1);
    assert.doesNotMatch(requestedUrl, /private|note/);
    const searchMarkup = "## [Synthetic public notice](https://town.example.org/notices)";
    await act(async () => respond!(new Response(searchMarkup)));
    assert.match(document.body.textContent!, /Synthetic public notice/);
    assert.match(document.body.textContent!, /Unverified · Publication date unknown/);
    await click("Search live public sources");
    await click("Explore the Purulia pilot");
    assert.equal(signal?.aborted, true);
    await act(async () => respond!(new Response(searchMarkup)));
    assert.doesNotMatch(document.body.textContent!, /Synthetic public notice/);
    assert.equal(document.querySelector("textarea")!.value, "");
    assert.match(document.body.textContent!, /Purulia \/ Parishkar/);
    assert.equal(requests, 2);
    await fill(document.querySelectorAll("input")[0], "Banská Štiavnica");
    await fill(document.querySelectorAll("input")[1], "SK");
    await click("Search worldwide");
    assert.equal(requests, 3);
    await act(async () => respond!(new Response(payload)));
    await click("Banská Štiavnica ·");
    assert.match(document.body.textContent!, /Slovensko.sk municipal services/);
    assert.doesNotMatch(document.body.textContent!, /Community · Purulia \/ Parishkar/);
    await fill(document.querySelector("textarea")!, "Keep this private");
    await render("second-adult");
    assert.equal(document.querySelector("textarea"), null);
    await fill(document.querySelectorAll("input")[0], "New York");
    await click("Search worldwide");
    await act(async () => respond!(new Response(payload)));
    await click("New York ·");
    assert.match(document.body.textContent!, /NYC311 report problems/);
    assert.doesNotMatch(document.body.textContent!, /Slovensko.sk municipal services/);
    await click("Search worldwide");
    await render("second-adult", false, false);
    assert.equal(signal?.aborted, true);
    await act(async () => respond!(new Response(payload)));
    await render("second-adult");
    assert.equal(document.querySelector("textarea"), null);
    assert.equal(dom.window.localStorage.length, 0);
  } finally {
    await act(() => root.unmount());
    Object.assign(globalThis, originals);
    dom.window.close();
  }
});
