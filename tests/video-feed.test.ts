import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { orderLectures, parseVideoFeed } from "../src/lib/feeds/video-feed.ts";
import { assignLessons } from "../src/lib/local-library/courses.ts";

(globalThis as { DOMParser?: unknown }).DOMParser = new JSDOM("").window.DOMParser;

test("parses video enclosures from RSS and skips audio-only items", () => {
  const xml = `<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel><title>Course</title>
<item><title>Lecture 2</title><guid>b</guid><enclosure url="https://h/2.mp4" type="video/mp4"/><itunes:duration>01:02:03</itunes:duration></item>
<item><title>Audio</title><enclosure url="https://h/a.mp3" type="audio/mpeg"/></item>
<item><title>Lecture 10</title><enclosure url="https://h/10.mp4" type="video/mp4"/></item></channel></rss>`;
  const feed = parseVideoFeed(xml);
  assert.equal(feed.title, "Course");
  assert.deepEqual(feed.items.map((i) => i.title), ["Lecture 2", "Lecture 10"]);
  assert.equal(feed.items[0].durationSec, 3723);
  assert.deepEqual(orderLectures(feed.items).map((i) => i.title), ["Lecture 2", "Lecture 10"]);
});

test("parses the official YouTube Atom feed", () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><title>Playlist</title>
<entry><id>yt:video:abcdefghijk</id><yt:videoId>abcdefghijk</yt:videoId><title>L1</title><published>2024-01-01T00:00:00+00:00</published></entry></feed>`;
  const feed = parseVideoFeed(xml);
  assert.equal(feed.items[0].url, "https://www.youtube.com/watch?v=abcdefghijk");
});

test("numbers course lessons by prefix, per folder", () => {
  const files = ["10 - Ten.mp4", "02 - Two.mp4", "01 - One.mp4"].map((filename) => ({
    path: `/Edu/Ortho/${filename}`,
    filename,
  }));
  const lessons = assignLessons(files);
  assert.equal(lessons.get("/Edu/Ortho/01 - One.mp4")?.lesson, 1);
  assert.equal(lessons.get("/Edu/Ortho/10 - Ten.mp4")?.lesson, 10);
  assert.equal(lessons.get("/Edu/Ortho/02 - Two.mp4")?.lessonTitle, "Two");
  assert.equal(lessons.get("/Edu/Ortho/02 - Two.mp4")?.course, "Ortho");
});

test("falls back to positions when prefixes collide or are missing", () => {
  const files = ["b.mp4", "a.mp4", "1 x.mp4", "1 y.mp4"].map((filename) => ({ path: `/C/${filename}`, filename }));
  const lessons = assignLessons(files);
  assert.deepEqual([...lessons.values()].map((l) => l.lesson).sort(), [1, 2, 3, 4]);
});
