import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractYouTubeId,
  extractYouTubeTimestamp,
  buildYouTubeEmbedUrl,
  createYouTubeMediaFile,
  getSubjectYouTubeLecture,
  HIGH_YIELD_YOUTUBE_CHANNELS,
} from "../src/lib/education/btr-youtube-bridge";

describe("BTR YouTube Bridge & Medical Lecture Suite", () => {
  it("extracts canonical YouTube video IDs from diverse URL formats and raw IDs", () => {
    // 1. Standard watch URL
    assert.equal(
      extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      "dQw4w9WgXcQ"
    );

    // 2. Short youtu.be URL
    assert.equal(
      extractYouTubeId("https://youtu.be/kJQP7kiw5Fk?t=120"),
      "kJQP7kiw5Fk"
    );

    // 3. Embed URL
    assert.equal(
      extractYouTubeId("https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?start=30"),
      "M7lc1UVf-VE"
    );

    // 4. Live Stream URL
    assert.equal(
      extractYouTubeId("https://www.youtube.com/live/L_LUpnjgPso"),
      "L_LUpnjgPso"
    );

    // 5. Shorts URL
    assert.equal(
      extractYouTubeId("https://youtube.com/shorts/fJ9rUzIMcZQ?feature=share"),
      "fJ9rUzIMcZQ"
    );

    // 6. Raw 11-character ID
    assert.equal(
      extractYouTubeId("8SF_h3xF3cE"),
      "8SF_h3xF3cE"
    );

    // 7. Invalid or empty strings
    assert.equal(extractYouTubeId(""), null);
    assert.equal(extractYouTubeId("https://example.com/video.mp4"), null);
    assert.equal(extractYouTubeId("not-a-youtube-url"), null);
  });

  it("extracts timestamps in seconds accurately from query params", () => {
    // Plain seconds
    assert.equal(extractYouTubeTimestamp("https://youtu.be/abc?t=45"), 45);
    assert.equal(extractYouTubeTimestamp("https://www.youtube.com/watch?v=abc&start=120"), 120);

    // Formatted minutes and seconds
    assert.equal(extractYouTubeTimestamp("https://youtu.be/abc?t=2m30s"), 150);

    // Formatted hours, minutes, and seconds
    assert.equal(extractYouTubeTimestamp("https://youtu.be/abc?t=1h10m15s"), 4215);

    // Missing timestamp
    assert.equal(extractYouTubeTimestamp("https://youtu.be/abc"), 0);
  });

  it("builds privacy-preserving youtube embed URLs with rel=0", () => {
    const embedUrl = buildYouTubeEmbedUrl("dQw4w9WgXcQ", {
      startSec: 85,
      autoplay: true,
    });

    assert.ok(
      embedUrl.startsWith("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ") ||
      embedUrl.startsWith("https://www.youtube.com/embed/dQw4w9WgXcQ"),
      "Must use privacy-preserving youtube embed"
    );
    assert.ok(embedUrl.includes("rel=0"), "Must set rel=0 to prevent external video suggestions");
    assert.ok(embedUrl.includes("autoplay=1"), "Must enable autoplay");
    assert.ok(embedUrl.includes("start=85"), "Must include starting timestamp");
  });

  it("creates valid BTRLocalMediaFile objects for seamless workstation integration", () => {
    const media = createYouTubeMediaFile(
      "https://www.youtube.com/watch?v=M7lc1UVf-VE&t=45s",
      "INI-CET Recall Masterclass",
      "medicine"
    );

    assert.equal(media.id, "yt-M7lc1UVf-VE");
    assert.equal(media.kind, "video");
    assert.equal(media.matchedSubjectId, "medicine");
    assert.equal(media.title, "INI-CET Recall Masterclass");
    assert.ok(media.fullPath.includes("M7lc1UVf-VE"));
  });

  it("registers high-yield medical YouTube channels and RSS feeds", () => {
    assert.ok(HIGH_YIELD_YOUTUBE_CHANNELS.length >= 3, "Must define at least 3 curated medical channels");
    const zainabChannel = HIGH_YIELD_YOUTUBE_CHANNELS.find((c) => c.handle === "@corebtrbyzainabvora");
    assert.ok(zainabChannel, "Dr. Zainab official channel must be registered");
    assert.ok(zainabChannel.rssFeed.includes("feeds/videos.xml"), "Must provide valid RSS feed endpoint");
  });

  it("resolves curated subject YouTube lectures gracefully", () => {
    const anatLecture = getSubjectYouTubeLecture("anatomy");
    assert.ok(anatLecture.fullPath.includes("youtube.com"));
    assert.equal(anatLecture.matchedSubjectId, "anatomy");
    assert.ok(anatLecture.title.includes("Anatomy"));

    const unknownLecture = getSubjectYouTubeLecture("non_existent_subject");
    assert.ok(unknownLecture.fullPath.includes("youtube.com"));
  });
});
