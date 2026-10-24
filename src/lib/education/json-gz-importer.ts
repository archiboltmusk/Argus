import { gunzipSync, strFromU8 } from "fflate";
import { importQBankPack } from "./qbank-store";
import { importNotesFromJson } from "./notes";

export type EducationalJsonImportResult = {
  success: boolean;
  type: "qbank" | "notes" | "unknown";
  count: number;
  title?: string;
  error?: string;
};

/**
 * Universal decompressor for plain text, ArrayBuffer, Uint8Array or Blob.
 * Handles both plain UTF-8 JSON / JSONL and Gzip-compressed (.json.gz, .gz).
 */
export async function readEducationalFileText(file: File | Blob | ArrayBuffer | Uint8Array | string): Promise<string> {
  if (typeof file === "string") {
    return file;
  }

  let buffer: ArrayBuffer;
  let filename = "";

  if (file instanceof File) {
    filename = file.name.toLowerCase();
    buffer = await file.arrayBuffer();
  } else if (file instanceof Blob) {
    buffer = await file.arrayBuffer();
  } else if (file instanceof Uint8Array) {
    buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  } else {
    buffer = file;
  }

  const u8 = new Uint8Array(buffer);

  // Check gzip magic bytes: 0x1f, 0x8b
  const isGzip = (u8.length >= 2 && u8[0] === 0x1f && u8[1] === 0x8b) || filename.endsWith(".gz") || filename.endsWith(".json.gz");

  if (isGzip) {
    try {
      const decompressed = gunzipSync(u8);
      return strFromU8(decompressed);
    } catch (e: any) {
      // Fallback: try Native browser DecompressionStream if available
      if (typeof DecompressionStream !== "undefined") {
        try {
          const ds = new DecompressionStream("gzip");
          const stream = new Response(u8).body?.pipeThrough(ds);
          if (stream) {
            const resp = new Response(stream);
            return await resp.text();
          }
        } catch {
          // ignore
        }
      }
      throw new Error(`Failed to decompress .json.gz file: ${e?.message || e}`);
    }
  }

  return strFromU8(u8);
}

/**
 * Ingests JSON or .json.gz file and routes to QBank or Study Notes / Flashcards based on contents.
 */
export async function importEducationalFile(
  fileOrText: File | Blob | ArrayBuffer | Uint8Array | string,
  customTitle?: string
): Promise<EducationalJsonImportResult> {
  try {
    const text = await readEducationalFileText(fileOrText);
    const trimmed = text.trim();

    if (!trimmed) {
      return { success: false, type: "unknown", count: 0, error: "Empty file or payload." };
    }

    // Check if the payload is obviously a Study Notes array or notes object
    let isNotesFormat = false;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (first && (first.timestampSec !== undefined || first.markdown !== undefined || first.snapshotDataUrl !== undefined)) {
          isNotesFormat = true;
        }
      } else if (parsed && Array.isArray(parsed.notes)) {
        isNotesFormat = true;
      }
    } catch {
      // not JSON or is JSONL
    }

    if (isNotesFormat) {
      const notesRes = importNotesFromJson(trimmed);
      if (notesRes.success && notesRes.count > 0) {
        return {
          success: true,
          type: "notes",
          count: notesRes.count,
          title: customTitle || "Study Notes Deck",
        };
      }
    }

    // Try QBank first (handles polyglot arrays, MedQA, question objects, JSONL, archiboltmusk/qbank)
    const qbankRes = importQBankPack(trimmed, customTitle);
    if (qbankRes.success && qbankRes.pack && qbankRes.pack.questions.length > 0) {
      return {
        success: true,
        type: "qbank",
        count: qbankRes.pack.totalQuestions,
        title: qbankRes.pack.title,
      };
    }

    // Try Notes / Flashcards / Image Occlusion if not already tried
    const notesRes = importNotesFromJson(trimmed);
    if (notesRes.success && notesRes.count > 0) {
      return {
        success: true,
        type: "notes",
        count: notesRes.count,
        title: customTitle || "Study Notes Deck",
      };
    }

    return {
      success: false,
      type: "unknown",
      count: 0,
      error: qbankRes.error || notesRes.error || "Unrecognized educational JSON schema.",
    };
  } catch (err: any) {
    return {
      success: false,
      type: "unknown",
      count: 0,
      error: err?.message || "Failed to parse file.",
    };
  }
}
