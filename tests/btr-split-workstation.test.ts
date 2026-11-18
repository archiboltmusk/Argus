import test from "node:test";
import assert from "node:assert/strict";
import {
  getDigitalNotesForSubject,
  ANATOMY_DIGITAL_NOTES,
} from "../src/lib/education/btr-digital-notes";
import {
  resolveBTRPlayableUrl,
  createBTRVideoPlayerSrc,
  type BTRLocalMediaFile,
} from "../src/lib/education/btr-local-library";
import {
  getSubjectYouTubeLecture,
  SUBJECT_HIGH_YIELD_YOUTUBE,
  extractYouTubeId,
} from "../src/lib/education/btr-youtube-bridge";
import { CORE_BTR_SUBJECTS } from "../src/lib/education/corebtr-schedule";

test("BTR Workstation Notes: retrieves Anatomy high-yield master notes", () => {
  const notes = getDigitalNotesForSubject("anatomy");
  assert.ok(notes.length >= 4, "Must contain at least 4 high-yield anatomy sections");

  // Verify Brachial Plexus section
  const brachial = notes.find((n) => n.id === "anat-brachial-plexus");
  assert.ok(brachial, "Brachial plexus section must exist");
  assert.ok(brachial.pearls.some((p) => p.includes("Erb-Duchenne")));
  assert.ok(brachial.table, "Brachial plexus must have lesion table");
  assert.equal(brachial.table?.headers.length, 4);

  // Verify Skull Foramina section
  const skull = notes.find((n) => n.id === "anat-skull-foramina");
  assert.ok(skull, "Skull foramina section must exist");
  assert.ok(skull.pearls.some((p) => p.includes("Foramen Ovale Mnemonic 'MALE'")));

  // Verify Embryology section
  const embryo = notes.find((n) => n.id === "anat-embryo-derivatives");
  assert.ok(embryo, "Embryology section must exist");
  assert.ok(embryo.pearls.some((p) => p.includes("Pharyngeal Pouch 3")));
});

test("BTR Workstation Notes: cloze tests have valid blank tokens and answers", () => {
  const notes = getDigitalNotesForSubject("anatomy");
  const brachial = notes.find((n) => n.id === "anat-brachial-plexus");
  assert.ok(brachial?.clozeItems && brachial.clozeItems.length > 0);

  for (const item of brachial.clozeItems!) {
    assert.ok(item.textWithBlanks.includes("{") && item.textWithBlanks.includes("}"));
    assert.ok(item.hiddenAnswers.length > 0);

    // Verify masking
    const masked = item.textWithBlanks.replace(/\{([^}]+)\}/g, "[ ___ ? ___ ]");
    assert.ok(masked.includes("[ ___ ? ___ ]"));
    assert.ok(!masked.includes(item.hiddenAnswers[0]));

    // Verify unmasking
    const unmasked = item.textWithBlanks.replace(/\{([^}]+)\}/g, "$1");
    assert.ok(unmasked.includes(item.hiddenAnswers[0]));
  }
});

test("BTR Workstation Video: resolveBTRPlayableUrl converts local paths via Tauri and respects blobs", () => {
  // Direct file path conversion inside mocked Tauri window
  const origWindow = (globalThis as unknown as { window?: unknown }).window;
  try {
    (globalThis as unknown as { window: unknown }).window = {
      isTauri: true,
      __TAURI_INTERNALS__: {
        convertFileSrc: (p: string) => `http://asset.localhost/${encodeURIComponent(p)}`,
      },
    };

    const pdfPath = "/Users/anupam/Downloads/BTR/Anatomy_annotated.pdf";
    const convertedPdf = resolveBTRPlayableUrl(pdfPath);
    assert.equal(convertedPdf, "http://asset.localhost/%2FUsers%2Fanupam%2FDownloads%2FBTR%2FAnatomy_annotated.pdf");

    const videoPath = "/Users/anupam/Downloads/BTR/Intermediate sub/Anatomy/Anatomy_1of2.mp4";
    const convertedVideo = resolveBTRPlayableUrl(videoPath);
    assert.equal(convertedVideo, "http://asset.localhost/%2FUsers%2Fanupam%2FDownloads%2FBTR%2FIntermediate%20sub%2FAnatomy%2FAnatomy_1of2.mp4");

    // Blob URL always takes precedence over fullPath
    const blob = "blob:http://localhost:1420/test-blob-123";
    assert.equal(resolveBTRPlayableUrl(videoPath, blob), blob);
  } finally {
    (globalThis as unknown as { window?: unknown }).window = origWindow;
  }
});

test("BTR Workstation Video: fallback YouTube lecture streams effortlessly", () => {
  const anatYt = getSubjectYouTubeLecture("anatomy");
  assert.ok(anatYt.fullPath.includes("youtube.com"));
  assert.equal(anatYt.matchedSubjectId, "anatomy");
  assert.ok(anatYt.title.includes("Anatomy"));

  const ytId = extractYouTubeId(anatYt.fullPath);
  assert.equal(ytId, SUBJECT_HIGH_YIELD_YOUTUBE.anatomy.id);
});
