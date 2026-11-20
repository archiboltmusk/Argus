export type StoreCategory =
  | "all"
  | "ai_forged"
  | "action"
  | "roguelike"
  | "racing"
  | "arcade"
  | "retro"
  | "puzzle"
  | "installed";

export interface StoreGame {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  author: string;
  category: StoreCategory;
  tags: string[];
  rating: number; // 0 - 5.0
  downloads: number;
  gamepadVerified: boolean;
  coverGradient: string;
  accentColor: string;
  icon: string;
  promptUsed?: string;
  modelUsed?: string;
  sourceCode?: string; // HTML5/Canvas/JS self-contained code
  playableType: "native_arcade" | "html5_canvas" | "external_url";
  externalUrl?: string;
  installed: boolean;
  installedAt?: string;
  featured?: boolean;
}
