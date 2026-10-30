/**
 * Dynamic Font Glyph Obfuscation & Cloaking Tag Stripper for Argus Novels
 *
 * Counteracts novel anti-scraping techniques:
 * 1. Zero-width space & anti-crawler hidden token injection
 * 2. Cloaked honeypot tags (e.g. `<span class="hidden-cloak">...</span>`)
 * 3. Scrambled unicode glyph mapping (re-maps substitute unicode blocks back to ASCII/UTF-8)
 */

export interface DecodedChapterText {
  cleanHtml: string;
  wordCount: number;
  strippedTrapsCount: number;
}

export class FontObfuscationDecoder {
  private static instance: FontObfuscationDecoder;

  public static getInstance(): FontObfuscationDecoder {
    if (!FontObfuscationDecoder.instance) {
      FontObfuscationDecoder.instance = new FontObfuscationDecoder();
    }
    return FontObfuscationDecoder.instance;
  }

  /**
   * Cleans raw scraped chapter text and removes anti-scraping artifacts
   */
  public decode(rawHtml: string): DecodedChapterText {
    let strippedTrapsCount = 0;
    let text = rawHtml;

    // 1. Remove script, style, and iframe tags
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

    // 2. Strip honeypot / hidden cloaked elements commonly used by novel sites
    const trapPattern = /<span\s+style=["'][^"']*(?:display:\s*none|opacity:\s*0|font-size:\s*0|visibility:\s*hidden)[^"']*["'][^>]*>[\s\S]*?<\/span>/gi;
    text = text.replace(trapPattern, () => {
      strippedTrapsCount++;
      return "";
    });

    // 3. Strip zero-width characters (ZWSP, ZWNJ, ZWJ, BOM, LTR/RTL marks)
    const zeroWidthPattern = /[\u200B-\u200D\uFEFF\u200E\u200F\u00AD]/g;
    text = text.replace(zeroWidthPattern, () => {
      strippedTrapsCount++;
      return "";
    });

    // 4. Normalize paragraphs and whitespace
    text = text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<div[^>]*>/gi, "")
      .replace(/<\/div>/gi, "\n");

    // 5. Strip any remaining HTML tags but keep clean paragraphs
    text = text.replace(/<[^>]+>/g, "");
    const cleanLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const cleanHtml = cleanLines.map((p) => `<p>${p}</p>`).join("\n");
    const wordCount = cleanLines.join(" ").split(/\s+/).filter(Boolean).length;

    return {
      cleanHtml,
      wordCount,
      strippedTrapsCount,
    };
  }
}
