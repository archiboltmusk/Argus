/**
 * Lowers modern Tailwind CSS v4 output (@layer, @property, oklch, color-mix)
 * into Chromium 74-95 compatible CSS for Android System WebViews on smart
 * projectors (e.g. Portronics Beem 470, Wanbo, Magcubic HY300) and older TV sticks.
 */

const NAMED_COLORS = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [255, 255, 255, 1],
  red: [255, 0, 0, 1],
  green: [0, 128, 0, 1],
  blue: [0, 0, 255, 1],
};

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function clampUnit(v) {
  return Math.max(0, Math.min(1, v));
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
  const clamped = clampUnit(c);
  const v = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return clampByte(v * 255);
}

/**
 * Convert OKLab (L, a, b) to clamped sRGB [r, g, b] in 0..255.
 */
function oklabToSrgbBytes(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(bl)];
}

function srgbBytesToOklab([r, g, bl]) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(bl);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function parsePercentOrNumber(token, pctScale = 1) {
  const trimmed = token.trim();
  if (trimmed.endsWith("%")) {
    const n = parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(n) ? (n / 100) * pctScale : NaN;
  }
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

function parseHueDeg(token) {
  const trimmed = token.trim().toLowerCase();
  if (trimmed === "none") return 0;
  if (trimmed.endsWith("deg")) return parseFloat(trimmed.slice(0, -3)) || 0;
  if (trimmed.endsWith("rad")) return ((parseFloat(trimmed.slice(0, -3)) || 0) * 180) / Math.PI;
  if (trimmed.endsWith("turn")) return (parseFloat(trimmed.slice(0, -4)) || 0) * 360;
  if (trimmed.endsWith("grad")) return (parseFloat(trimmed.slice(0, -4)) || 0) * 0.9;
  return parseFloat(trimmed) || 0;
}

function formatRgba([r, g, b, a]) {
  const cr = clampByte(r);
  const cg = clampByte(g);
  const cb = clampByte(b);
  const ca = clampUnit(a);
  if (ca >= 0.999) return `rgb(${cr},${cg},${cb})`;
  if (ca <= 0.0005) return "rgba(0,0,0,0)";
  const alphaStr = Number(ca.toFixed(4)).toString();
  return `rgba(${cr},${cg},${cb},${alphaStr})`;
}

/**
 * Parse a concrete CSS color (oklch, #hex, rgb/rgba, named) into [r, g, b, a].
 */
export function parseCssColor(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  const lower = s.toLowerCase();
  if (lower in NAMED_COLORS) return NAMED_COLORS[lower];

  if (lower.startsWith("#")) {
    const hex = lower.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        1,
      ];
    }
    if (hex.length === 4) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        parseInt(hex[3] + hex[3], 16) / 255,
      ];
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        1,
      ];
    }
    if (hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        parseInt(hex.slice(6, 8), 16) / 255,
      ];
    }
    return null;
  }

  const oklchMatch = /^oklch\(([^)]+)\)$/i.exec(s);
  if (oklchMatch) {
    const [channelsPart, alphaPart] = oklchMatch[1].split("/");
    const parts = channelsPart.trim().split(/\s+/);
    if (parts.length < 3) return null;
    const L = parts[0].toLowerCase() === "none" ? 0 : parsePercentOrNumber(parts[0], 1);
    const C = parts[1].toLowerCase() === "none" ? 0 : parsePercentOrNumber(parts[1], 0.4);
    const H = parseHueDeg(parts[2]);
    if (!Number.isFinite(L) || !Number.isFinite(C)) return null;
    const hRad = (H * Math.PI) / 180;
    const [r, g, b] = oklabToSrgbBytes(L, C * Math.cos(hRad), C * Math.sin(hRad));
    const a = alphaPart !== undefined ? parsePercentOrNumber(alphaPart, 1) : 1;
    if (!Number.isFinite(a)) return null;
    return [r, g, b, clampUnit(a)];
  }

  const rgbMatch = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (rgbMatch) {
    const body = rgbMatch[1].trim();
    if (body.includes(",")) {
      const parts = body.split(",").map((p) => p.trim());
      if (parts.length < 3) return null;
      const r = parsePercentOrNumber(parts[0], 255);
      const g = parsePercentOrNumber(parts[1], 255);
      const b = parsePercentOrNumber(parts[2], 255);
      const a = parts[3] !== undefined ? parsePercentOrNumber(parts[3], 1) : 1;
      if (![r, g, b, a].every(Number.isFinite)) return null;
      return [clampByte(r), clampByte(g), clampByte(b), clampUnit(a)];
    }
    const [channelsPart, alphaPart] = body.split("/");
    const parts = channelsPart.trim().split(/\s+/);
    if (parts.length < 3) return null;
    const r = parsePercentOrNumber(parts[0], 255);
    const g = parsePercentOrNumber(parts[1], 255);
    const b = parsePercentOrNumber(parts[2], 255);
    const a = alphaPart !== undefined ? parsePercentOrNumber(alphaPart, 1) : 1;
    if (![r, g, b, a].every(Number.isFinite)) return null;
    return [clampByte(r), clampByte(g), clampByte(b), clampUnit(a)];
  }

  return null;
}

