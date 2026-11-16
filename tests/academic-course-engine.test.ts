import assert from "node:assert/strict";
import test from "node:test";
import {
  CoursewareEngine,
  CURATED_STANFORD_COURSES,
} from "../src/lib/education/course-engine";

test("CoursewareEngine: loads curated Stanford course syllabi", () => {
  const engine = new CoursewareEngine();
  const courses = engine.getAllCourses();

  assert.ok(courses.length >= 2, "Expected at least 2 curated courses");

  const cs224w = courses.find((c) => c.id === "stanford-cs224w-gnn");
  assert.ok(cs224w, "CS224W should be in course catalog");
  assert.equal(cs224w?.institution, "Stanford University");
  assert.ok(cs224w?.lectures.length >= 3, "Expected multiple lectures in CS224W");
});

test("CoursewareEngine: tracks lecture progress and auto-advances active lecture target", () => {
  const engine = new CoursewareEngine();
  const courseId = "stanford-cs224w-gnn";
  const lectureId = "cs224w-l1";

  // Simulate watching 15 minutes of lecture 1
  engine.updateLectureProgress(courseId, lectureId, 900);

  const target = engine.getCourseResumeTarget(courseId);
  assert.ok(target);
  assert.equal(target?.lecture.id, lectureId);
  // 5-second cognitive rewind
  assert.equal(target?.resumeSec, 895);

  // Complete lecture 1 (> 90% of 4620s = 4158s)
  engine.updateLectureProgress(courseId, lectureId, 4300);

  const advancedTarget = engine.getCourseResumeTarget(courseId);
  assert.ok(advancedTarget);
  // Should auto-advance to Lecture 2
  assert.equal(advancedTarget?.lecture.id, "cs224w-l2");
});

test("CoursewareEngine: preserves mathematical concept notes with timestamp links", () => {
  const engine = new CoursewareEngine();
  const courseId = "stanford-cs224w-gnn";
  const lectureId = "cs224w-l6";

  engine.addConceptNote(courseId, lectureId, {
    timestampSec: 3300,
    title: "GraphSAGE Loss Function",
    note: "Unsupervised random walk loss pushing co-occurring nodes together.",
  });

  const course = engine.getCourse(courseId);
  const lecture = course?.lectures.find((l) => l.id === lectureId);
  assert.ok(lecture);

  const addedNote = lecture?.conceptNotes.find((n) => n.timestampSec === 3300);
  assert.ok(addedNote);
  assert.equal(addedNote?.title, "GraphSAGE Loss Function");
});
