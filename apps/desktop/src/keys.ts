/** Remappable player hotkeys; users override these in Settings (stored as JSON). */
export const ACTIONS: [id: string, label: string, def: string][] = [
  ["togglePause", "Play / pause", " "],
  ["back10", "Back 10 s", "ArrowLeft"],
  ["forward10", "Forward 10 s", "ArrowRight"],
  ["back30", "Back 30 s", "j"],
  ["forward30", "Forward 30 s", "l"],
  ["restart", "Restart from beginning", "0"],
  ["volumeUp", "Volume up", "ArrowUp"],
  ["volumeDown", "Volume down", "ArrowDown"],
  ["mute", "Mute", "m"],
  ["speedUp", "Faster", "]"],
  ["speedDown", "Slower", "["],
  ["speedReset", "Normal speed", "\\"],
  ["abLoop", "A-B loop (set A, set B, clear)", "b"],
  ["screenshot", "Save a screenshot", "s"],
  ["subEarlier", "Subtitles earlier", "z"],
  ["subLater", "Subtitles later", "x"],
  ["fullscreen", "Fullscreen", "f"],
  ["nextStream", "Try next stream", "n"],
  ["stop", "Close player", "Escape"],
];

export const DEFAULT_KEYS: Record<string, string> = Object.fromEntries(ACTIONS.map(([id, , def]) => [id, def]));
export const KEYS_SETTING = "player.keys";

export function keyName(k: string) {
  return k === " " ? "Space" : k.length === 1 ? k.toUpperCase() : k.replace("Arrow", "");
}

/** Action already bound to `key`, other than `except`. */
export function conflict(keys: Record<string, string>, key: string, except: string) {
  return ACTIONS.find(([id]) => id !== except && keys[id] === key)?.[1];
}
