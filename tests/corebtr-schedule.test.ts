import test from "node:test";
import assert from "node:assert/strict";

import {
  CORE_BTR_SUBJECTS,
  CORE_BTR_PHASES,
  CORE_BTR_SUPER_VOLATILES,
  calculateExamCountdowns,
  calculateOverallReadiness,
  updateBTRSubjectStatus,
  loadBTRSubjectProgress,
  type BTRSubjectProgress,
} from "../src/lib/education/corebtr-schedule.ts";

import {
  classifyBTRFile,
  indexBTRFiles,
  createBTRVideoPlayerSrc,
} from "../src/lib/education/btr-local-library.ts";

test("CoreBTR Schedule: loads all 19 medical subjects categorized into 4 systemic blocks", () => {
  assert.equal(CORE_BTR_SUBJECTS.length, 19, "Must contain all 19 NEET-PG medical subjects");

  const categories = new Set(CORE_BTR_SUBJECTS.map((s) => s.category));
  assert.ok(categories.has("Pre-Clinical"));
  assert.ok(categories.has("Para-Clinical"));
  assert.ok(categories.has("Short Clinical"));
  assert.ok(categories.has("Long Clinical"));

  const anatomy = CORE_BTR_SUBJECTS.find((s) => s.id === "anatomy");
  assert.ok(anatomy);
  assert.equal(anatomy.shortCode, "ANAT");
  assert.ok(anatomy.highYieldPytCount > 0);
  assert.ok(anatomy.pyramidTiers.tier1MustKnow.length > 0);
});

test("CoreBTR Schedule: defines 4 structured master phases", () => {
  assert.equal(CORE_BTR_PHASES.length, 4);
  const phaseIds = CORE_BTR_PHASES.map((p) => p.id);
  assert.deepEqual(phaseIds, [
    "phase1_foundation",
    "phase2_bootcamp",
    "phase3_sprint20",
    "phase4_blitz7",
  ]);
});

test("CoreBTR Schedule: computes countdowns to NEET-PG 2027 and INI-CET May 2027", () => {
  const mockNow = new Date("2026-11-17T00:00:00+05:30");
  const countdowns = calculateExamCountdowns(mockNow);

  assert.ok(countdowns.neetPg.days > 200, "NEET-PG 2027 should be >200 days away from late 2026");
  assert.ok(countdowns.iniCetMay.days > 150, "INI-CET May 2027 should be >150 days away from late 2026");
  assert.equal(countdowns.neetPg.targetDateStr, "June 20, 2027");
  assert.equal(countdowns.iniCetMay.targetDateStr, "May 16, 2027");
});

test("CoreBTR Schedule: computes readiness percentage from subject progress map", () => {
  const sampleMap: Record<string, BTRSubjectProgress> = {};
  for (const s of CORE_BTR_SUBJECTS) {
    sampleMap[s.id] = {
      subjectId: s.id,
      status: "unread",
      hoursSpent: 0,
      btrWorkbookPagesCompleted: 0,
      totalWorkbookPages: 50,
      flashcardsReviewed: 0,
      qbankAccuracyPercent: 0,
    };
  }

  const initial = calculateOverallReadiness(sampleMap);
  assert.equal(initial.completionPercentage, 0);
  assert.equal(initial.unreadCount, 19);

  // Mark 5 as mastered and 5 as btr_annotated
  CORE_BTR_SUBJECTS.slice(0, 5).forEach((s) => {
    sampleMap[s.id].status = "mastered";
    sampleMap[s.id].hoursSpent = 10;
  });
  CORE_BTR_SUBJECTS.slice(5, 10).forEach((s) => {
    sampleMap[s.id].status = "btr_annotated";
    sampleMap[s.id].hoursSpent = 8;
  });

  const updated = calculateOverallReadiness(sampleMap);
  assert.equal(updated.masteredCount, 5);
  assert.equal(updated.annotatedCount, 5);
  assert.ok(updated.completionPercentage > 35 && updated.completionPercentage < 55);
  assert.equal(updated.totalHoursLogged, 90);
});

