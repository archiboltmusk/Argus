import type { StudyNote } from "./types";

/**
 * Generates an Anki importable deck format.
 * Includes Support for Image Occlusion masks, High-Yield tags, and direct timestamp back-links.
 */

export function generateAnkiDeckPackage(notes: readonly StudyNote[], deckName = "Argus Medical High-Yield"): {
  textData: string;
  filename: string;
} {
  const safeDeckName = deckName.replace(/["\t\r\n]/g, " ").trim() || "Argus High-Yield";
  const lines: string[] = [
    "#separator:tab",
    "#html:true",
    `#deck:${safeDeckName}`,
    "#notetype:Argus Socratic Recall",
    "#tags column:6",
  ];

  for (const note of notes) {
    // 1. Front Field (Question / Diagram with Occlusions)
    let front = `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px;">`;
    front += `<div style="font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 6px;">[${escapeField(note.timestampLabel)}] ${escapeField(note.itemTitle)}</div>`;

    if (note.snapshotDataUrl) {
      front += `<div style="position: relative; display: inline-block; max-width: 100%; border-radius: 8px; overflow: hidden;">`;
      front += `<img src="${note.snapshotDataUrl}" style="max-height: 380px; width: auto; display: block;" />`;

      // Draw Occlusion Masks on Front
      if (note.occlusions && note.occlusions.length > 0) {
        note.occlusions.forEach((box, i) => {
          front += `<div style="position: absolute; left: ${box.xPct}%; top: ${box.yPct}%; width: ${box.wPct}%; height: ${box.hPct}%; background: #f59e0b; border: 1px solid #d97706; color: #000; font-weight: bold; font-size: 11px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">[${i + 1}]</div>`;
        });
      }
      front += `</div>`;
    }

    front += `<div style="margin-top: 10px; font-weight: 500;">Active Recall Prompt: What is the core takeaway or unmask the labels above.</div>`;
    front += `</div>`;

    // 2. Back Field (Answer & Unmasked Diagram)
    let back = `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px;">`;
    if (note.snapshotDataUrl) {
      back += `<div style="position: relative; display: inline-block; max-width: 100%; border-radius: 8px; overflow: hidden;">`;
      back += `<img src="${note.snapshotDataUrl}" style="max-height: 380px; width: auto; display: block;" />`;
      // Draw revealed green boxes on back
      if (note.occlusions && note.occlusions.length > 0) {
        note.occlusions.forEach((box) => {
          back += `<div style="position: absolute; left: ${box.xPct}%; top: ${box.yPct}%; width: ${box.wPct}%; height: ${box.hPct}%; background: rgba(16, 185, 129, 0.2); border: 2px solid #10b981;"></div>`;
        });
      }
      back += `</div>`;
    }

    back += `<div style="margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 8px; line-height: 1.5;">${escapeField(note.markdown).replace(/\n/g, "<br/>")}</div>`;
    back += `</div>`;

    // 3. Metadata fields
    const timestamp = note.timestampLabel;
    const mediaTitle = escapeField(note.itemTitle);
    const id = note.id;
    const tags = [
      "Argus",
      note.highYield ? "HighYield" : "Standard",
      note.topic ? escapeField(note.topic).replace(/\s+/g, "_") : "General",
      note.occlusions && note.occlusions.length > 0 ? "ImageOcclusion" : "TextNote",
    ].join(" ");

    // TAB separated
    lines.push([front, back, timestamp, mediaTitle, id, tags].join("\t"));
  }

  return {
    textData: lines.join("\n"),
    filename: `${safeDeckName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_anki.txt`,
  };
}

function escapeField(text: string): string {
  if (!text) return "";
  return text.replace(/\t/g, "    ").replace(/\r?\n/g, "<br/>");
}