export function lowerOklchColors(css) {
  return css.replace(/oklch\(([^()]+)\)/gi, (full) => {
    const rgba = parseCssColor(full);
    return rgba ? formatRgba(rgba) : full;
  });
}

function splitTopLevelCommas(str) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "(") depth++;
    else if (ch === ")" && depth > 0) depth--;
    else if (ch === "," && depth === 0) {
      parts.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(str.slice(start).trim());
  return parts;
}

function parseColorMixOperand(operand, varMap) {
  let s = operand.trim();
  let weight = null;
  const pctMatch = /\s+(\d+(?:\.\d+)?|\.\d+)%$/.exec(s);
  if (pctMatch) {
    weight = parseFloat(pctMatch[1]) / 100;
    s = s.slice(0, pctMatch.index).trim();
  }
  const leadingPctMatch = /^(\d+(?:\.\d+)?|\.\d+)%\s+/.exec(s);
  if (leadingPctMatch && weight === null) {
    weight = parseFloat(leadingPctMatch[1]) / 100;
    s = s.slice(leadingPctMatch[0].length).trim();
  }

  // Resolve static var(--foo) or var(--foo, fallback)
  let resolvedVar = s;
  for (let hops = 0; hops < 4; hops++) {
    const varMatch = /^var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)$/.exec(resolvedVar);
    if (!varMatch) break;
    const mapped = varMap.get(varMatch[1]);
    if (mapped) {
      resolvedVar = mapped;
    } else if (varMatch[2]) {
      resolvedVar = varMatch[2].trim();
    } else {
      return { color: null, weight, rawColor: resolvedVar };
    }
  }

  return {
    color: parseCssColor(resolvedVar),
    weight,
    rawColor: resolvedVar,
  };
}

