export type GamePlatformRunner = "native_windows" | "macos_gptk" | "macos_whisky" | "linux_proton" | "linux_wine";

export type RunnerConfig = {
  runner: GamePlatformRunner;
  prefixPath: string;
  executablePath: string;
  launchArguments?: string[];
  environmentVariables: Record<string, string>;
};

/**
 * Detects host platform and constructs an optimized runner configuration
 * with proper isolated Wine/Proton prefix, DXVK, and performance flags.
 */
export function buildGameRunnerConfig(
  gameId: string,
  executablePath: string,
  platformOverride?: GamePlatformRunner,
): RunnerConfig {
  const isMac = typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");
  const isLinux = typeof navigator !== "undefined" && navigator.userAgent.includes("Linux");

  let runner: GamePlatformRunner = "native_windows";
  if (platformOverride) {
    runner = platformOverride;
  } else if (isMac) {
    runner = "macos_gptk";
  } else if (isLinux) {
    runner = "linux_proton";
  }

  const safeGameId = gameId.replace(/[^a-zA-Z0-9_-]/g, "_");

  if (runner === "macos_gptk" || runner === "macos_whisky") {
    const prefixPath = `~/Library/Application Support/Argus/bottles/${safeGameId}`;
    return {
      runner,
      prefixPath,
      executablePath,
      launchArguments: ["-dx11"],
      environmentVariables: {
        WINEPREFIX: prefixPath,
        WINEDEBUG: "-all",
        WINEESYNC: "1",
        DXVK_ASYNC: "1",
        MTL_HUD_ENABLED: "0",
        WINE_SIMULATE_WRITECOPY: "1",
      },
    };
  }

  if (runner === "linux_proton" || runner === "linux_wine") {
    const prefixPath = `~/.local/share/argus/compatdata/${safeGameId}/pfx`;
    return {
      runner,
      prefixPath,
      executablePath,
      environmentVariables: {
        STEAM_COMPAT_DATA_PATH: `~/.local/share/argus/compatdata/${safeGameId}`,
        STEAM_COMPAT_CLIENT_INSTALL_PATH: "~/.steam/root",
        PROTON_USE_SECCOMP: "1",
        DXVK_ASYNC: "1",
        MANGOHUD: "1",
        WINEESYNC: "1",
        WINEFSYNC: "1",
      },
    };
  }

  // Windows native execution
  return {
    runner: "native_windows",
    prefixPath: "",
    executablePath,
    environmentVariables: {},
  };
}