test("CoreBTR Local Library: classifies videos, annotated and unannotated PDF workbooks", () => {
  // Test video classification
  const video = classifyBTRFile(
    "01_Anatomy_UpperLimb_BrachialPlexus_1080p.mp4",
    "/Volumes/Storage/BTR 2027/Anatomy/01_Anatomy_UpperLimb_BrachialPlexus_1080p.mp4"
  );
  assert.ok(video);
  assert.equal(video.kind, "video");
  assert.equal(video.matchedSubjectId, "anatomy");
  assert.equal(video.lectureNumber, 1);

  // Test unannotated workbook PDF
  const unannotated = classifyBTRFile(
    "BTR_Pathology_Unannotated_Workbook.pdf",
    "/Volumes/Storage/BTR 2027/Pathology/BTR_Pathology_Unannotated_Workbook.pdf"
  );
  assert.ok(unannotated);
  assert.equal(unannotated.kind, "pdf_unannotated");
  assert.equal(unannotated.matchedSubjectId, "pathology");

  // Test annotated master solution PDF
  const annotated = classifyBTRFile(
    "Pharmacology_Annotated_Notes_Dr_Zainab_Vora.pdf",
    "/Volumes/Storage/BTR 2027/Pharmacology/Pharmacology_Annotated_Notes_Dr_Zainab_Vora.pdf"
  );
  assert.ok(annotated);
  assert.equal(annotated.kind, "pdf_annotated");
  assert.equal(annotated.matchedSubjectId, "pharmacology");
});

test("CoreBTR Local Library: indexes and organizes raw file hierarchy into subject mappings", () => {
  const fileEntries = [
    { name: "Anat_L01.mp4", fullPath: "/BTR/Anatomy/Anat_L01.mp4" },
    { name: "Anat_L02.mp4", fullPath: "/BTR/Anatomy/Anat_L02.mp4" },
    { name: "Anatomy_Unannotated_Workbook.pdf", fullPath: "/BTR/Anatomy/Anatomy_Unannotated_Workbook.pdf" },
    { name: "Anatomy_Annotated_Notes.pdf", fullPath: "/BTR/Anatomy/Anatomy_Annotated_Notes.pdf" },
    { name: "Biochem_Metabolism_L01.mkv", fullPath: "/BTR/Biochem/Biochem_Metabolism_L01.mkv" },
    { name: "OBG_CTG_Decelerations_L01.mp4", fullPath: "/BTR/OBG/OBG_CTG_Decelerations_L01.mp4" },
    { name: "Surgery_Trauma_ATLS.mp4", fullPath: "/BTR/Surgery/Surgery_Trauma_ATLS.mp4" },
  ];

  const library = indexBTRFiles(fileEntries, "Test BTR Directory");

  assert.equal(library.totalVideosFound, 5);
  assert.equal(library.totalPdfsFound, 2);
  assert.equal(library.subjectsWithVideosCount, 4); // Anatomy, Biochem, OBG, Surgery

  const anatMapping = library.mappings.anatomy;
  assert.ok(anatMapping);
  assert.equal(anatMapping.videos.length, 2);
  assert.ok(anatMapping.unannotatedPdf);
  assert.ok(anatMapping.annotatedPdf);
});

test("CoreBTR Local Library: creates valid PlayerSrc for native zero-latency player", () => {
  const anatSubject = CORE_BTR_SUBJECTS.find((s) => s.id === "anatomy")!;
  const video = classifyBTRFile("Anat_L01.mp4", "/BTR/Anatomy/Anat_L01.mp4")!;

  const playerSrc = createBTRVideoPlayerSrc(
    video,
    anatSubject,
    "/BTR/Anatomy/Anatomy_Unannotated_Workbook.pdf"
  );

  assert.ok(playerSrc.url.startsWith("file://"));
  assert.equal(playerSrc.meta.type, "other");
  assert.ok(playerSrc.title.length > 0);
  assert.ok(playerSrc.subtitle?.includes("Core BTR 2027"));
  assert.ok(playerSrc.historyUrl?.includes("companionPdf="), "Companion PDF path should be attached for slide syncing");
});
