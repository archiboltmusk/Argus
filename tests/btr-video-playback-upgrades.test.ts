import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveBTRPlayableUrl,
  createBTRVideoPlayerSrc,
  indexBTRFiles,
  classifyBTRFile,
  type BTRLocalMediaFile,
} from "../src/lib/education/btr-local-library";
import { CORE_BTR_SUBJECTS } from "../src/lib/education/corebtr-schedule";

test("BTR Video Playback: resolveBTRPlayableUrl resolves blobs, remote streams, and cleans paths", () => {
  // 1. Blob URL must pass through untouched
  const blob = "blob:http://localhost:3000/12345-6789";
  assert.equal(resolveBTRPlayableUrl("/some/path.mp4", blob), blob);

  // 2. HTTP/HTTPS URLs must pass through untouched
  const remote = "https://cdn.corebtr.com/lectures/ortho_01.mp4";
  assert.equal(resolveBTRPlayableUrl(remote), remote);

  // 3. Asset protocol URLs must pass through untouched
  const asset = "asset://localhost/%2FUsers%2Fanupam%2FDownloads%2FBTR%2Flecture.mp4";
  assert.equal(resolveBTRPlayableUrl(asset), asset);

  // 4. File protocol should be stripped of file:// prefix for clean native path
  const fileUrl = "file:///Users/anupam/Downloads/BTR/Radiology/01_General.mp4";
  const resolved = resolveBTRPlayableUrl(fileUrl);
  assert.equal(resolved, "/Users/anupam/Downloads/BTR/Radiology/01_General.mp4");

  // 5. When running in Tauri environment, delegates to convertFileSrc
  const origWindow = (globalThis as unknown as { window?: unknown }).window;
  try {
    (globalThis as unknown as { window: unknown }).window = {
      isTauri: true,
      __TAURI_INTERNALS__: {
        convertFileSrc: (p: string) => `http://asset.localhost/${encodeURIComponent(p)}`,
      },
    };
    const tauriResolved = resolveBTRPlayableUrl("/Users/anupam/Downloads/BTR/Anatomy_annotated.pdf");
    assert.equal(tauriResolved, "http://asset.localhost/%2FUsers%2Fanupam%2FDownloads%2FBTR%2FAnatomy_annotated.pdf");
  } finally {
    (globalThis as unknown as { window?: unknown }).window = origWindow;
  }
});

test("BTR Video Playback: createBTRVideoPlayerSrc sets notWebReady=true for local disk files", () => {
  const orthoSubject = CORE_BTR_SUBJECTS.find((s) => s.id === "orthopedics")!;
  const localVideo: BTRLocalMediaFile = {
    id: "vid-1",
    filename: "Orthopedics Lecture 01.mkv",
    fullPath: "/Users/anupam/Downloads/BTR/Orthopedics/Orthopedics Lecture 01.mkv",
    relativePath: "Orthopedics/Orthopedics Lecture 01.mkv",
    kind: "video",
    matchedSubjectId: "orthopedics",
    lectureNumber: 1,
    title: "Fractures and Epiphyseal Injuries",
    sizeBytes: 850 * 1024 * 1024,
  };

  const playerSrc = createBTRVideoPlayerSrc(localVideo, orthoSubject, "/Users/anupam/Downloads/BTR/Orthopedics.pdf");

  // Local disk files must flag notWebReady so Argus routes them to native hardware engine (MPVKit / AVPlayer)
  assert.equal(playerSrc.notWebReady, true);
  assert.equal(playerSrc.url, "/Users/anupam/Downloads/BTR/Orthopedics/Orthopedics Lecture 01.mkv");
  assert.equal(playerSrc.title, "Fractures and Epiphyseal Injuries");
  assert.ok(playerSrc.historyUrl?.includes("btrSubject=orthopedics"));
});

test("BTR Video Playback: createBTRVideoPlayerSrc keeps web-ready for blob URLs", () => {
  const radSubject = CORE_BTR_SUBJECTS.find((s) => s.id === "radiology")!;
  const blobVideo: BTRLocalMediaFile = {
    id: "vid-blob-1",
    filename: "Radiology Chest CT.mp4",
    fullPath: "blob:http://localhost:1420/abc-xyz",
    blobUrl: "blob:http://localhost:1420/abc-xyz",
    relativePath: "Radiology Chest CT.mp4",
    kind: "video",
    matchedSubjectId: "radiology",
    lectureNumber: 2,
    title: "Thoracic & Chest Imaging",
  };

  const playerSrc = createBTRVideoPlayerSrc(blobVideo, radSubject);

  // Blob URLs must not force notWebReady so HTML5 Webview can play directly
  assert.equal(playerSrc.notWebReady, false);
  assert.equal(playerSrc.url, "blob:http://localhost:1420/abc-xyz");
});

test("BTR Video Playback: indexBTRFiles retains blobUrl and classifies correctly", () => {
  const dummyFiles = [
    {
      name: "Dermatology Blistering Diseases.mp4",
      fullPath: "blob:http://localhost:1420/derm-1",
      blobUrl: "blob:http://localhost:1420/derm-1",
      size: 150000000,
    },
    {
      name: "Dermatology Workbook Unannotated.pdf",
      fullPath: "/Users/anupam/Downloads/BTR/Dermatology Workbook Unannotated.pdf",
      size: 50000000,
    },
  ];

  const state = indexBTRFiles(dummyFiles, "Test Folder");
  assert.equal(state.mappings.dermatology.videos.length, 1);
  assert.equal(state.mappings.dermatology.videos[0].blobUrl, "blob:http://localhost:1420/derm-1");
  assert.equal(state.mappings.dermatology.unannotatedPdf?.filename, "Dermatology Workbook Unannotated.pdf");
});
