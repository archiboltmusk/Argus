/**
 * macOS APFS Storage Manager & External Drive Symlink Offloader
 * Designed for Mac gamers dealing with 256GB / 512GB internal SSD constraints.
 */

export interface SymlinkPlan {
  sourceInternalPath: string;
  targetExternalPath: string;
  externalVolumeName: string;
  estimatedSizeGb: number;
  terminalMoveCommand: string;
  terminalSymlinkCommand: string;
  revertCommand: string;
}

export interface CacheCleanupPlan {
  category: string;
  description: string;
  path: string;
  estimatedReclaimableMb: number;
  safeToClean: boolean;
  cleanCommand: string;
}

/**
 * Generates an APFS transparent symbolic link migration plan for offloading large games to an external SSD.
 */
export function generateSymlinkPlan(
  gameId: string,
  internalPath: string,
  externalVolumeName: string = "Samsung_T7",
  estimatedSizeGb: number = 75
): SymlinkPlan {
  const safeGameId = gameId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const targetExternalPath = `/Volumes/${externalVolumeName}/ArgusGames/${safeGameId}`;

  // Safe shell script commands
  const terminalMoveCommand = `mkdir -p "/Volumes/${externalVolumeName}/ArgusGames" && mv "${internalPath}" "${targetExternalPath}"`;
  const terminalSymlinkCommand = `ln -s "${targetExternalPath}" "${internalPath}"`;
  const revertCommand = `rm "${internalPath}" && mv "${targetExternalPath}" "${internalPath}"`;

  return {
    sourceInternalPath: internalPath,
    targetExternalPath,
    externalVolumeName,
    estimatedSizeGb,
    terminalMoveCommand,
    terminalSymlinkCommand,
    revertCommand,
  };
}

/**
 * Returns standard macOS Wine / GPTK / Steam cache cleanup items.
 */
export function getMacGamingCacheCleanupItems(): CacheCleanupPlan[] {
  return [
    {
      category: "Wine Prefix Redistributables",
      description: "DirectX / Visual C++ installer caches left behind in Wine bottle drive_c",
      path: "~/Library/Application Support/Argus/bottles/*/drive_c/windows/Installer",
      estimatedReclaimableMb: 1400,
      safeToClean: true,
      cleanCommand: "find ~/Library/Application\\ Support/Argus/bottles -name \"*.msi\" -o -name \"*.exe\" -path \"*/Installer/*\" -delete",
    },
    {
      category: "DXVK & Metal Shader Caches",
      description: "Stale compiled shader caches from prior game patches",
      path: "~/Library/Caches/org.winehq.wine/dxvk",
      estimatedReclaimableMb: 850,
      safeToClean: true,
      cleanCommand: "rm -rf ~/Library/Caches/org.winehq.wine/dxvk/*",
    },
    {
      category: "Rosetta 2 AOT Translation Cache",
      description: "Ahead-of-Time translated x86_64 binary fragments for uninstalled games",
      path: "/var/db/oah",
      estimatedReclaimableMb: 2200,
      safeToClean: true,
      cleanCommand: "sudo rm -rf /var/db/oah/*",
    },
  ];
}
