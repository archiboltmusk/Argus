import "./_localstorage-stub.ts";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseTimestampToSeconds,
  parseDescriptionTimestamps,
  synthesizeChaptersFromSubtitles,
  synthesizeNarrativeChapters,
  resolveBestChapters,
} from "../src/lib/player/synthetic-chapters.ts";

describe("YouTube Chapters & Subtitle Synthesis", () => {
  describe("parseTimestampToSeconds", () => {
    it("converts MM:SS and HH:MM:SS to seconds", () => {
      assert.equal(parseTimestampToSeconds("0:00"), 0);
      assert.equal(parseTimestampToSeconds("01:23"), 83);
      assert.equal(parseTimestampToSeconds("10:45"), 645);
      assert.equal(parseTimestampToSeconds("1:05:30"), 3930);
      assert.equal(parseTimestampToSeconds("02:15:10"), 8110);
    });

    it("handles invalid timestamps gracefully", () => {
      assert.equal(parseTimestampToSeconds("invalid"), -1);
      assert.equal(parseTimestampToSeconds(""), -1);
      assert.equal(parseTimestampToSeconds("12"), -1);
    });
  });

  describe("parseDescriptionTimestamps", () => {
    it("extracts YouTube timestamp listings from description text", () => {
      const description = `
Here is what we cover in this comprehensive masterclass:
0:00 - Introduction & Motivation
01:30 Setup and Environment
05:45 Deep Dive into Core Architecture
[12:20] Memory Management & Rust Interop
25:00 - Summary & Conclusion https://example.com/notes
      `;

      const chapters = parseDescriptionTimestamps(description, 1800);
      assert.equal(chapters.length, 5);

      assert.equal(chapters[0].title, "Introduction & Motivation");
      assert.equal(chapters[0].startSec, 0);
      assert.equal(chapters[0].endSec, 90);

      assert.equal(chapters[1].title, "Setup and Environment");
      assert.equal(chapters[1].startSec, 90);

      assert.equal(chapters[2].title, "Deep Dive into Core Architecture");
      assert.equal(chapters[2].startSec, 345);

      assert.equal(chapters[3].title, "Memory Management & Rust Interop");
      assert.equal(chapters[3].startSec, 740);

      assert.equal(chapters[4].title, "Summary & Conclusion");
      assert.equal(chapters[4].startSec, 1500);
      assert.equal(chapters[4].endSec, 1800);
    });

    it("automatically prepends an Intro chapter when first timestamp is > 10s", () => {
      const text = `
01:15 First Real Chapter
03:45 Second Real Chapter
      `;
      const chapters = parseDescriptionTimestamps(text, 300);
      assert.equal(chapters.length, 3);
      assert.equal(chapters[0].title, "Introduction");
      assert.equal(chapters[0].startSec, 0);
      assert.equal(chapters[0].endSec, 75);
      assert.equal(chapters[1].title, "First Real Chapter");
      assert.equal(chapters[1].startSec, 75);
    });

    it("ignores timestamps that exceed durationSec", () => {
      const text = `
0:00 Intro
01:00 Middle
59:00 Too Far
      `;
      const chapters = parseDescriptionTimestamps(text, 120);
      assert.equal(chapters.length, 2);
      assert.equal(chapters[0].title, "Intro");
      assert.equal(chapters[1].title, "Middle");
    });
  });

  describe("synthesizeChaptersFromSubtitles", () => {
    it("synthesizes scene chapters using conversation silence gaps (Reddit approach)", () => {
      const cues = [
        { startSec: 5, endSec: 15, text: "Welcome to the film." },
        { startSec: 16, endSec: 25, text: "Let me introduce the team." },
        // 35s silence gap here (60 - 25 = 35s)
        { startSec: 60, endSec: 80, text: "Meanwhile in London, an extraordinary thing happened." },
        { startSec: 82, endSec: 100, text: "We discovered the vault." },
        // 40s silence gap here (190 - 100 = 90s)
        { startSec: 190, endSec: 210, text: "[Music] ♪ Dramatic melody ♪" },
        // 50s silence gap here (320 - 210 = 110s)
        { startSec: 320, endSec: 340, text: "The finale has arrived, hold your ground!" },
        { startSec: 345, endSec: 360, text: "We made it." },
        { startSec: 400, endSec: 420, text: "The end." },
        { startSec: 425, endSec: 440, text: "Directed by John Doe." },
      ];

      const chapters = synthesizeChaptersFromSubtitles(cues, 600);
      assert.ok(chapters.length >= 3);

      assert.equal(chapters[0].title, "Opening Scene");
      assert.equal(chapters[0].startSec, 0);

      // Verify a scene was detected from the dialogue after the silence gap
      const londonScene = chapters.find((c) => c.title.includes("Meanwhile in London"));
      assert.ok(londonScene);

      // Verify musical transition scene
      const musicScene = chapters.find((c) => c.title.toLowerCase().includes("musical"));
      assert.ok(musicScene);

      // Verify End Credits
      const credits = chapters.find((c) => c.kind === "credits");
      assert.ok(credits);
    });
  });

  describe("synthesizeNarrativeChapters", () => {
    it("generates 3-act / 5-act narrative chapters for standard movies", () => {
      const chapters = synthesizeNarrativeChapters({ durationSec: 7200, isIndianCinema: false });
      assert.ok(chapters.length >= 4);
      assert.equal(chapters[0].kind, "prologue");
      assert.equal(chapters[chapters.length - 1].kind, "credits");
    });

    it("generates Indian Cinema Intermission structure for long films", () => {
      const chapters = synthesizeNarrativeChapters({ durationSec: 9000, isIndianCinema: true });
      const intermission = chapters.find((c) => c.kind === "intermission");
      assert.ok(intermission);
      assert.ok(intermission.title.includes("Intermission"));
      assert.ok(Math.abs(intermission.startSec - 4500) < 100);
    });
  });

  describe("resolveBestChapters", () => {
    it("prioritizes native container chapters if present", () => {
      const native = [
        { title: "Native Chap 1", startSec: 0 },
        { title: "Native Chap 2", startSec: 500 },
      ];
      const desc = "0:00 Intro\n10:00 Desc Chap 2";
      const resolved = resolveBestChapters({
        existingChapters: native,
        description: desc,
        durationSec: 1000,
      });
      assert.equal(resolved.length, 2);
      assert.equal(resolved[0].title, "Native Chap 1");
      assert.equal(resolved[1].title, "Native Chap 2");
    });

    it("falls back to description timestamps when native chapters are missing", () => {
      const desc = "0:00 Intro\n05:00 Middle\n10:00 Outro";
      const resolved = resolveBestChapters({
        description: desc,
        durationSec: 900,
      });
      assert.equal(resolved.length, 3);
      assert.equal(resolved[0].title, "Intro");
      assert.equal(resolved[1].title, "Middle");
      assert.equal(resolved[2].title, "Outro");
    });

    it("falls back to subtitle gaps when description is also missing", () => {
      const cues = [
        { startSec: 0, endSec: 10, text: "First cue" },
        { startSec: 15, endSec: 25, text: "Second cue" },
        { startSec: 80, endSec: 90, text: "Third cue after silence" },
        { startSec: 95, endSec: 105, text: "Fourth cue" },
        { startSec: 180, endSec: 190, text: "Fifth cue after silence" },
        { startSec: 200, endSec: 210, text: "Sixth cue" },
        { startSec: 290, endSec: 300, text: "Seventh cue after silence" },
        { startSec: 310, endSec: 320, text: "Eighth cue" },
        { startSec: 330, endSec: 340, text: "Ninth cue" },
        { startSec: 350, endSec: 360, text: "Tenth cue" },
      ];
      const resolved = resolveBestChapters({
        subtitleCues: cues,
        durationSec: 600,
      });
      assert.ok(resolved.length >= 3);
    });
  });
});
