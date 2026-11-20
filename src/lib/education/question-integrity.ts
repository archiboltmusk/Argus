import type { ClinicalQuestion } from "./qbank-types";

export type QuestionAnswer = number | number[] | Record<string, number>;
export type AnswerSpec =
  | { kind: "single"; correctIndex: number }
  | { kind: "multiple"; correctIndices: number[] }
  | { kind: "matching"; prompts: string[]; correctMatches: number[] };
export type ImportRejection = { item: number; reason: string };
export type ImportReport = { accepted: number; rejected: ImportRejection[] };

const text = (value: unknown): value is string => typeof value === "string" && !!value.trim();
const indexIn = (value: unknown, length: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < length;

/** Never infer an answer from a substring, missing key, or a format classifier. */
export function parseQuestionCore(raw: any): {
  vignette: string;
  options: string[];
  answerSpec: AnswerSpec;
} {
  if (!raw || typeof raw !== "object") throw new Error("Question must be an object.");
  if (raw.id !== undefined && !text(raw.id)) throw new Error("Question id must be nonempty text.");
  const vignette =
    raw.vignette ?? raw.question ?? raw.prompt ?? raw.stem ?? raw.query ?? raw.item ?? raw.text;
  if (!text(vignette)) throw new Error("Missing question text.");
  const source = raw.options ?? raw.choices;
  let entries: unknown[];
  let labels: string[] = [];
  if (Array.isArray(source)) entries = source;
  else if (source && typeof source === "object") {
    labels = Object.keys(source).sort();
    if (!labels.every((key, i) => key === String.fromCharCode(65 + i))) {
      throw new Error("Object options must use contiguous A, B, C… labels.");
    }
    entries = labels.map((key) => source[key]);
  } else throw new Error("Missing options.");
  const options = entries.map((entry: any) =>
    typeof entry === "object" && entry !== null
      ? (entry.text ?? entry.label ?? entry.choice)
      : entry,
  );
  if (options.length < 2 || options.length > 26 || !options.every(text)) {
    throw new Error("Provide 2–26 nonempty text options.");
  }
  const normalized = options.map((option) => option.trim().toLocaleLowerCase());
  if (new Set(normalized).size !== options.length)
    throw new Error("Duplicate options are ambiguous.");
  const resolve = (value: unknown): number => {
    if (indexIn(value, options.length)) return value;
    if (typeof value === "string") {
      const key = value.trim();
      if (/^[A-Z]$/i.test(key)) {
        const index = key.toUpperCase().charCodeAt(0) - 65;
        if (indexIn(index, options.length)) return index;
      }
      const labeled = /^([A-Z])[.)]\s+(.+)$/i.exec(key);
      if (labeled) {
        const index = labeled[1].toUpperCase().charCodeAt(0) - 65;
        if (
          indexIn(index, options.length) &&
          normalized[index] === labeled[2].trim().toLocaleLowerCase()
        )
          return index;
        throw new Error("Answer label and option text disagree.");
      }
      const index = normalized.indexOf(key.toLocaleLowerCase());
      if (index !== -1) return index;
    }
    throw new Error("Missing or invalid answer key. Numeric indices must be zero-based.");
  };
  const spec = raw.answerSpec;
  if (spec && !["single", "multiple", "matching"].includes(spec.kind))
    throw new Error("Unknown answer specification.");
  if (spec?.kind === "matching") {
    if (
      !Array.isArray(spec.prompts) ||
      !spec.prompts.length ||
      !spec.prompts.every(text) ||
      !Array.isArray(spec.correctMatches) ||
      spec.correctMatches.length !== spec.prompts.length
    ) {
      throw new Error("Matching questions need prompts and one key per prompt.");
    }
    return {
      vignette,
      options,
      answerSpec: {
        kind: "matching",
        prompts: spec.prompts,
        correctMatches: spec.correctMatches.map(resolve),
      },
    };
  }
  const ambiguousAliases = [raw.answer, raw.correct_answer, raw.correct, raw.label];
  if (
    ambiguousAliases.some((key) => typeof key === "number") &&
    ![0, 1].includes(raw.answerIndexBase)
  ) {
    throw new Error(
      "Numeric answer aliases need answerIndexBase: 0 or 1; use correctIndex for zero-based keys.",
    );
  }
  const alias = (key: unknown) => (typeof key === "number" ? key - raw.answerIndexBase : key);
  const explicitKeys = [
    raw.correctIndex,
    raw.answer_idx,
    alias(raw.answer),
    alias(raw.correct_answer),
    alias(raw.correct),
    alias(raw.label),
    spec?.kind === "single" ? spec.correctIndex : undefined,
  ].filter((key) => key !== undefined && key !== null);
  const flagged = entries.flatMap((entry: any, i) => (entry?.correct === true ? [i] : []));
  if (spec?.kind === "multiple" || raw.correctIndices !== undefined) {
    const keys = spec?.correctIndices ?? raw.correctIndices;
    if (!Array.isArray(keys) || !keys.length)
      throw new Error("Multiple response needs explicit correctIndices.");
    const correctIndices = keys.map(resolve).sort((a, b) => a - b);
    if (new Set(correctIndices).size !== correctIndices.length)
      throw new Error("Duplicate answer keys.");
    const canonicalLegacyIndex =
      spec?.kind === "multiple" &&
      raw.correctIndex === correctIndices[0] &&
      explicitKeys.length === 1;
    if (
      (explicitKeys.length && !canonicalLegacyIndex) ||
      (flagged.length && flagged.join() !== correctIndices.join())
    ) {
      throw new Error("Conflicting answer keys.");
    }
    return { vignette, options, answerSpec: { kind: "multiple", correctIndices } };
  }
  if (raw.format === "MultipleTrueFalse" || raw.format === "MatchingMatrix") {
    throw new Error("This format needs an explicit multiple or matching answerSpec.");
  }
  if (flagged.length > 1)
    throw new Error("Several options flagged correct without a multiple-response key.");
  const keys = [...explicitKeys.map(resolve), ...flagged];
  if (!keys.length) throw new Error("Missing answer key.");
  if (new Set(keys).size !== 1) throw new Error("Conflicting answer keys.");
  return { vignette, options, answerSpec: { kind: "single", correctIndex: keys[0] } };
}

