import React, { useState, useEffect } from "react";
import {
  X,
  ShoppingBag,
  Sparkles,
  Gamepad2,
  Play,
  Download,
  CheckCircle,
  Search,
  Wand2,
  Code,
  Flame,
  Star,
  Plus,
} from "lucide-react";
import { StoreCategory, StoreGame } from "./store-types";
import { getStoreCatalog, saveGameToStoreLibrary, toggleInstallGame } from "./store-catalog";
import { generateOfflineAIGame, wrapGameWithArgusBridge } from "./ai-game-forge";
import { GameRunnerModal } from "./game-runner-modal";
import { ButtonGlyph } from "@/components/gamepad-button-glyph";
import { detectLayout } from "@/lib/gamepad/layout";
import { useGamepads } from "@/lib/gamepad/store";

interface ArgusStoreModalProps {
  onClose: () => void;
}

export const ArgusStoreModal: React.FC<ArgusStoreModalProps> = ({ onClose }) => {
  const [activeCategory, setActiveCategory] = useState<StoreCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [catalog, setCatalog] = useState<StoreGame[]>([]);
  const [activePlayGame, setActivePlayGame] = useState<StoreGame | null>(null);

  // AI Forge Studio State
  const [forgePrompt, setForgePrompt] = useState("");
  const [forgeTitle, setForgeTitle] = useState("");
  const [forgeGenre, setForgeGenre] = useState<"runner" | "action" | "shooter">("runner");
  const [forgeStyle, setForgeStyle] = useState<
    "neon_cyberpunk" | "retro_pixel" | "vector_minimal" | "sunset_arcade"
  >("neon_cyberpunk");
  const [isForging, setIsForging] = useState(false);

  // Sideload / Importer State
  const [importTitle, setImportTitle] = useState("");
  const [importCode, setImportCode] = useState("");
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const gamepads = useGamepads();
  const activePad = gamepads[0];
  const glyphLayout = activePad ? (detectLayout([activePad.name]) ?? "xbox") : "xbox";

  useEffect(() => {
    setCatalog(getStoreCatalog());
  }, []);

  const handleToggleInstall = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleInstallGame(gameId);
    setCatalog(getStoreCatalog());
  };

  const handleForgeGame = () => {
    if (!forgeTitle.trim()) return;
    setIsForging(true);

    setTimeout(() => {
      const generated = generateOfflineAIGame({
        title: forgeTitle,
        genre: forgeGenre,
        artStyle: forgeStyle,
        prompt: forgePrompt || `AI generated ${forgeGenre} in ${forgeStyle} theme.`,
      });

      const newStoreGame: StoreGame = {
        id: generated.id,
        title: generated.title,
        subtitle: `AI-Forged ${forgeGenre.toUpperCase()} • ${forgeStyle.replace("_", " ")}`,
        description: generated.description,
        author: "You & Argus AI Forge",
        category: "ai_forged",
        tags: ["AI Generated", forgeGenre, forgeStyle],
        rating: 5.0,
        downloads: 1,
        gamepadVerified: true,
        coverGradient:
          forgeStyle === "neon_cyberpunk"
            ? "from-cyan-600 to-rose-700"
            : forgeStyle === "retro_pixel"
            ? "from-indigo-700 to-purple-900"
            : "from-amber-600 to-red-700",
        accentColor: "#06b6d4",
        icon: "Zap",
        promptUsed: forgePrompt,
        playableType: "html5_canvas",
        sourceCode: generated.code,
        installed: true,
      };

      saveGameToStoreLibrary(newStoreGame);
      setCatalog(getStoreCatalog());
      setIsForging(false);
      setActivePlayGame(newStoreGame); // Launch immediately!
    }, 600);
  };

  const handleImportGame = () => {
    if (!importTitle.trim() || !importCode.trim()) return;

    let wrapped = importCode;
    if (!importCode.includes("<!DOCTYPE html>")) {
      wrapped = wrapGameWithArgusBridge(importCode, importTitle);
    }

    const importedGame: StoreGame = {
      id: "imported_" + Date.now(),
      title: importTitle,
      subtitle: "Imported Claude / v0 Community Title",
      description: "Imported custom HTML5/Canvas game wrapped with the Argus Gamepad Bridge.",
      author: "Community / Imported",
      category: "ai_forged",
      tags: ["Imported", "HTML5", "Custom"],
      rating: 5.0,
      downloads: 1,
      gamepadVerified: true,
      coverGradient: "from-emerald-700 to-teal-900",
      accentColor: "#10b981",
      icon: "Code",
      playableType: "html5_canvas",
      sourceCode: wrapped,
      installed: true,
    };

    saveGameToStoreLibrary(importedGame);
    setCatalog(getStoreCatalog());
    setImportTitle("");
    setImportCode("");
    setImportNotice("Game imported and verified! Ready to play.");
    setTimeout(() => setImportNotice(null), 3000);
  };

  // Filter games
  const filteredGames = catalog.filter((game) => {
    if (activeCategory === "installed" && !game.installed) return false;
    if (activeCategory !== "all" && activeCategory !== "installed" && game.category !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        game.title.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const featuredGame = catalog.find((g) => g.featured) ?? catalog[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 p-4">
      <div className="relative w-full max-w-6xl h-[860px] max-h-[94vh] bg-stone-950 rounded-2xl border border-stone-800 shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80 bg-stone-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-wider flex items-center gap-2">
                Argus Game Store
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-rose-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  AI Game Forge & Community Hub
                </span>
              </h1>
              <p className="text-xs text-stone-400">
                Play Community Games • Forge Prompt-to-Play Titles • Sideload Claude & v0 Artifacts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activePad && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs text-stone-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {activePad.name.slice(0, 20)}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories Bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-2.5 bg-stone-900/40 border-b border-stone-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Games" },
              { id: "ai_forged", label: "🤖 AI-Forged" },
              { id: "action", label: "Action" },
              { id: "roguelike", label: "Roguelike" },
              { id: "racing", label: "Racing" },
              { id: "arcade", label: "Arcade" },
              { id: "installed", label: "My Library" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as StoreCategory)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeCategory === cat.id
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search store games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-stone-900/80 border border-stone-800 focus:border-amber-500 text-xs text-stone-100 placeholder-stone-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Store Content Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-950 flex flex-col gap-8">
          {/* Featured Hero Banner */}
          {activeCategory === "all" && !searchQuery.trim() && featuredGame && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/50 via-stone-900 to-stone-950 border border-cyan-500/30 p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-cyan-500/50 transition-all">
              <div className="relative z-10 max-w-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Flame className="w-3 h-3" />
                    Featured Premiere
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Gamepad2 className="w-3 h-3" />
                    Gamepad Ready
                  </span>
                </div>

                <h2 className="text-2xl font-black text-white tracking-tight mb-1">
                  {featuredGame.title}
                </h2>
                <div className="text-xs font-bold text-amber-400 mb-2">{featuredGame.subtitle}</div>
                <p className="text-xs text-stone-300 leading-relaxed mb-4">
                  {featuredGame.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-stone-400">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <strong className="text-stone-200">{featuredGame.rating}</strong> Rating
                  </span>
                  <span>•</span>
                  <span>{featuredGame.downloads.toLocaleString()} Players</span>
                  <span>•</span>
                  <span className="text-cyan-400 font-mono">By {featuredGame.author}</span>
                </div>
              </div>

              <div className="flex flex-col items-stretch sm:items-end gap-2 w-full md:w-auto z-10">
                <button
                  onClick={() => setActivePlayGame(featuredGame)}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-black text-sm shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  PLAY NOW
                  <span className="hidden sm:inline-flex items-center ml-1 opacity-90">
                    <ButtonGlyph kind="south" pad={glyphLayout} />
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* AI Game Forge Studio Accordion / Section */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    AI Game Forge Studio
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                      Prompt-to-Play
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Type a concept and let Argus compile an instant playable game with auto gamepad bindings.
                  </p>
                </div>
              </div>
            </div>

            {/* Forge Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                  Game Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Neon Horizon 2099"
                  value={forgeTitle}
                  onChange={(e) => setForgeTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-600 focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Genre</label>
                <select
                  value={forgeGenre}
                  onChange={(e) => setForgeGenre(e.target.value as typeof forgeGenre)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:border-cyan-500 outline-none"
                >
                  <option value="runner">Endless Runner / Jumper</option>
                  <option value="shooter">Top-Down Space Shooter</option>
                  <option value="action">Arena Survival Brawler</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Art Style</label>
                <select
                  value={forgeStyle}
                  onChange={(e) => setForgeStyle(e.target.value as typeof forgeStyle)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:border-cyan-500 outline-none"
                >
                  <option value="neon_cyberpunk">Neon Cyberpunk</option>
                  <option value="retro_pixel">Retro 8-Bit Pixel</option>
                  <option value="vector_minimal">Vector Minimalist</option>
                  <option value="sunset_arcade">Sunset Arcade</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                Custom Prompt & Mechanics (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Describe special mechanics, enemy types, or sound aesthetics..."
                  value={forgePrompt}
                  onChange={(e) => setForgePrompt(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-600 focus:border-cyan-500 outline-none"
                />
                <button
                  onClick={handleForgeGame}
                  disabled={!forgeTitle.trim() || isForging}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {isForging ? "Synthesizing..." : "Forge & Play Game"}
                </button>
              </div>
            </div>
          </div>

          {/* Game Catalog Shelf */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-white text-base">
                {activeCategory === "all"
                  ? "All Games & AI Creations"
                  : activeCategory === "installed"
                  ? "My Installed Library"
                  : `${activeCategory.toUpperCase()} Games`}
              </h3>
              <span className="text-xs text-stone-400">{filteredGames.length} titles available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  onClick={() => setActivePlayGame(game)}
                  className="flex flex-col p-4 rounded-xl bg-stone-900/60 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-850 hover:scale-[1.01] active:scale-98 transition-all group cursor-pointer shadow-md"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                      {game.tags[0]}
                    </span>
                    <button
                      onClick={(e) => handleToggleInstall(game.id, e)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        game.installed
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : "bg-stone-800 border-stone-700 text-stone-400 hover:text-white"
                      }`}
                      title={game.installed ? "In Your Library" : "Install to Library"}
                    >
                      {game.installed ? <CheckCircle className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <h4 className="font-black text-white text-sm group-hover:text-amber-400 transition-colors mb-0.5 truncate">
                    {game.title}
                  </h4>
                  <div className="text-[11px] font-semibold text-stone-400 mb-2 truncate">
                    {game.subtitle}
                  </div>

                  <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed mb-4">
                    {game.description}
                  </p>

                  <div className="mt-auto pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-stone-400 text-[11px]">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-stone-200">{game.rating}</span>
                    </div>

                    <button
                      onClick={() => setActivePlayGame(game)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-800 group-hover:bg-amber-500 text-stone-200 group-hover:text-stone-950 font-bold text-[11px] transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Claude Artifact / v0 Sideload Importer */}
          <div className="p-6 rounded-2xl bg-stone-900/60 border border-stone-800 shadow-xl flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <Code className="w-4 h-4 text-emerald-400" />
              <h3 className="font-black text-white text-base">
                Sideload & Import AI Web Games (Claude Artifact / v0 Bridge)
              </h3>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed mb-3">
              Paste code from Claude Artifacts, v0, Bolt.new, or any web HTML5 canvas game. Argus will
              automatically wrap it with controller support and add it to your game store library.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">
                  Game Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Claude Pixel Platformer"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase text-stone-400 mb-1 block">
                  HTML5 or JavaScript Source Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste game source script or <html>...</html> code here..."
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white font-mono"
                  />
                  <button
                    onClick={handleImportGame}
                    disabled={!importTitle.trim() || !importCode.trim()}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black text-xs uppercase tracking-wider disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Import & Save
                  </button>
                </div>
              </div>
            </div>

            {importNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-in fade-in">
                {importNotice}
              </div>
            )}
          </div>
        </div>

        {/* Modal Game Runner Viewport */}
        {activePlayGame && (
          <GameRunnerModal game={activePlayGame} onClose={() => setActivePlayGame(null)} />
        )}
      </div>
    </div>
  );
};
