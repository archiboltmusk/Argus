import { createRequire } from "node:module";
import { writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(`${process.env.PLAYWRIGHT_DIR ?? process.cwd()}/`);
const { chromium } = require("playwright");
const base = process.argv[2] ?? "http://127.0.0.1:1420";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw Error("Use a local Vite server only");
const file = resolve(".argus-everyday-fixture.tsx");
writeFileSync(
  file,
  `import React from 'react';
import {createRoot} from 'react-dom/client';
import {PlaybackHelp} from './src/components/player/playback-help';
import {DeviceReadiness} from './src/views/settings/advanced-panel/device-readiness';
import {openPlaybackHelp} from './src/lib/player/playback-help';
import {useSourceMemory} from './src/views/player/hooks/use-source-memory';
import {setPlaybackClock} from './src/lib/player/playback-clock';
import {readSourceMemory} from './src/lib/player/source-memory';
window.testCalls=[];
const snap={status:'playing',firstFrameReady:true,buffering:false,muted:true,volume:0,positionSec:0,bufferedSec:2,audioTracks:[{id:'a',lang:'hin',kind:'audio',selected:true}],subtitleTracks:[],videoWidth:16,videoHeight:16,errorCode:null};
window.fixture={openPlaybackHelp,setPlaybackClock,readSourceMemory};
function Memory(){useSourceMemory('https://media.example/video.mp4',{addonId:'fixture-addon',resolution:'1080p'},snap);return null;}
createRoot(document.getElementById('root')).render(<><Memory/><PlaybackHelp snap={snap} src={{url:'https://media.example/video.mp4',title:'Bunny',meta:{id:'fixture',name:'Bunny',type:'movie'}}} bridge={{setMuted:v=>window.testCalls.push(['muted',v]),setVolume:v=>window.testCalls.push(['volume',v])}} chooseSource={()=>window.testCalls.push(['choose'])} reload={()=>window.testCalls.push(['reload'])}/><DeviceReadiness/></>);`,
  { flag: "wx" },
);
let browser;
try {
  browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/__everyday_fixture", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<html><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/.argus-everyday-fixture.tsx"></script></body></html>`,
    }),
  );
  await page.goto(`${base}/__everyday_fixture`);
  await page
    .getByRole("button", { name: "Test video decoding", exact: true })
    .waitFor({ timeout: 120000 });
  await page.getByRole("button", { name: "Test video decoding", exact: true }).click();
  await page.getByText("The web player decoded the local test video.", { exact: true }).waitFor();
  await page.keyboard.press("ArrowDown");
  await page.getByText("Navigation input received", { exact: true }).waitFor();
  await page.evaluate(() => window.fixture.openPlaybackHelp());
  await page.getByRole("button", { name: "Restore sound", exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.testCalls), [
    ["muted", false],
    ["volume", 70],
  ]);
  await page.evaluate(() => window.fixture.openPlaybackHelp());
  await page.getByRole("button", { name: "Choose another source", exact: true }).click();
  await page.evaluate(() => window.fixture.openPlaybackHelp());
  await page.getByRole("button", { name: "Reload source", exact: true }).click();
  assert.deepEqual((await page.evaluate(() => window.testCalls)).slice(2), [
    ["choose"],
    ["reload"],
  ]);
  await page.evaluate(() => {
    const now = Date.now;
    window.originalNow = now;
    Date.now = () => now() + 11000;
    window.fixture.setPlaybackClock(12, 2);
  });
  await page.waitForTimeout(200);
  assert.equal(
    await page.evaluate(() => window.fixture.readSourceMemory()?.addonId),
    "fixture-addon",
  );
  await page.evaluate(() => {
    Date.now = window.originalNow;
  });
  assert.deepEqual(errors, []);
  writeFileSync(
    "everyday-acceptance.json",
    JSON.stringify(
      {
        passed: true,
        checks: [
          "playback help controls",
          "local VP8 decoding",
          "navigation input",
          "clock-driven source memory",
        ],
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: actual playback help controls, local video decoding, navigation input and clock-driven source memory",
  );
} finally {
  await browser?.close();
  rmSync(file, { force: true });
}
