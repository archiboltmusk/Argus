/**
 * Core BTR Anki Exporter
 * Generates ready-to-import Anki (.txt) flashcard decks with KaTeX formatting,
 * cloze-style reveal blocks, and examiner trap alert boxes.
 */

import { CORE_BTR_SUPER_VOLATILES, type BTRVolatileCard } from "./corebtr-schedule";

export interface AnkiExportOptions {
  includeExaminerTraps?: boolean;
  includeMnemonics?: boolean;
  categoryFilter?: string;
  tagPrefix?: string;
}

/**
 * Format cards into standard Anki tab-delimited text format
 */
export function formatCardsForAnki(
  cards: BTRVolatileCard[] = CORE_BTR_SUPER_VOLATILES,
  options: AnkiExportOptions = {}
): string {
  const {
    includeExaminerTraps = true,
    includeMnemonics = true,
    tagPrefix = "NEETPG2027::CoreBTR",
  } = options;

  const header = [
    "#separator:tab",
    "#html:true",
    "#tags column:3",
    "#deck:Core BTR NEET-PG 2027 Super-Volatiles",
    "",
  ].join("\n");

  const rows = cards.map((card) => {
    // Front side
    const frontHtml = [
      `<div style="font-family: -apple-system, sans-serif; padding: 12px; background: #0f111a; color: #f8fafc; border-radius: 12px; border: 1px solid #2e384d;">`,
      `  <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: bold; color: #10b981; margin-bottom: 6px;">`,
      `    ${card.subjectName} • ${card.category}`,
      `  </div>`,
      `  <h3 style="font-size: 16px; margin: 0 0 10px 0; color: #ffffff;">${card.title}</h3>`,
      `  <div style="font-size: 14px; line-height: 1.5; color: #cbd5e1; background: #161926; padding: 10px; border-radius: 8px;">`,
      `    <b>Prompt:</b> ${card.keyPrompt}`,
      `  </div>`,
      `</div>`,
    ].join("");

    // Back side
    const backParts = [
      `<div style="font-family: -apple-system, sans-serif; padding: 12px; background: #0f111a; color: #f8fafc; border-radius: 12px; border: 1px solid #10b981;">`,
      `  <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #10b981; margin-bottom: 6px;">`,
      `    Master Solution & Core Fact:`,
      `  </div>`,
      `  <div style="font-size: 14px; font-weight: 600; line-height: 1.5; color: #34d399; margin-bottom: 12px;">`,
      `    ${card.maskedAnswer}`,
      `  </div>`,
    ];

    if (includeExaminerTraps && card.examinerTrap) {
      backParts.push(
        `<div style="font-size: 12px; line-height: 1.4; color: #fbbf24; background: rgba(245, 158, 11, 0.12); border-left: 3px solid #f59e0b; padding: 8px 10px; border-radius: 6px; margin-bottom: 8px;">`,
        `  <b>⚠️ Examiner Trap:</b> ${card.examinerTrap}`,
        `</div>`
      );
    }

    if (includeMnemonics && card.mnemonic) {
      backParts.push(
        `<div style="font-size: 12px; line-height: 1.4; color: #a78bfa; background: rgba(139, 92, 246, 0.12); padding: 8px 10px; border-radius: 6px;">`,
        `  <b>💡 Memory Hook:</b> ${card.mnemonic}`,
        `</div>`
      );
    }

    backParts.push(`</div>`);
    const backHtml = backParts.join("");

    // Tags
    const tags = [
      tagPrefix,
      card.category ? `${tagPrefix}::${card.category.replace(/\s+/g, "")}` : "",
      card.subjectName ? `${tagPrefix}::${card.subjectName.replace(/\s+/g, "")}` : "",
      ...(card.tags || []).map((t) => t.replace(/\s+/g, "_")),
    ]
      .filter(Boolean)
      .join(" ");

    // Tab-separated fields
    return `${cleanOneLine(frontHtml)}\t${cleanOneLine(backHtml)}\t${tags}`;
  });

  return header + rows.join("\n");
}

function cleanOneLine(html: string): string {
  return html.replace(/\r?\n|\r/g, "").replace(/\t/g, "  ");
}

/**
 * Triggers a browser download of the formatted Anki deck
 */
export function downloadBTRAnkiDeck(
  cards: BTRVolatileCard[] = CORE_BTR_SUPER_VOLATILES,
  filename: string = "CoreBTR_NEETPG2027_SuperVolatiles_Deck.txt",
  options?: AnkiExportOptions
): void {
  const content = formatCardsForAnki(cards, options);
  const blob = new Blob([content], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
