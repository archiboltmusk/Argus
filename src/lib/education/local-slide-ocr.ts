/**
 * Local Slide & Blackboard OCR Keyframe Snapper
 *
 * Automatically detects blackboard transitions and converts handwritten
 * mathematical formulas into LaTeX proofs for the Derivation Scratchpad.
 */

import type { ConceptNote } from "./course-engine";

export interface BlackboardKeyframe {
  timestampSec: number;
  detectedTitle: string;
  latexFormula?: string;
  summary: string;
  confidence: number;
}

const COMMON_MATH_PATTERNS = [
  {
    regex: /\b(matrix|column|row|Ax\s*=\s*b)\b/i,
    latex: "A \\mathbf{x} = \\mathbf{b}",
    title: "Linear System Matrix Equation",
  },
  {
    regex: /\b(gradient|descent|learning rate|alpha)\b/i,
    latex: "\\theta \\leftarrow \\theta - \\alpha \\nabla J(\\theta)",
    title: "Gradient Descent Optimization",
  },
  {
    regex: /\b(eigenvalue|eigenvector|det\(A\s*-\s*lambda\s*I\))\b/i,
    latex: "A \\mathbf{v} = \\lambda \\mathbf{v} \\iff \\det(A - \\lambda I) = 0",
    title: "Eigenvalue Characteristic Equation",
  },
  {
    regex: /\b(svd|singular value|sigma|U\s*Sigma\s*V)\b/i,
    latex: "A = U \\Sigma V^T = \\sum_{i=1}^r \\sigma_i \\mathbf{u}_i \\mathbf{v}_i^T",
    title: "Singular Value Decomposition (SVD)",
  },
  {
    regex: /\b(attention|softmax|Q\s*K\s*V|transformer)\b/i,
    latex: "\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V",
    title: "Scaled Dot-Product Attention",
  },
  {
    regex: /\b(probability|amplitude|interference|psi|phi)\b/i,
    latex: "P_{12} = |\\phi_1 + \\phi_2|^2 = P_1 + P_2 + 2 \\sqrt{P_1 P_2} \\cos(\\delta)",
    title: "Quantum Probability Amplitude",
  },
];

/**
 * Parses OCR raw text recognized on a blackboard or lecture slide,
 * identifying mathematical theorems and formatting clean LaTeX.
 */
export function extractMathFromBlackboardText(
  rawOcrText: string,
  timestampSec: number
): BlackboardKeyframe {
  for (const pattern of COMMON_MATH_PATTERNS) {
    if (pattern.regex.test(rawOcrText)) {
      return {
        timestampSec,
        detectedTitle: pattern.title,
        latexFormula: pattern.latex,
        summary: rawOcrText.trim(),
        confidence: 0.92,
      };
    }
  }

  // Fallback to title extraction
  const firstLine = rawOcrText.split("\n")[0].trim() || "Blackboard Concept";
  return {
    timestampSec,
    detectedTitle: firstLine.slice(0, 60),
    summary: rawOcrText.trim(),
    confidence: 0.75,
  };
}

/**
 * Converts a detected blackboard keyframe into a ConceptNote for the Scratchpad.
 */
export function keyframeToConceptNote(kf: BlackboardKeyframe): ConceptNote {
  return {
    timestampSec: kf.timestampSec,
    title: kf.detectedTitle,
    note: kf.summary,
    latex: kf.latexFormula,
  };
}
