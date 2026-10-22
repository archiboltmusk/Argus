/** Width of the canvas a phone lays Big Picture out on. Keep in step with index-tv.html. */
export const PHONE_CANVAS = 960;

/** Phones are the Android devices whose short side is under this many CSS pixels. */
export const PHONE_SHORT_SIDE = 600;

/**
 * Whether the Android entry lays out for a phone. A television reports Android too, so it is
 * excluded by the caller; a tablet is wide enough for the normal layout.
 */
export function usesPhoneLayout(opts: {
  android: boolean;
  tv: boolean;
  shortSide: number;
  enabled: boolean;
}): boolean {
  return opts.enabled && opts.android && !opts.tv && opts.shortSide < PHONE_SHORT_SIDE;
}
