/**
 * TV Remote & Gamepad 10-Foot Navigation Engine
 *
 * Provides responsive D-Pad, TV remote, and controller (Xbox/PlayStation/Switch Pro)
 * event translation for the 10-foot couch cinema interface.
 */

export type TVActionType =
  | "NAV_UP"
  | "NAV_DOWN"
  | "NAV_LEFT"
  | "NAV_RIGHT"
  | "ACTION_SELECT"
  | "ACTION_BACK"
  | "ACTION_MENU"
  | "ACTION_SEARCH"
  | "PLAY_PAUSE"
  | "CHAPTER_PREV"
  | "CHAPTER_NEXT"
  | "VARIABLE_REWIND"
  | "VARIABLE_FORWARD";

export interface TVActionEvent {
  type: TVActionType;
  source: "gamepad" | "keyboard-remote" | "cec";
  magnitude?: number; // 0.0 to 1.0 for analog triggers
}

export type TVActionHandler = (event: TVActionEvent) => void;

const actionListeners = new Set<TVActionHandler>();

export function subscribeTVRemoteActions(handler: TVActionHandler): () => void {
  actionListeners.add(handler);
  return () => {
    actionListeners.delete(handler);
  };
}

export function dispatchTVAction(event: TVActionEvent): void {
  for (const fn of actionListeners) {
    try {
      fn(event);
    } catch {}
  }
}

/**
 * Translates keyboard & TV remote keydown events into structured TV actions.
 */
export function handleTVRemoteKey(e: { key: string; code?: string }): TVActionEvent | null {
  switch (e.key) {
    case "ArrowUp":
    case "Up":
      return { type: "NAV_UP", source: "keyboard-remote" };
    case "ArrowDown":
    case "Down":
      return { type: "NAV_DOWN", source: "keyboard-remote" };
    case "ArrowLeft":
    case "Left":
      return { type: "NAV_LEFT", source: "keyboard-remote" };
    case "ArrowRight":
    case "Right":
      return { type: "NAV_RIGHT", source: "keyboard-remote" };
    case "Enter":
    case "Select":
    case "Ok":
      return { type: "ACTION_SELECT", source: "keyboard-remote" };
    case "Escape":
    case "Back":
    case "GoBack":
      return { type: "ACTION_BACK", source: "keyboard-remote" };
    case "MediaPlayPause":
    case " ": // Space
      return { type: "PLAY_PAUSE", source: "keyboard-remote" };
    case "MediaTrackNext":
      return { type: "CHAPTER_NEXT", source: "keyboard-remote" };
    case "MediaTrackPrevious":
      return { type: "CHAPTER_PREV", source: "keyboard-remote" };
    case "ContextMenu":
    case "m":
    case "M":
      return { type: "ACTION_MENU", source: "keyboard-remote" };
    case "/":
    case "s":
    case "S":
      return { type: "ACTION_SEARCH", source: "keyboard-remote" };
    default:
      return null;
  }
}

/**
 * Maps standard gamepad button indexes to TV cinema actions.
 */
export function mapGamepadButtonIndex(
  buttonIndex: number,
  pressed: boolean,
  value: number = 1.0,
): TVActionEvent | null {
  if (!pressed && value < 0.2) return null;

  switch (buttonIndex) {
    case 0: // A / Cross
      return { type: "ACTION_SELECT", source: "gamepad" };
    case 1: // B / Circle
      return { type: "ACTION_BACK", source: "gamepad" };
    case 2: // X / Square
      return { type: "ACTION_MENU", source: "gamepad" };
    case 3: // Y / Triangle
      return { type: "ACTION_SEARCH", source: "gamepad" };
    case 4: // L1 Bumper
      return { type: "CHAPTER_PREV", source: "gamepad" };
    case 5: // R1 Bumper
      return { type: "CHAPTER_NEXT", source: "gamepad" };
    case 6: // L2 Trigger
      return { type: "VARIABLE_REWIND", source: "gamepad", magnitude: value };
    case 7: // R2 Trigger
      return { type: "VARIABLE_FORWARD", source: "gamepad", magnitude: value };
    case 9: // Start / Options
      return { type: "PLAY_PAUSE", source: "gamepad" };
    case 12: // D-Pad Up
      return { type: "NAV_UP", source: "gamepad" };
    case 13: // D-Pad Down
      return { type: "NAV_DOWN", source: "gamepad" };
    case 14: // D-Pad Left
      return { type: "NAV_LEFT", source: "gamepad" };
    case 15: // D-Pad Right
      return { type: "NAV_RIGHT", source: "gamepad" };
    default:
      return null;
  }
}

/**
 * Triggers subtle haptic rumble feedback on connected gamepads.
 */
export async function triggerGamepadHaptic(
  intensity: number = 0.3,
  durationMs: number = 50,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !("getGamepads" in navigator)) {
    return false;
  }

  const gamepads = navigator.getGamepads();
  let shook = false;

  for (const gp of gamepads) {
    if (gp && "vibrationActuator" in gp) {
      const actuator = (gp as unknown as { vibrationActuator?: { playEffect(type: string, options: any): Promise<void> } }).vibrationActuator;
      if (actuator) {
        try {
          await actuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration: durationMs,
            weakMagnitude: intensity,
            strongMagnitude: intensity * 0.5,
          });
          shook = true;
        } catch {}
      }
    }
  }

  return shook;
}
