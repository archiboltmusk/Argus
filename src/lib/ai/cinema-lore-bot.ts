/**
 * Cinema Lore Bot & Anti-Spoiler Canon Guard
 *
 * Interactive character relations, faction family trees, and narrative encyclopedia
 * strictly bounded by playback timestamps to protect viewers from spoilers.
 */

export interface LoreCharacter {
  id: string;
  name: string;
  alias?: string;
  factionId?: string;
  firstAppearanceSec: number;
  initialRole: string;
}

export interface CharacterStatusMilestone {
  characterId: string;
  revealTimestampSec: number;
  status: "active" | "betrayed" | "revealed-kin" | "deceased";
  publicLoreUpdate: string;
  revealedAllies?: string[];
  revealedEnemies?: string[];
}

export interface LoreFaction {
  id: string;
  name: string;
  motto?: string;
  allegiance: string;
}

export interface LoreGraphView {
  characters: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    factionName?: string;
  }>;
  activeRelationships: Array<{
    fromId: string;
    toId: string;
    type: "ally" | "enemy" | "kin";
  }>;
}

export interface LoreQueryResponse {
  answer: string;
  isSpoilerShielded: boolean;
  activeCharacterStatus?: string;
  knownMilestones: string[];
}

export class CinemaLoreBot {
  private static instance: CinemaLoreBot | null = null;
  private characters: Map<string, LoreCharacter> = new Map();
  private factions: Map<string, LoreFaction> = new Map();
  private milestones: CharacterStatusMilestone[] = [];

  public static getInstance(): CinemaLoreBot {
    if (!CinemaLoreBot.instance) {
      CinemaLoreBot.instance = new CinemaLoreBot();
    }
    return CinemaLoreBot.instance;
  }

  public registerFaction(faction: LoreFaction): void {
    this.factions.set(faction.id, faction);
  }

  public registerCharacter(char: LoreCharacter): void {
    this.characters.set(char.id, char);
  }

  public addMilestone(milestone: CharacterStatusMilestone): void {
    this.milestones.push(milestone);
    this.milestones.sort((a, b) => a.revealTimestampSec - b.revealTimestampSec);
  }

  /**
   * Generates a safe character graph bounded strictly by current playback timestamp
   */
  public getLoreGraphAtTimestamp(currentPlaybackSec: number): LoreGraphView {
    const visibleChars: LoreGraphView["characters"] = [];
    const relations: LoreGraphView["activeRelationships"] = [];

    for (const char of this.characters.values()) {
      if (char.firstAppearanceSec > currentPlaybackSec) {
        // Character hasn't appeared yet in the movie
        continue;
      }

      // Find the most recent milestone prior to current timestamp
      const pastMilestones = this.milestones.filter(
        (m) => m.characterId === char.id && m.revealTimestampSec <= currentPlaybackSec,
      );

      const latest = pastMilestones[pastMilestones.length - 1];
      const faction = char.factionId ? this.factions.get(char.factionId)?.name : undefined;

      visibleChars.push({
        id: char.id,
        name: char.name,
        role: latest ? latest.publicLoreUpdate : char.initialRole,
        status: latest ? latest.status : "active",
        factionName: faction,
      });

      // Add relationships revealed up to this second
      if (latest) {
        if (latest.revealedAllies) {
          for (const allyId of latest.revealedAllies) {
            relations.push({ fromId: char.id, toId: allyId, type: "ally" });
          }
        }
        if (latest.revealedEnemies) {
          for (const enemyId of latest.revealedEnemies) {
            relations.push({ fromId: char.id, toId: enemyId, type: "enemy" });
          }
        }
      }
    }

    return { characters: visibleChars, activeRelationships: relations };
  }

  /**
   * Responds to user lore questions with anti-spoiler shielding
   */
  public queryCharacter(characterId: string, currentPlaybackSec: number): LoreQueryResponse {
    const char = this.characters.get(characterId);
    if (!char) {
      return {
        answer: "Character not found in database.",
        isSpoilerShielded: false,
        knownMilestones: [],
      };
    }

    if (char.firstAppearanceSec > currentPlaybackSec) {
      return {
        answer: `[Anti-Spoiler Guard] ${char.name} has not yet been introduced in this film.`,
        isSpoilerShielded: true,
        knownMilestones: [],
      };
    }

    const pastMilestones = this.milestones.filter(
      (m) => m.characterId === characterId && m.revealTimestampSec <= currentPlaybackSec,
    );

    const futureMilestones = this.milestones.filter(
      (m) => m.characterId === characterId && m.revealTimestampSec > currentPlaybackSec,
    );

    const latest = pastMilestones[pastMilestones.length - 1];
    const faction = char.factionId ? this.factions.get(char.factionId)?.name : "Independent";

    let answer = `${char.name} (${faction}): ${char.initialRole}.`;
    if (latest) {
      answer += ` Current situation: ${latest.publicLoreUpdate} (Status: ${latest.status}).`;
    }

    if (futureMilestones.length > 0) {
      answer += " [Future plot developments are shielded to prevent spoilers]";
    }

    return {
      answer,
      isSpoilerShielded: futureMilestones.length > 0,
      activeCharacterStatus: latest ? latest.status : "active",
      knownMilestones: pastMilestones.map((m) => m.publicLoreUpdate),
    };
  }
}
