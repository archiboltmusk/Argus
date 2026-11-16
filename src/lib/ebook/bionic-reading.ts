import React from "react";

/**
 * Calculates how many leading characters of a word should receive fixation emphasis.
 * Standard bionic reading bolding ratio:
 * - 1-3 letters: 1 character
 * - 4-5 letters: 2 characters
 * - 6-8 letters: 3 characters
 * - 9+ letters: ~45% of the word length
 */
export function getBionicFixationLength(length: number): number {
  if (length <= 0) return 0;
  if (length <= 3) return 1;
  if (length <= 5) return 2;
  if (length <= 8) return 3;
  return Math.ceil(length * 0.45);
}

export type BionicWordParts = {
  prefix: string;
  fixation: string;
  suffix: string;
  tail: string;
};

/**
 * Splits a token into:
 * - prefix: any leading punctuation or symbol characters
 * - fixation: initial letters of the core word to bold
 * - suffix: remaining letters of the core word
 * - tail: any trailing punctuation
 */
export function splitBionicWord(token: string): BionicWordParts {
  if (!token) {
    return { prefix: "", fixation: "", suffix: "", tail: "" };
  }

  // Unicode letter & number matching with optional surrounding punctuation
  const match = token.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}]+)([^\p{L}\p{N}]*)$/u);
  if (!match) {
    return { prefix: token, fixation: "", suffix: "", tail: "" };
  }

  const [, prefix, word, tail] = match;
  const fixLen = getBionicFixationLength(word.length);
  const fixation = word.slice(0, fixLen);
  const suffix = word.slice(fixLen);

  return { prefix, fixation, suffix, tail };
}

/**
 * Transforms plain text into an array of React elements with Bionic Reading fixation points.
 */
export function renderBionicText(text: string): React.ReactNode[] {
  if (!text) return [];

  const tokens = text.split(/(\s+)/);
  return tokens.map((token, index) => {
    if (!token || /^\s+$/.test(token)) {
      return token;
    }

    const { prefix, fixation, suffix, tail } = splitBionicWord(token);
    if (!fixation) {
      return token;
    }

    return React.createElement(
      "span",
      { key: index, className: "inline" },
      prefix,
      React.createElement("strong", { className: "font-bold tracking-tight opacity-100" }, fixation),
      React.createElement("span", { className: "opacity-95" }, suffix),
      tail,
    );
  });
}

/**
 * Formats plain text into HTML markup with <b> fixation points.
 */
export function formatBionicHtml(text: string): string {
  if (!text) return "";

  const tokens = text.split(/(\s+)/);
  return tokens
    .map((token) => {
      if (!token || /^\s+$/.test(token)) return token;
      const { prefix, fixation, suffix, tail } = splitBionicWord(token);
      if (!fixation) return token;
      return `${prefix}<b>${fixation}</b>${suffix}${tail}`;
    })
    .join("");
}

/**
 * Formats plain text into Markdown syntax with ** fixation points.
 */
export function formatBionicMarkdown(text: string): string {
  if (!text) return "";

  const tokens = text.split(/(\s+)/);
  return tokens
    .map((token) => {
      if (!token || /^\s+$/.test(token)) return token;
      const { prefix, fixation, suffix, tail } = splitBionicWord(token);
      if (!fixation) return token;
      return `${prefix}**${fixation}**${suffix}${tail}`;
    })
    .join("");
}
