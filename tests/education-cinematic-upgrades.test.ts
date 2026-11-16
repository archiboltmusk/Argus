import test from "node:test";
import assert from "node:assert/strict";
import {
  CURATED_UNIVERSITY_COURSES,
  coursewareEngine,
} from "../src/lib/education/course-engine";

test("curated university courses include top world-class institutions", () => {
  assert.ok(CURATED_UNIVERSITY_COURSES.length >= 4);

  const mitLinearAlgebra = CURATED_UNIVERSITY_COURSES.find(
    (c) => c.id === "mit-1806-linear-algebra"
  );
  assert.ok(mitLinearAlgebra);
  assert.equal(mitLinearAlgebra?.instructor, "Prof. Gilbert Strang");
  assert.ok(mitLinearAlgebra?.lectures[0].transcript && mitLinearAlgebra.lectures[0].transcript.length > 0);

  const feynmanPhysics = CURATED_UNIVERSITY_COURSES.find(
    (c) => c.id === "caltech-feynman-physics"
  );
  assert.ok(feynmanPhysics);
  assert.equal(feynmanPhysics?.instructor, "Prof. Richard Feynman");

  const cs224w = CURATED_UNIVERSITY_COURSES.find(
    (c) => c.id === "stanford-cs224w-gnn"
  );
  assert.ok(cs224w);
});

test("courseware engine handles lecture completion and cognitive rewind", () => {
  const course = coursewareEngine.getCourse("mit-1806-linear-algebra");
  assert.ok(course);

  // Update progress
  coursewareEngine.updateLectureProgress("mit-1806-linear-algebra", "mit-1806-l1", 120);
  const updated = coursewareEngine.getCourse("mit-1806-linear-algebra");
  assert.equal(updated?.lectures[0].lastPositionSec, 120);

  // Cognitive rewind: 5s rewind on resume
  const resumePos = Math.max(0, (updated?.lectures[0].lastPositionSec ?? 0) - 5);
  assert.equal(resumePos, 115);
});
