import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync, strToU8 } from "fflate";
import { readEducationalFileText, importEducationalFile } from "../src/lib/education/json-gz-importer";
import { getAllPacks } from "../src/lib/education/qbank-store";
import { getStudyNotes } from "../src/lib/education/notes";

test("educational json.gz decompressor & importer", async (t) => {
  await t.test("decompresses and ingests gzipped QBank test pack", async () => {
    const samplePack = {
      tests: [
        {
          id: "test_anaesthesia_01",
          title: "Pre-Anaesthetic Evaluation Drill",
          questions: [
            {
              id: "q101",
              text: "Which anesthetic agent is preferred in patients with severe cardiac tamponade?",
              options: [
                { label: "A", text: "Propofol", correct: false },
                { label: "B", text: "Ketamine", correct: true },
                { label: "C", text: "Thiopental", correct: false },
                { label: "D", text: "Etomidate", correct: false },
              ],
              correct_answer: "B. Ketamine",
              explanation: "Ketamine maintains systemic vascular resistance and heart rate via sympathetic activation.",
            },
          ],
        },
      ],
    };

    const jsonStr = JSON.stringify(samplePack);
    const compressed = gzipSync(strToU8(jsonStr));

    // 1. Test readEducationalFileText on Uint8Array
    const decompressed = await readEducationalFileText(compressed);
    assert.ok(decompressed.includes("Ketamine"));

    // 2. Test importEducationalFile directly on gzip payload
    const res = await importEducationalFile(compressed, "Cardiac Tamponade Prep");
    assert.equal(res.success, true);
    assert.equal(res.type, "qbank");
    assert.equal(res.count, 1);

    const packs = getAllPacks();
    const imported = packs.find((p) => p.title.includes("Cardiac Tamponade Prep") || p.title.includes("Pre-Anaesthetic"));
    assert.ok(imported, "Pack should be saved in local QBank store");
    assert.equal(imported.questions[0].correctIndex, 1);
  });

  await t.test("decompresses and ingests gzipped Study Notes deck", async () => {
    const sampleNotes = [
      {
        id: "note_gz_01",
        itemId: "cardiology_101",
        itemTitle: "Aortic Stenosis Murmur",
        timestampSec: 142,
        timestampLabel: "02:22",
        markdown: "Crescendo-decrescendo systolic ejection murmur at the right upper sternal border radiating to carotids.",
        highYield: true,
      },
    ];

    const jsonStr = JSON.stringify(sampleNotes);
    const compressed = gzipSync(strToU8(jsonStr));

    const res = await importEducationalFile(compressed, "Cardiac Auscultation Notes");
    assert.equal(res.success, true);
    assert.equal(res.type, "notes");
    assert.equal(res.count, 1);

    const notes = getStudyNotes();
    const found = notes.find((n) => n.id === "note_gz_01");
    assert.ok(found, "Note should be persisted in study notes");
    assert.equal(found.timestampLabel, "02:22");
  });
});
