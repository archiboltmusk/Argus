/**
 * Instant OCR Slide, Code & Diagram Grabber
 *
 * Extracts code snippets, whiteboard formulas, and presentation slides
 * directly from video frames into formatted Markdown and LaTeX with one-click clipboard copying.
 */

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedOcrResult {
  rawText: string;
  formattedMarkdown: string;
  detectedType: "code" | "math" | "prose";
  detectedLanguage?: string;
  timestampSec: number;
  confidence: number;
}

/**
 * Detects whether extracted text is source code, mathematics, or prose,
 * and beautifies into Markdown.
 */
export function formatOcrTextToMarkdown(
  rawText: string,
  timestampSec: number = 0,
): ExtractedOcrResult {
  const clean = rawText.trim();
  const timecode = formatTimecode(timestampSec);

  // 1. Detect Math / Formulas (\frac, \sum, \int, =, \alpha, etc.)
  const isMath = /\\(?:frac|sum|int|sqrt|alpha|beta|theta|partial)|\^2|\bE\s*=\s*mc\^2\b/.test(clean);
  if (isMath) {
    const formatted = `<!-- Captured at ${timecode} -->\n$$\n${clean}\n$$`;
    return {
      rawText: clean,
      formattedMarkdown: formatted,
      detectedType: "math",
      timestampSec,
      confidence: 0.91,
    };
  }

  // 2. Detect Code syntax (keywords like def, function, const, import, let, fn, class, return)
  const isCode =
    /(?:def |function |const |import |let |fn |class |return |public |void |SELECT |FROM )/m.test(clean) ||
    /({[\s\S]*}|=>|===|!=|;)/.test(clean);

  if (isCode) {
    let lang = "text";
    if (/def |import .* from|elif |print\(/.test(clean)) lang = "python";
    else if (/fn |let mut |impl |pub fn/.test(clean)) lang = "rust";
    else if (/const |let |interface |function|console\.log/.test(clean)) lang = "typescript";
    else if (/SELECT |FROM |WHERE |JOIN /i.test(clean)) lang = "sql";
    else if (/#include |std::|int main\(/.test(clean)) lang = "cpp";

    const formatted = `<!-- Captured at ${timecode} -->\n\`\`\`${lang}\n${clean}\n\`\`\``;
    return {
      rawText: clean,
      formattedMarkdown: formatted,
      detectedType: "code",
      detectedLanguage: lang,
      timestampSec,
      confidence: 0.94,
    };
  }

  // 3. Prose / Lecture Slide Text
  const formatted = `> **[${timecode}]**\n> ${clean.replace(/\n/g, "\n> ")}`;
  return {
    rawText: clean,
    formattedMarkdown: formatted,
    detectedType: "prose",
    timestampSec,
    confidence: 0.96,
  };
}

function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
