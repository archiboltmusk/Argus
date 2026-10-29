export type RetroConsoleCore = "gba" | "snes" | "nes" | "ps1" | "psp" | "genesis";

export type RetroCoreMetadata = {
  coreId: RetroConsoleCore;
  coreName: string;
  systemName: string;
  wasmModuleUrl: string;
  supportedExtensions: string[];
  maxFps: number;
};

export const LIBRETRO_WASM_CORES: Record<RetroConsoleCore, RetroCoreMetadata> = {
  gba: {
    coreId: "gba",
    coreName: "mgba_libretro",
    systemName: "Game Boy Advance",
    wasmModuleUrl: "/wasm/cores/mgba_libretro.wasm",
    supportedExtensions: [".gba", ".bin"],
    maxFps: 60,
  },
  snes: {
    coreId: "snes",
    coreName: "snes9x_libretro",
    systemName: "Super Nintendo",
    wasmModuleUrl: "/wasm/cores/snes9x_libretro.wasm",
    supportedExtensions: [".smc", ".sfc"],
    maxFps: 60,
  },
  nes: {
    coreId: "nes",
    coreName: "fceumm_libretro",
    systemName: "Nintendo Entertainment System",
    wasmModuleUrl: "/wasm/cores/fceumm_libretro.wasm",
    supportedExtensions: [".nes"],
    maxFps: 60,
  },
  genesis: {
    coreId: "genesis",
    coreName: "genesis_plus_gx_libretro",
    systemName: "Sega Genesis / Mega Drive",
    wasmModuleUrl: "/wasm/cores/genesis_plus_gx.wasm",
    supportedExtensions: [".bin", ".gen", ".md"],
    maxFps: 60,
  },
  ps1: {
    coreId: "ps1",
    coreName: "beetle_psx_libretro",
    systemName: "Sony PlayStation",
    wasmModuleUrl: "/wasm/cores/beetle_psx.wasm",
    supportedExtensions: [".cue", ".iso", ".chd"],
    maxFps: 60,
  },
  psp: {
    coreId: "psp",
    coreName: "ppsspp_libretro",
    systemName: "Sony PlayStation Portable",
    wasmModuleUrl: "/wasm/cores/ppsspp.wasm",
    supportedExtensions: [".iso", ".cso", ".pbp"],
    maxFps: 60,
  },
};

/**
 * Detects the appropriate Libretro WebAssembly core from ROM file extension.
 */
export function detectRetroCore(filename: string): RetroCoreMetadata | null {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  for (const core of Object.values(LIBRETRO_WASM_CORES)) {
    if (core.supportedExtensions.includes(ext)) {
      return core;
    }
  }
  return null;
}
