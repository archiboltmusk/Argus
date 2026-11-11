/**
 * Interactive Subtitle Dictionary & Flashcards Engine
 *
 * Tokenizes subtitle cues into interactive words, provides instant phonetic
 * and semantic definitions on hover/click, and exports saved words to Anki flashcards.
 */

export interface SubtitleToken {
  word: string;
  cleanWord: string;
  isLookupable: boolean;
  startIndex: number;
}

export interface FlashcardEntry {
  id: string;
  word: string;
  phonetic?: string;
  definition: string;
  sentenceContext: string;
  mediaTitle: string;
  createdAt: number;
}

const STORAGE_KEY = "argus.subtitles.flashcards.v1";
let cardCache: FlashcardEntry[] = [];

/**
 * Splits a subtitle sentence into clean, clickable word tokens.
 */
export function tokenizeSubtitleSentence(sentence: string): SubtitleToken[] {
  if (!sentence) return [];

  const rawTokens = sentence.split(/(\s+|[^\w\s'-]+)/);
  const tokens: SubtitleToken[] = [];
  let currentIndex = 0;

  for (const part of rawTokens) {
    if (!part) continue;

    const clean = part.replace(/^[^\w]+|[^\w]+$/g, "").trim();
    const isLookupable = clean.length >= 2 && !/^\d+$/.test(clean);

    tokens.push({
      word: part,
      cleanWord: clean,
      isLookupable,
      startIndex: currentIndex,
    });

    currentIndex += part.length;
  }

  return tokens;
}

export function getSavedFlashcards(): FlashcardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cardCache = raw ? JSON.parse(raw) : cardCache;
  } catch {}
  return [...cardCache];
}

export function saveFlashcard(entry: Omit<FlashcardEntry, "id" | "createdAt">): FlashcardEntry {
  const cards = getSavedFlashcards();
  const newCard: FlashcardEntry = {
    ...entry,
    id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };

  // Avoid duplicate words for the same title
  const existingIdx = cards.findIndex(
    (c) => c.word.toLowerCase() === newCard.word.toLowerCase() && c.mediaTitle === newCard.mediaTitle,
  );
  if (existingIdx !== -1) {
    cards[existingIdx] = newCard;
  } else {
    cards.push(newCard);
  }

  cardCache = cards;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {}
  return newCard;
}

export function clearFlashcards(): void {
  cardCache = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Exports saved flashcards into standard Anki-compatible tab-separated CSV format:
 * Word \t Phonetic \t Definition \t Sentence Context \t Title
 */
export function exportToAnkiCsv(cards: FlashcardEntry[] = getSavedFlashcards()): string {
  let csv = "#separator:tab\n#html:true\n";
  csv += "Word\tPhonetic\tDefinition\tSentence\tMedia\n";

  for (const card of cards) {
    const cleanWord = card.word.replace(/\t/g, " ");
    const phonetic = (card.phonetic ?? "").replace(/\t/g, " ");
    const definition = card.definition.replace(/\t/g, " ").replace(/\n/g, "<br>");
    const sentence = card.sentenceContext.replace(/\t/g, " ");
    const title = card.mediaTitle.replace(/\t/g, " ");

    csv += `${cleanWord}\t${phonetic}\t${definition}\t${sentence}\t${title}\n`;
  }

  return csv;
}
