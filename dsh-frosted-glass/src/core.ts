/**
 * Pure engine: GlassConfig → ThemeRuntime token overrides.
 *
 * No DOM, no imports of harness internals — unit-testable in isolation.
 * The only authority this module has is the surface-token inventory
 * (verified against the rc.6 design-platform.css token table).
 */

export interface GlassConfig {
  /** Surface translucency: 0.95 = nearly transparent, 0.05 = nearly opaque. */
  alpha: number;
  /** Backdrop blur radius in px. 0 disables blur. */
  blur: number;
}

export interface TokenOverride {
  light: string;
  dark: string;
}

/**
 * Every surface the shell paints, page base included. These are the
 * backgrounds that must go translucent for the frosted look; label/border
 * tokens are deliberately absent so contrast stays readable.
 *
 * Policy (verified against the live UI with CDP):
 *  - Only surfaces that sit INSIDE a blurred content column go translucent —
 *    their backdrop is the blurred column, so translucency reads as frosted
 *    glass.
 *  - Popup/overlay surfaces (`--dsw-specific-menu`, `--dsw-alias-bg-overlay`,
 *    `--dsw-specific-selector`, `--dsw-specific-tip`) stay OPAQUE: they mount
 *    in the overlay layer or as popovers that never sit under a blurred
 *    column, so translucency would let the underlying text bleed through.
 *    (Fixed overlays like the settings panel get their own blur via the
 *    guard's handoff in dom.ts instead.)
 *  - Brand/state/interactive tokens stay solid on purpose (contrast +
 *    feedback).
 */
export const SURFACE_TOKENS = [
  "--dsw-alias-bg-base",
  "--dsw-alias-bg-layer-1",
  "--dsw-alias-bg-layer-2",
  "--dsw-alias-bg-layer-3",
  "--dsw-specific-sidebar-fill",
  "--dsw-specific-bubble",
  "--dsw-specific-bubble-highlight",
  "--dsw-alias-markdown-code-block",
  "--dsw-alias-markdown-inline-code",
  "--dsw-specific-input-major",
  "--dsw-alias-bg-multi-select",
  "--dsw-alias-bg-module-platform",
  "--dsw-alias-button-tool-bar-fill",
  "--dsw-alias-button-tool-bar-fill-invisible",
  "--dsw-alias-button-elevated-fill",
  "--dsw-alias-button-floating-fill",
  "--dsw-alias-button-ghost-active-fill",
  "--dsw-alias-markdown-code-block-banner"
] as const;

/** Neutral surfaces per scheme — the classic frosted-glass recipe. */
export const LIGHT_SURFACE = "#ffffff";
export const DARK_SURFACE = "#151517";

/**
 * Popup/overlay surfaces pinned OPAQUE regardless of the glass alpha. The
 * override layer is token-level: `--dsw-specific-menu` ALIASES the glassed
 * `--dsw-alias-bg-layer-3` (design-platform.css), so removing it from the
 * glass list is not enough — menus would inherit the translucent layer value
 * and let the underlying text bleed through. Pinning the alias to an opaque
 * value in the same override layer wins over the stylesheet alias.
 */
export const OPAQUE_PINS: Record<string, TokenOverride> = {
  "--dsw-specific-menu": { light: LIGHT_SURFACE, dark: DARK_SURFACE }
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function toRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function clampAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) return 0.55;
  return Math.min(0.95, Math.max(0.05, alpha));
}

export function clampBlur(px: number): number {
  if (!Number.isFinite(px)) return 10;
  return Math.min(30, Math.max(0, Math.round(px)));
}

/**
 * Build the ThemeRuntime override map for one translucency level. Surface
 * tokens share the glass alpha; opaque pins stay solid (readability for
 * popups that alias glassed tokens).
 */
export function buildTokenOverrides(config: GlassConfig): Record<string, TokenOverride> {
  const alpha = clampAlpha(config.alpha);
  const overrides: Record<string, TokenOverride> = {};
  for (const token of SURFACE_TOKENS) {
    overrides[token] = {
      light: toRgba(LIGHT_SURFACE, alpha),
      dark: toRgba(DARK_SURFACE, alpha)
    };
  }
  for (const [token, value] of Object.entries(OPAQUE_PINS)) {
    overrides[token] = value;
  }
  return overrides;
}
