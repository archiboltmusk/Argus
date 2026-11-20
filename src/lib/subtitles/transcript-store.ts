import { useSyncExternalStore } from "react";
import type { SubCue } from "./parser";

export interface TranscriptState {
  isOpen: boolean;
  mediaUrl: string | null;
  cues: SubCue[];
  currentSec: number;
  activeCueIndex: number;
  searchQuery: string;
}

let state: TranscriptState = {
  isOpen: false,
  mediaUrl: null,
  cues: [],
  currentSec: 0,
  activeCueIndex: -1,
  searchQuery: "",
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function openTranscriptDrawer(initialCues?: SubCue[]): void {
  state = {
    ...state,
    isOpen: true,
    cues: initialCues && initialCues.length > 0 ? initialCues : state.cues,
  };
  notify();
}

export function closeTranscriptDrawer(): void {
  state = { ...state, isOpen: false };
  notify();
}

export function toggleTranscriptDrawer(): void {
  state = { ...state, isOpen: !state.isOpen };
  notify();
}

export function setTranscriptCues(cues: SubCue[], mediaUrl: string): void {
  state = {
    ...state,
    cues,
    mediaUrl,
    ...(state.mediaUrl !== mediaUrl ? { activeCueIndex: -1, searchQuery: "" } : {}),
  };
  notify();
}

export function updateTranscriptPlaybackTime(timeSec: number): void {
  let activeIdx = -1;
  for (let i = 0; i < state.cues.length; i++) {
    const cue = state.cues[i];
    if (timeSec >= cue.start && timeSec <= cue.end) {
      activeIdx = i;
      break;
    }
  }

  if (state.currentSec !== timeSec || state.activeCueIndex !== activeIdx) {
    state = {
      ...state,
      currentSec: timeSec,
      activeCueIndex: activeIdx,
    };
    notify();
  }
}

export function setTranscriptSearchQuery(query: string): void {
  state = { ...state, searchQuery: query };
  notify();
}

export function useTranscriptState(): TranscriptState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