export function answerSpecFor(question: ClinicalQuestion): AnswerSpec {
  return question.answerSpec ?? { kind: "single", correctIndex: question.correctIndex };
}
export function hasAnswer(answer: QuestionAnswer | undefined): boolean {
  return typeof answer === "number" || (answer !== undefined && Object.keys(answer).length > 0);
}
export function isCorrectAnswer(
  question: ClinicalQuestion,
  answer: QuestionAnswer | undefined,
): boolean {
  const spec = answerSpecFor(question);
  if (spec.kind === "single") return answer === spec.correctIndex;
  if (spec.kind === "multiple")
    return (
      Array.isArray(answer) &&
      answer.length === spec.correctIndices.length &&
      new Set(answer).size === answer.length &&
      spec.correctIndices.every((key) => answer.includes(key))
    );
  return (
    !!answer &&
    !Array.isArray(answer) &&
    typeof answer === "object" &&
    Object.keys(answer).length === spec.prompts.length &&
    spec.correctMatches.every((key, i) => answer[String(i)] === key)
  );
}
export function correctAnswerLabel(question: ClinicalQuestion): string {
  const spec = answerSpecFor(question);
  const label = (i: number) => `${String.fromCharCode(65 + i)}: ${question.options[i]}`;
  return spec.kind === "single"
    ? label(spec.correctIndex)
    : spec.kind === "multiple"
      ? spec.correctIndices.map(label).join("; ")
      : spec.prompts.map((prompt, i) => `${prompt} → ${label(spec.correctMatches[i])}`).join("; ");
}
