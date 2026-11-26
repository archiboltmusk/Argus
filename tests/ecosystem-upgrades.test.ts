import test from "node:test";
import assert from "node:assert/strict";
import { parseSubtitle } from "@/lib/subtitles/parser";
import { assColorToCss } from "@/lib/subtitles/ass-styles";
import { exportAddonBundle, importAddonBundle, parseAddonBundle } from "@/lib/addons/bundle";

test("ASS/SSA parser extracts V4+ Styles and inline override metadata", () => {
  assert.equal(assColorToCss("&H00FF8040"), "#4080ff");

  const assScript = `[Script Info]
Title: Test

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, Bold, Italic, Alignment
Style: Default,Arial,22,&H00FFFFFF,&H00000000,0,0,2
Style: Sign,Arial,26,&H0000FF00,&H00000000,-1,0,8

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.50,Sign,,0,0,0,,{\\i1\\fs30}Top Sign
`;
  const cues = parseSubtitle(assScript, "ass");
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, "Top Sign");
  assert.equal(cues[0].assStyle?.alignment, 8);
  assert.equal(cues[0].assStyle?.color, "#00ff00");
  assert.equal(cues[0].assStyle?.bold, true);
  assert.equal(cues[0].assStyle?.italic, true);
  assert.equal(cues[0].assStyle?.fontSize, 30);
});

test("Addon bundle export/import supports Argus JSON and URL lists with deduplication", async () => {
  const json = exportAddonBundle([
    { transportUrl: "https://addon-a.example/manifest.json", manifest: { id: "a", name: "Addon A" } },
    { transportUrl: "https://addon-a.example/manifest.json", manifest: { id: "a", name: "Addon A" } },
    { transportUrl: "https://addon-b.example/manifest.json", manifest: { id: "b", name: "Addon B" } },
  ]);
  const parsed = parseAddonBundle(json);
  assert.equal(parsed.length, 2);

  const installedCalls: string[] = [];
  const res = await importAddonBundle(
    "https://addon-a.example/manifest.json\nhttps://addon-c.example/manifest.json",
    new Set(["https://addon-a.example/manifest.json"]),
    async (_id, url) => {
      installedCalls.push(url);
    },
  );
  assert.deepEqual(res, { installed: 1, skipped: 1, failed: 0 });
  assert.deepEqual(installedCalls, ["https://addon-c.example/manifest.json"]);
});
