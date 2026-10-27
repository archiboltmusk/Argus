/**
 * Clean & Sanitize Rich Educational Explanations
 *
 * Strips raw HTML wrappers, dictionary tracking tags (<span class="customMeta">),
 * repetitive "Correct answer: ..." banners, bot handles (@neet_pg_bot),
 * while cleanly parsing:
 * 1. Core Clinical Rationale
 * 2. Distractor Breakdown ("Why other options fail")
 * 3. Authority Textbook References & Pearls
 */

export interface CleanExplanationResult {
  correctRationale: string;
  distractorBreakdown: { option: string; reason: string }[];
  reference?: string;
  bottomLine?: string;
}

export function cleanExplanationPayload(
  raw: unknown,
  existingDistractors?: { option: string; reason: string }[]
): CleanExplanationResult {
  if (!raw) {
    return {
      correctRationale: "Diagnostic rationale confirmed by clinical presentation.",
      distractorBreakdown: existingDistractors || [],
    };
  }

  let text = typeof raw === "string" ? raw : String(raw);

  // 1. Remove dictionary metadata spans and bot watermarks
  text = text.replace(/<span[^>]*class=["']?customMeta["']?[^>]*>(.*?)<\/span>/gi, "$1");
  text = text.replace(/<span[^>]*>(.*?)<\/span>/gi, "$1");
  text = text.replace(/@(?:neet_pg_bot|inicet_bot|marrow_bot|prep_bot|\w+_bot)/gi, "");

  // 2. Extract References section if present
  let reference: string | undefined;
  const refMatch = text.match(/<strong>\s*Reference:?\s*<\/strong>(.*?)(?=$)/is);
  if (refMatch) {
    const rawRef = refMatch[1] || "";
    text = text.slice(0, refMatch.index);
    reference = rawRef
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // 3. Extract Distractor Breakdown ("Incorrect Options" or "Why other options fail")
  const distractorBreakdown: { option: string; reason: string }[] = existingDistractors ? [...existingDistractors] : [];
  const splitMatch = text.match(/<strong>\s*(?:Incorrect Options|Distractor Breakdown|Why other options fail|Why Options?[^<]*Fail):?\s*<\/strong>/i);

  let rationalePart = text;
  if (splitMatch && splitMatch.index !== undefined) {
    rationalePart = text.slice(0, splitMatch.index);
    const distractorPart = text.slice(splitMatch.index + splitMatch[0].length);

    // Extract list items <li>Option A...</li>
    const liMatches = distractorPart.match(/<li[^>]*>(.*?)<\/li>/gis);
    if (liMatches) {
      for (const li of liMatches) {
        const cleanLi = li
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/[\u200b\u200c\u200d]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        // Pattern: Option A) ... or Option A: ... or [A] ...
        const optMatch = cleanLi.match(/^(?:Option\s+)?([A-Ea-e])[\):.\s]+(.*?)$/);
        if (optMatch && optMatch[1] && optMatch[2]) {
          distractorBreakdown.push({
            option: `Option ${optMatch[1].toUpperCase()}`,
            reason: optMatch[2].trim(),
          });
        } else if (cleanLi) {
          distractorBreakdown.push({
            option: "Distractor",
            reason: cleanLi,
          });
        }
      }
    }
  }

  // 4. Strip redundant "Correct Answer: ..." headers from rationalePart
  rationalePart = rationalePart.replace(/^(?:<p[^>]*>)?\s*<strong>\s*Correct\s*Answer:?[^<]*<\/strong>\s*(?:<\/p>)?/gi, "");
  rationalePart = rationalePart.replace(/^(?:<p[^>]*>)?\s*<strong>\s*Correct\s*Answer:?[^<]*<\/strong>\s*(?:<\/p>)?/gi, "");
  rationalePart = rationalePart.replace(/^(?:<p[^>]*>)?\s*<strong>\s*Explanation:?\s*<\/strong>\s*(?:<\/p>)?/gi, "");

  // 5. Convert clean HTML structure to readable text with bullet points
  let cleanRationale = rationalePart
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/?(?:p|ul|ol|div|br)[^>]*>/gi, "\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "$1")
    .replace(/<b>(.*?)<\/b>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[\u200b\u200c\u200d]/g, "")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

  if (!cleanRationale) {
    cleanRationale = "Diagnostic rationale confirmed by clinical presentation.";
  }

  return {
    correctRationale: cleanRationale,
    distractorBreakdown,
    reference: reference || undefined,
  };
}
