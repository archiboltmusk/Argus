import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { LifemaxxingView } from "@/views/lifemaxxing";

test("LifemaxxingView renders all submodules without crashing", () => {
  const html = ReactDOMServer.renderToString(<LifemaxxingView />);
  assert.ok(html.length > 500, "LifemaxxingView rendered output too small");
  assert.ok(html.includes("Human Flourishing Operating System"), "Missing header title in render");
  assert.ok(html.includes("Consolidated Vision Blueprint"), "Missing blueprint section");
});
