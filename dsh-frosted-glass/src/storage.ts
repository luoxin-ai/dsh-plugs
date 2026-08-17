/**
 * Preferences persistence. localStorage is the correct boundary for
 * third-party visual preferences: the Host settings wire only exposes an
 * allowlisted namespace set to browser clients, and visual state belongs
 * to the browser anyway.
 */

import { clampAlpha, clampBlur } from "./core";

export interface GlassPrefs {
  /** Master switch for the whole skin. */
  on: boolean;
  /** Surface translucency (0.05–0.95). */
  alpha: number;
  /** Backdrop blur radius in px (0–30; 0 = translucency only). */
  blur: number;
  /** Wallpaper URL (data: or https:), or null for none. */
  wallpaper: string | null;
}

export const DEFAULT_PREFS: GlassPrefs = {
  on: true,
  alpha: 0.55,
  blur: 10,
  wallpaper: "https://picsum.photos/1920/1080"
};

export const KEY_ON = "dsh-frosted-glass:on";
export const KEY_ALPHA = "dsh-frosted-glass:alpha";
export const KEY_BLUR = "dsh-frosted-glass:blur";
export const KEY_WALLPAPER = "dsh-frosted-glass:wallpaper";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* quota exceeded — ignore */
  }
}

/**
 * Wallpaper storage convention:
 *   - key absent  → never touched → default wallpaper (DEFAULT_PREFS)
 *   - key ""      → explicitly removed → no wallpaper
 *   - key <url>   → user's own choice
 */
export function readPrefs(): GlassPrefs {
  const rawOn = readStorage(KEY_ON);
  const rawAlpha = readStorage(KEY_ALPHA);
  const rawBlur = readStorage(KEY_BLUR);
  const rawWallpaper = readStorage(KEY_WALLPAPER);
  return {
    on: rawOn === null ? DEFAULT_PREFS.on : rawOn === "on",
    alpha: rawAlpha === null ? DEFAULT_PREFS.alpha : clampAlpha(Number(rawAlpha)),
    blur: rawBlur === null ? DEFAULT_PREFS.blur : clampBlur(Number(rawBlur)),
    wallpaper:
      rawWallpaper === null ? DEFAULT_PREFS.wallpaper : rawWallpaper === "" ? null : rawWallpaper
  };
}

export function writeOn(on: boolean): void {
  writeStorage(KEY_ON, on ? "on" : "off");
}

export function writeAlpha(alpha: number): void {
  writeStorage(KEY_ALPHA, String(clampAlpha(alpha)));
}

export function writeBlur(blur: number): void {
  writeStorage(KEY_BLUR, String(clampBlur(blur)));
}

export function writeWallpaper(url: string | null): void {
  // null means "explicitly removed" — store "" so the default does not
  // resurrect on the next load.
  writeStorage(KEY_WALLPAPER, url === null ? "" : url);
}
