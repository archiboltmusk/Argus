export type SaveLocationRule = {
  platform: "windows" | "macos" | "linux";
  template: string;
  description: string;
};

export const COMMON_SAVE_PATTERNS: SaveLocationRule[] = [
  {
    platform: "windows",
    template: "%USERPROFILE%/Saved Games/{gameName}",
    description: "Standard Windows Saved Games folder",
  },
  {
    platform: "windows",
    template: "%APPDATA%/{gameName}",
    description: "Roaming AppData save folder",
  },
  {
    platform: "windows",
    template: "%LOCALAPPDATA%/{gameName}/Saved",
    description: "Unreal Engine local save folder",
  },
  {
    platform: "windows",
    template: "%USERPROFILE%/Documents/My Games/{gameName}",
    description: "Documents My Games repository",
  },
  {
    platform: "macos",
    template: "~/Library/Application Support/Argus/bottles/{gameId}/drive_c/users/crossover/AppData/Local/{gameName}",
    description: "Isolated macOS GPTK/Wine bottle AppData",
  },
  {
    platform: "linux",
    template: "~/.local/share/argus/compatdata/{gameId}/pfx/drive_c/users/steamuser/AppData/Local/{gameName}",
    description: "Linux Proton compatdata drive_c",
  },
];

export type GameSaveBackup = {
  gameId: string;
  gameName: string;
  lastBackupAt: number;
  archiveSizeBytes: number;
  remoteSyncUrl?: string;
};

/**
 * Resolves candidate save paths for a given game across operating systems.
 */
export function resolveGameSaveCandidates(gameId: string, gameName: string): string[] {
  const safeId = gameId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeName = gameName.replace(/[<>:"/\\|?*]/g, "");

  return COMMON_SAVE_PATTERNS.map((p) =>
    p.template.replace("{gameId}", safeId).replace("{gameName}", safeName),
  );
}
