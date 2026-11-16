import { useMemo, useState } from "react";
import {
  buildNarrativeGraph,
  type NarrativeGraphData,
  type CharacterNode,
} from "@/lib/player/narrative-graph";

export interface NarrativeGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeek: (timestampSec: number) => void;
  cues: Array<{ startSec: number; endSec: number; text: string }>;
  durationSec: number;
  currentPlaybackSec?: number;
}

function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function NarrativeGraphModal({
  isOpen,
  onClose,
  onSeek,
  cues,
  durationSec,
  currentPlaybackSec = 0,
}: NarrativeGraphModalProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterNode | null>(null);

  const graphData: NarrativeGraphData = useMemo(() => {
    return buildNarrativeGraph(cues, durationSec);
  }, [cues, durationSec]);

  const effectiveDuration = Math.max(1, graphData.totalDurationSec || durationSec || 1);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Character & Narrative Timeline"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">Narrative & Character Timeline</h2>
              <p className="text-xs text-zinc-400">
                Visual speech presence and character interactions across {formatTime(effectiveDuration)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {graphData.characters.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              No named character dialogue identified in the current subtitles.
            </div>
          ) : (
            <>
              {/* Timeline Tracks */}
              <div className="space-y-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
                <div className="flex justify-between text-[11px] text-zinc-500 font-mono mb-1">
                  <span>0:00</span>
                  <span>{formatTime(effectiveDuration / 2)}</span>
                  <span>{formatTime(effectiveDuration)}</span>
                </div>

                {graphData.characters.map((char) => {
                  const isSelected = selectedCharacter?.id === char.id;

                  return (
                    <div
                      key={char.id}
                      onClick={() => setSelectedCharacter(isSelected ? null : char)}
                      className={`group cursor-pointer rounded-lg p-2 transition-all ${
                        isSelected ? "bg-zinc-800/80 ring-1 ring-indigo-500/50" : "hover:bg-zinc-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: char.color }}
                          />
                          <span className="font-medium text-zinc-200 group-hover:text-white">
                            {char.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500">
                          {char.totalLines} lines
                        </span>
                      </div>

                      {/* Timeline Bar with character presence intervals */}
                      <div className="relative h-3 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                        {/* Playhead marker */}
                        {currentPlaybackSec > 0 && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow"
                            style={{
                              left: `${Math.min(100, (currentPlaybackSec / effectiveDuration) * 100)}%`,
                            }}
                          />
                        )}

                        {char.presenceSpans.map((span, sIdx) => {
                          const leftPct = (span.startSec / effectiveDuration) * 100;
                          const widthPct = Math.max(0.6, ((span.endSec - span.startSec) / effectiveDuration) * 100);

                          return (
                            <div
                              key={sIdx}
                              title={`${formatTime(span.startSec)} - ${span.snippet}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSeek(span.startSec);
                                onClose();
                              }}
                              className="absolute top-0 bottom-0 rounded-sm hover:brightness-125 transition-transform hover:scale-y-125 cursor-pointer"
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                backgroundColor: char.color,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Character Details or Top Co-Star Interactions */}
              {selectedCharacter ? (
                <div className="bg-zinc-850 p-4 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCharacter.color }} />
                      Scenes with {selectedCharacter.name}
                    </h3>
                    <button
                      onClick={() => onSeek(selectedCharacter.firstAppearanceSec)}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Jump to First Appearance ({formatTime(selectedCharacter.firstAppearanceSec)}) &rarr;
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {selectedCharacter.presenceSpans.slice(0, 10).map((span, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onSeek(span.startSec);
                          onClose();
                        }}
                        className="text-left p-2 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
                      >
                        <span className="font-mono text-indigo-300 text-[11px] block">
                          {formatTime(span.startSec)}
                        </span>
                        <span className="line-clamp-1 text-zinc-400">
                          {span.snippet}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                graphData.interactions.length > 0 && (
                  <div className="bg-zinc-850 p-4 rounded-xl border border-zinc-800">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Key Character Interactions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {graphData.interactions.slice(0, 8).map((inter, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (inter.timestamps[0] !== undefined) {
                              onSeek(inter.timestamps[0]);
                              onClose();
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-xs text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors border border-zinc-700/50"
                        >
                          <span className="capitalize">{inter.source}</span>
                          <span className="text-indigo-400">&harr;</span>
                          <span className="capitalize">{inter.target}</span>
                          <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1 rounded ml-1">
                            {inter.sharedScenesCount} scenes
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