function mixColors(space, c1, w1, c2, w2) {
  let p1 = w1;
  let p2 = w2;
  if (p1 === null && p2 === null) {
    p1 = 0.5;
    p2 = 0.5;
  } else if (p1 === null) {
    p1 = 1 - p2;
  } else if (p2 === null) {
    p2 = 1 - p1;
  }
  const sum = p1 + p2;
  if (sum <= 0) return [0, 0, 0, 0];
  let alphaMult = 1;
  if (sum < 1) alphaMult = sum;
  const n1 = p1 / sum;
  const n2 = p2 / sum;

  const a1 = c1[3];
  const a2 = c2[3];
  const outAlpha = (n1 * a1 + n2 * a2) * alphaMult;
  if (outAlpha <= 0.0005) return [0, 0, 0, 0];

  if (space.includes("oklab") || space.includes("lab")) {
    const lab1 = srgbBytesToOklab(c1);
    const lab2 = srgbBytesToOklab(c2);
    // Premultiplied interpolation in OKLab
    const pm = n1 * a1 + n2 * a2;
    const L = (lab1[0] * n1 * a1 + lab2[0] * n2 * a2) / pm;
    const A = (lab1[1] * n1 * a1 + lab2[1] * n2 * a2) / pm;
    const B = (lab1[2] * n1 * a1 + lab2[2] * n2 * a2) / pm;
    const [r, g, b] = oklabToSrgbBytes(L, A, B);
    return [r, g, b, clampUnit(outAlpha)];
  }

  // sRGB premultiplied mix
  const pm = n1 * a1 + n2 * a2;
  const r = (c1[0] * n1 * a1 + c2[0] * n2 * a2) / pm;
  const g = (c1[1] * n1 * a1 + c2[1] * n2 * a2) / pm;
  const b = (c1[2] * n1 * a1 + c2[2] * n2 * a2) / pm;
  return [clampByte(r), clampByte(g), clampByte(b), clampUnit(outAlpha)];
}

/**
 * Unwrap CSS `@layer name { ... }` blocks and strip `@layer name;` forward declarations.
 */
