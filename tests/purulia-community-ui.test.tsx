import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { act, createElement } from "react";
import { JSDOM } from "jsdom";
import { PuruliaPanel as CommunityTab } from "../src/views/lab/purulia-panel.tsx";

test("community UI loads only on activation, switches districts locally, opens isolated tools, cancels and retries", async () => {
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
    new URL("./fixtures/community/purulia-facts.json", import.meta.url),
    "utf8",
  );
  let requests = 0;
  let respond: ((response: Response) => void) | undefined;
  let signal: AbortSignal | undefined;
  globalThis.fetch = (async (_url, options) => {
    requests++;
    signal = options?.signal as AbortSignal;
    return new Promise<Response>((resolve) => {
      respond = resolve;
    });
  }) as typeof fetch;
  const opened: unknown[][] = [];
  dom.window.open = ((...args: unknown[]) => {
    opened.push(args);
    return null;
  }) as typeof window.open;
  const button = (label: string) =>
    [...document.querySelectorAll("button")].find((el) => el.textContent?.includes(label))!;
  const click = async (label: string) => {
    await act(() => button(label).click());
  };
  try {
    const render = async (profileId: string | null, childProfile = false, active = true) => {
      await act(() =>
        root.render(createElement(CommunityTab, { profileId, childProfile, active })),
      );
    };
    await render(null);
    assert.equal(document.querySelector("section"), null);
    await render("child", true);
    assert.equal(document.querySelector("section"), null);
    await render("adult", false, false);
    assert.equal(document.querySelector("section"), null);
    await render("adult");
    assert.equal(requests, 0);
    button("Load public").focus();
    assert.equal(requests, 0);
    await click("Load public");
    assert.equal(requests, 1);
    assert.equal(button("Loading").disabled, true);
    await act(async () => respond!(new Response(payload)));
    assert.match(document.body.textContent!, /29,30,115/);
    assert.match(document.body.textContent!, /NFHS survey geography: Puruliya/);
    assert.match(document.body.textContent!, /Source read: 2026-10-03/);
    const select = document.querySelector("select")!;
    await act(() => {
      select.value = "alipurduar";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal(requests, 1);
    assert.match(document.body.textContent!, /NFHS survey geography: Jalpaiguri/);
    await click("Open public commitments");
    assert.deepEqual(opened[0], [
      "https://archiboltmusk.github.io/Purulia/promises.html?d=alipurduar",
      "_blank",
      "noopener,noreferrer",
    ]);
    assert.equal(requests, 1);
    await click("Load public");
    await click("Clear / cancel");
    assert.equal(signal?.aborted, true);
    await act(async () => respond!(new Response(payload)));
    assert.equal(document.querySelector("select"), null);
    await click("Load public");
    await act(async () => respond!(new Response("Unavailable", { status: 503 })));
    assert.match(document.querySelector("[role=alert]")!.textContent!, /could not be loaded/);
    await click("Load public");
    await act(async () => respond!(new Response(payload)));
    assert.equal(document.querySelector("[role=alert]"), null);
    await render("second-adult");
    assert.equal(document.querySelector("select"), null);
    await click("Load public");
    await render("child", true);
    assert.equal(signal?.aborted, true);
    await act(async () => respond!(new Response(payload)));
    assert.equal(document.querySelector("section"), null);
    await render("adult");
    await click("Load public");
    await render("adult", false, false);
    assert.equal(signal?.aborted, true);
    await act(async () => respond!(new Response(payload)));
    await render("adult");
    assert.equal(document.querySelector("select"), null);
    await click("Load public");
    await act(() => root.unmount());
    assert.equal(signal?.aborted, true);
    await act(async () => respond!(new Response(payload)));
    assert.equal(dom.window.localStorage?.length ?? 0, 0);
  } finally {
    // Unmount also runs on failed assertions.
    await act(() => root.unmount());
    Object.assign(globalThis, originals);
    dom.window.close();
  }
});
