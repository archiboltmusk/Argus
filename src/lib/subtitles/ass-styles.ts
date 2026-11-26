export type AssStyleDef = {
  name: string;
  fontName?: string;
  fontSize?: number;
  primaryColor?: string;
  outlineColor?: string;
  bold?: boolean;
  italic?: boolean;
  alignment?: number;
};

export type AssCueStyle = {
  alignment?: number;
  color?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
};

/**
 * Converts ASS/SSA hex color (&HAABBGGRR or &HBBGGRR) to CSS color string.
 */
export function assColorToCss(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const clean = raw.trim().replace(/^&H/i, "").replace(/&$/, "");
  if (!/^[0-9a-fA-F]{6,8}$/.test(clean)) return undefined;
  const padded = clean.padStart(8, "0");
  const aa = parseInt(padded.slice(0, 2), 16);
  const bb = parseInt(padded.slice(2, 4), 16);
  const gg = parseInt(padded.slice(4, 6), 16);
  const rr = parseInt(padded.slice(6, 8), 16);
  // ASS alpha 00 = opaque, FF = transparent
  if (aa === 0) {
    return `#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;
  }
  const alpha = Math.max(0, Math.min(1, 1 - aa / 255));
  return `rgba(${rr}, ${gg}, ${bb}, ${Number(alpha.toFixed(2))})`;
}

/**
 * Parses [V4+ Styles] / [V4 Styles] section from an ASS/SSA script.
 */
export function parseAssStyles(scriptText: string): Map<string, AssStyleDef> {
  const styles = new Map<string, AssStyleDef>();
  const match = scriptText.match(/\[V4\+? Styles\]/i);
  if (!match || match.index === undefined) return styles;
  const rest = scriptText.slice(match.index);
  const nextSection = rest.slice(match[0].length).search(/\n\[[^\]]+\]/);
  const block = nextSection >= 0 ? rest.slice(0, match[0].length + nextSection) : rest;

  let format: string[] | null = null;
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("Format:")) {
      format = line
        .slice(7)
        .split(",")
        .map((s) => s.trim().toLowerCase());
      continue;
    }
    if (!line.startsWith("Style:") || !format) continue;
    const parts = line.slice(6).split(",").map((s) => s.trim());
    const get = (field: string) => {
      const idx = format!.indexOf(field);
      return idx >= 0 && idx < parts.length ? parts[idx] : undefined;
    };
    const name = get("name");
    if (!name) continue;
    const fontSizeNum = Number(get("fontsize"));
    const alignNum = Number(get("alignment"));
    styles.set(name, {
      name,
      fontName: get("fontname") || undefined,
      fontSize: Number.isFinite(fontSizeNum) && fontSizeNum > 0 ? fontSizeNum : undefined,
      primaryColor: assColorToCss(get("primarycolour")),
      outlineColor: assColorToCss(get("outlinecolour")),
      bold: get("bold") === "-1" || get("bold") === "1",
      italic: get("italic") === "-1" || get("italic") === "1",
      alignment: Number.isFinite(alignNum) && alignNum >= 1 && alignNum <= 9 ? alignNum : undefined,
    });
  }
  return styles;
}

/**
 * Extracts inline override tags (\an, \b, \i, \c, \1c, \fs) merged with base style.
 */
export function extractAssDialogueStyle(
  rawDialogueText: string,
  baseStyle?: AssStyleDef,
): AssCueStyle | undefined {
  const out: AssCueStyle = {};
  if (baseStyle) {
    if (baseStyle.alignment !== undefined) out.alignment = baseStyle.alignment;
    if (baseStyle.primaryColor) out.color = baseStyle.primaryColor;
    if (baseStyle.fontSize !== undefined) out.fontSize = baseStyle.fontSize;
    if (baseStyle.bold) out.bold = true;
    if (baseStyle.italic) out.italic = true;
  }

  const tagBlocks = rawDialogueText.match(/\{[^}]*\}/g);
  if (tagBlocks) {
    for (const block of tagBlocks) {
      const an = block.match(/\\an([1-9])/);
      if (an) out.alignment = Number(an[1]);
      const bold = block.match(/\\b([01])/);
      if (bold) out.bold = bold[1] === "1";
      const italic = block.match(/\\i([01])/);
      if (italic) out.italic = italic[1] === "1";
      const color = block.match(/\\(?:1?c)(&H[0-9a-fA-F]{6,8}&?)/i);
      if (color) {
        const css = assColorToCss(color[1]);
        if (css) out.color = css;
      }
      const fs = block.match(/\\fs(\d+(?:\.\d+)?)/);
      if (fs) {
        const size = Number(fs[1]);
        if (Number.isFinite(size) && size > 0) out.fontSize = size;
      }
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}