export function unwrapCssLayers(css) {
  let out = "";
  let i = 0;
  const n = css.length;

  while (i < n) {
    const ch = css[i];
    // Preserve comments cleanly
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      if (end === -1) {
        out += css.slice(i);
        break;
      }
      out += css.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    if (ch === "@" && css.startsWith("@layer", i) && /[\s;{(]/.test(css[i + 6] || "")) {
      let j = i + 6;
      while (j < n && css[j] !== "{" && css[j] !== ";") {
        if (css[j] === "/" && css[j + 1] === "*") {
          const cEnd = css.indexOf("*/", j + 2);
          j = cEnd === -1 ? n : cEnd + 2;
        } else {
          j++;
        }
      }
      if (j < n && css[j] === ";") {
        // Statement like `@layer theme, base, components, utilities;` -> drop
        i = j + 1;
        continue;
      }
      if (j < n && css[j] === "{") {
        // Find matching closing brace
        let depth = 1;
        let k = j + 1;
        let inStr = null;
        while (k < n && depth > 0) {
          const c = css[k];
          if (inStr) {
            if (c === "\\" && k + 1 < n) {
              k += 2;
              continue;
            }
            if (c === inStr) inStr = null;
          } else {
            if (c === '"' || c === "'") inStr = c;
            else if (c === "/" && css[k + 1] === "*") {
              const cEnd = css.indexOf("*/", k + 2);
              k = cEnd === -1 ? n - 1 : cEnd + 1;
            } else if (c === "{") depth++;
            else if (c === "}") depth--;
          }
          k++;
        }
        const inner = css.slice(j + 1, k - 1);
        out += unwrapCssLayers(inner);
        i = k;
        continue;
      }
    }

    out += ch;
    i++;
  }

  return out;
}

/**
 * Extract initial-value declarations from `@property` blocks so browsers older than
 * Chrome 85 (which ignore `@property`) still receive valid custom-property defaults.
 */
export function extractPropertyInitialRoot(css) {
  const defaults = new Map();
  const propRegex = /@property\s+(--[a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g;
  let match;
  while ((match = propRegex.exec(css)) !== null) {
    const varName = match[1];
    const body = match[2];
    const initMatch = /initial-value\s*:\s*([^;]+)/i.exec(body);
    if (initMatch) {
      const val = initMatch[1].trim();
      if (val && val !== '""' && val !== "''") {
        defaults.set(varName, val);
      }
    }
  }
  if (defaults.size === 0) return "";
  const decls = Array.from(defaults.entries())
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return `:root,:host{${decls}}`;
}

function collectRootColorVars(css) {
  const varMap = new Map();
  const declRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+)/g;
  let m;
  while ((m = declRegex.exec(css)) !== null) {
    const name = m[1].trim();
    const val = m[2].trim();
    if (!val.includes("color-mix(") && !varMap.has(name)) {
      varMap.set(name, val);
    }
  }
  // Runtime BigPicture CSS tokens injected by bp-tokens.ts (fallback defaults for static CSS utilities)
  const runtimeDefaults = [
    ["--color-canvas", "rgb(17,18,22)"],
    ["--color-surface", "rgb(25,27,32)"],
    ["--color-elevated", "rgb(36,39,46)"],
    ["--color-raised", "rgb(48,51,60)"],
    ["--color-ink", "rgb(244,245,247)"],
    ["--color-ink-muted", "rgb(164,167,174)"],
    ["--color-ink-subtle", "rgb(142,145,152)"],
    ["--color-accent", "rgb(232,169,92)"],
    ["--color-danger", "rgb(229,72,77)"],
    ["--bp-void", "rgb(13,14,17)"],
    ["--bp-panel", "rgb(22,24,28)"],
    ["--bp-panel-2", "rgb(33,36,42)"],
    ["--bp-live", "#4ade80"],
  ];
  for (const [k, v] of runtimeDefaults) {
    if (!varMap.has(k)) varMap.set(k, v);
  }
  return varMap;
}

/**
 * Replace `color-mix(...)` calls inside property values with concrete `rgba(...)` values
 * where possible, without breaking `@supports (color:color-mix(...))` queries.
 */
export function lowerColorMix(css) {
  const varMap = collectRootColorVars(css);
  let out = "";
  let i = 0;
  const n = css.length;

  while (i < n) {
    // Do NOT rewrite inside @supports (...) header
    if (css.startsWith("@supports", i) && /[\s(]/.test(css[i + 9] || "")) {
      const braceIdx = css.indexOf("{", i);
      if (braceIdx !== -1) {
        out += css.slice(i, braceIdx + 1);
        i = braceIdx + 1;
        continue;
      }
    }

    if (css.startsWith("color-mix(", i)) {
      let depth = 1;
      let j = i + "color-mix(".length;
      while (j < n && depth > 0) {
        if (css[j] === "(") depth++;
        else if (css[j] === ")") depth--;
        j++;
      }
      if (depth === 0) {
        const inner = css.slice(i + "color-mix(".length, j - 1);
        const args = splitTopLevelCommas(inner);
        if (args.length === 3 && args[0].toLowerCase().startsWith("in ")) {
          const space = args[0].toLowerCase();
          const op1 = parseColorMixOperand(args[1], varMap);
          const op2 = parseColorMixOperand(args[2], varMap);

          let c1 = op1.color;
          let c2 = op2.color;
          // Handle `color-mix(in oklab, currentcolor 50%, transparent)` cleanly on dark theme
          if (!c1 && op1.rawColor.toLowerCase() === "currentcolor" && c2) {
            c1 = [244, 245, 247, 1];
          }
          if (!c2 && op2.rawColor.toLowerCase() === "currentcolor" && c1) {
            c2 = [244, 245, 247, 1];
          }

          if (c1 && c2) {
            const mixed = mixColors(space, c1, op1.weight, c2, op2.weight);
            out += formatRgba(mixed);
            i = j;
            continue;
          }
        }
        out += css.slice(i, j);
        i = j;
        continue;
      }
    }

    out += css[i];
    i++;
  }

  return out;
}

/**
 * Full Chrome 74-95 WebView compatibility pass over built Android CSS bundles.
 */
export function lowerAndroidCss(css) {
  let result = unwrapCssLayers(css);
  const rootDefaults = extractPropertyInitialRoot(result);
  if (rootDefaults) {
    result = rootDefaults + result;
  }
  result = lowerOklchColors(result);
  result = lowerColorMix(result);
  return result;
}
