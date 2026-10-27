import assert from "node:assert/strict";
import test from "node:test";
import { CURATED_COURSES } from "../src/lib/education/catalogs.ts";
import {
  saveStudyNote,
  getStudyNotes,
  deleteStudyNote,
  exportNotesAsMarkdown,
} from "../src/lib/education/notes.ts";

test("curated open courses catalog is populated across medical, engineering, science, and humanities", () => {
  assert.ok(CURATED_COURSES.length >= 8);
  const categories = new Set(CURATED_COURSES.map((c) => c.category));
  assert.ok(categories.has("medical"), "must include medical category");
  assert.ok(categories.has("engineering"), "must include engineering category");
  assert.ok(categories.has("science"), "must include science category");
  assert.ok(categories.has("humanities"), "must include humanities category");

  for (const course of CURATED_COURSES) {
    assert.ok(course.id, "course must have id");
    assert.ok(course.title, "course must have title");
    assert.ok(course.provider, "course must have provider");
    assert.ok(course.feedUrl.startsWith("http"), "feedUrl must be a valid URL");
  }
});

test("study notes operations and markdown export", () => {
  const note = saveStudyNote({
    itemId: "test-lecture-1",
    itemTitle: "Cardiovascular Physiology",
    timestampSec: 320,
    timestampLabel: "05:20",
    markdown: "Ventricular depolarization creates QRS complex.",
  });

  assert.ok(note.id);
  const notes = getStudyNotes("test-lecture-1");
  assert.ok(notes.some((n) => n.id === note.id));

  const md = exportNotesAsMarkdown(notes);
  assert.ok(md.includes("Cardiovascular Physiology"));
  assert.ok(md.includes("05:20"));
  assert.ok(md.includes("Ventricular depolarization"));

  deleteStudyNote(note.id);
  const afterDelete = getStudyNotes("test-lecture-1");
  assert.ok(!afterDelete.some((n) => n.id === note.id));
});
