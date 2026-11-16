import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanLectureTitle,
  scanLocalCourseFolder,
  type LocalFileEntry,
} from "../src/lib/education/local-course-scanner";
import {
  parseTimestampToSeconds,
  parseSubtitleText,
  calculateTranscriptStats,
} from "../src/lib/education/local-whisper-ingest";
import { LocalCourseSearchIndex } from "../src/lib/education/local-semantic-search";
import { extractMathFromBlackboardText } from "../src/lib/education/local-slide-ocr";
import { localAcademicSeederManager } from "../src/lib/education/local-academic-seeder";

test("local course scanner correctly parses lecture numbers and cleans titles", () => {
  const t1 = cleanLectureTitle("01 - Introduction to Deep Learning 1080p x264.mp4");
  assert.equal(t1.lectureNumber, 1);
  assert.equal(t1.title, "Introduction to Deep Learning");

  const t2 = cleanLectureTitle("Lecture 14 SVD and Projections.mkv");
  assert.equal(t2.lectureNumber, 14);
  assert.equal(t2.title, "SVD and Projections");

  const t3 = cleanLectureTitle("L03_Graph_Neural_Networks.webm");
  assert.equal(t3.lectureNumber, 3);
  assert.equal(t3.title, "Graph Neural Networks");
});

test("local course scanner maps folder and pairs sidecar subtitles", () => {
  const files: LocalFileEntry[] = [
    { name: "01 - Linear Equations.mp4", path: "/courses/18.06/01.mp4" },
    {
      name: "01 - Linear Equations.vtt",
      path: "/courses/18.06/01.vtt",
      content: "WEBVTT\n\n00:00:10.000 --> 00:00:25.000\nGilbert Strang introduces the column picture.",
    },
    { name: "02 - Matrix Multiplication.mp4", path: "/courses/18.06/02.mp4" },
  ];

  const course = scanLocalCourseFolder("MIT 18.06", files, {
    instructor: "Prof. Gilbert Strang",
  });

  assert.equal(course.lectures.length, 2);
  assert.equal(course.lectures[0].lectureNumber, 1);
  assert.ok(course.lectures[0].videoUrl.startsWith("file://"));
  assert.ok(course.lectures[0].transcript && course.lectures[0].transcript.length === 1);
  assert.equal(course.lectures[0].transcript[0].startSec, 10);
});

test("local whisper ingest parses SRT, VTT, and Whisper JSON accurately", () => {
  assert.equal(parseTimestampToSeconds("01:02:03.500"), 3723.5);
  assert.equal(parseTimestampToSeconds("05:30"), 330);

  const srt = `1\n00:00:05,000 --> 00:00:12,000\nBackpropagation is the backbone of deep learning.\n`;
  const cues = parseSubtitleText(srt);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].startSec, 5);
  assert.equal(cues[0].endSec, 12);
  assert.equal(cues[0].text, "Backpropagation is the backbone of deep learning.");

  const stats = calculateTranscriptStats(cues);
  assert.equal(stats.totalWords, 7);
});

test("local semantic search finds dialogue and concepts with timestamped seeks", () => {
  const course = scanLocalCourseFolder("MIT 18.06", [
    {
      name: "01 - Linear Equations.mp4",
      path: "/courses/01.mp4",
    },
    {
      name: "01 - Linear Equations.vtt",
      path: "/courses/01.vtt",
      content: "WEBVTT\n\n00:05:00.000 --> 00:05:30.000\nThe nullspace of matrix A contains all vectors x such that Ax = 0.",
    },
  ]);

  const index = new LocalCourseSearchIndex([course]);
  const results = index.search("nullspace of matrix");
  assert.ok(results.length > 0);
  assert.equal(results[0].timestampSec, 300);
  assert.match(results[0].snippet, /nullspace/i);
});

test("blackboard OCR parses mathematical formulas into clean LaTeX", () => {
  const ocr = extractMathFromBlackboardText("Here we see the SVD formula where A = U Sigma V^T", 450);
  assert.equal(ocr.timestampSec, 450);
  assert.ok(ocr.latexFormula && ocr.latexFormula.includes("\\Sigma"));
  assert.match(ocr.detectedTitle, /Singular Value Decomposition/i);
});

test("local academic seeder manager registers target and records upload ratio", () => {
  const record = localAcademicSeederManager.registerSeedingTarget({
    courseId: "mit-1806-local",
    courseTitle: "MIT 18.06 Linear Algebra",
    infoHash: "7a92847102938471928374910283749182739481",
    localPath: "/courses/18.06",
    totalSizeBytes: 1_000_000,
  });

  assert.equal(record.isSeeding, true);
  localAcademicSeederManager.recordUpload("mit-1806-local", 500_000);

  const status = localAcademicSeederManager.getCourseSeedingStatus("mit-1806-local");
  assert.equal(status?.uploadedBytes, 500_000);
  assert.equal(status?.ratio, 0.5);
});
