/**
 * Plugin assembly: exports the loader-entry contract (`inject` service names
 * + `apply(ctx)`) that the shell kernel adopts as a plugin entry.
 *
 * Wiring:
 *   theme.overrideTokens  → translucent surface tokens (the glass base)
 *   applyColumnBlur       → real backdrop-filter on the content columns
 *   wallpaper layer       → the "behind" content the blur shows
 *   settings.general.item → the controls row in General settings
 *
 * Lifecycle notes:
 *   - A ThemeRuntime rebuild drops override layers, so the override layer is
 *     re-applied on every `theme/change`.
 *   - All preferences live in localStorage (see storage.ts for why).
 */

import { defineStore } from "@deepseek-ai/dsh-client-runtime/client";

import { buildTokenOverrides } from "./core";
import {
  readPrefs,
  writeOn,
  writeAlpha,
  writeBlur,
  writeWallpaper,
  type GlassPrefs
} from "./storage";
import {
  applyWallpaper,
  applyColumnBlur,
  syncBodyBase,
  teardownWallpaper,
  teardownColumnBlur
} from "./dom";
import { SETTINGS_NS, dictionaries } from "./locale";
import { createGlassStore, GlassRow } from "./settings";

export { SETTINGS_NS };

export const inject = ["slots", "locale", "theme"];

/** Layer identity for the ThemeRuntime token override. */
const OVERRIDE_SOURCE = "dsh-frosted-glass:glass";

type ThemeService = {
  overrideTokens(
    source: string,
    tokens: Record<string, { light: string; dark: string }>
  ): () => void;
};

type LocaleService = {
  register(ns: string, dictionaries: { zh: Record<string, string>; en: Record<string, string> }): () => void;
};

type SlotRegistryService = {
  inject(name: string, callback: () => unknown): void;
  register(definition: unknown, component: unknown): unknown;
};

interface PluginCtx {
  theme: ThemeService;
  locale: LocaleService;
  slots: SlotRegistryService;
  on(event: string, handler: () => void): void;
  effect(effect: () => void | (() => void), name?: string): void;
}

let tokenDispose: (() => void) | null = null;
let applying = false;

/**
 * Apply the token override layer. ThemeRuntime's contract: calling
 * overrideTokens with the same source REPLACES that source's whole layer, so
 * re-applying needs no dispose-then-add — a dispose would publish its own
 * theme/change and re-enter the listener below.
 */
function applyTokens(ctx: PluginCtx, prefs: GlassPrefs): void {
  if (!prefs.on) {
    tokenDispose?.();
    tokenDispose = null;
    return;
  }
  tokenDispose = ctx.theme.overrideTokens(
    OVERRIDE_SOURCE,
    buildTokenOverrides({ alpha: prefs.alpha, blur: prefs.blur })
  );
}

/** Re-apply every visual layer from fresh preferences. */
function applyAll(ctx: PluginCtx): void {
  // ThemeRuntime publishes theme/change synchronously from overrideTokens
  // (and its disposer), and the vendored cordis dispatches every listener on
  // one shared hook table — so our own re-apply would otherwise recurse
  // forever. The guard collapses the re-entrant call.
  if (applying) return;
  applying = true;
  try {
    const prefs = readPrefs();
    applyTokens(ctx, prefs);
    applyColumnBlur(prefs.on ? prefs.blur : 0);
    applyWallpaper(prefs.on ? prefs.wallpaper : null);
    syncBodyBase();
  } finally {
    applying = false;
  }
}

export function apply(ctx: PluginCtx): void {
  const store = createGlassStore();
  let bound: { sync: (...args: unknown[]) => void } | undefined;
  let revision = 0;
  const sync = (prefs: GlassPrefs) => {
    revision += 1;
    // defineStore injects the draft as the first action argument itself —
    // callers pass only the remaining params (a stray first arg shifts every
    // field and corrupts the store state).
    bound?.sync(prefs.on, prefs.alpha, prefs.blur, prefs.wallpaper, revision);
  };

  applyAll(ctx);
  sync(readPrefs());

  // A ThemeRuntime rebuild can drop our override layer and React remounts can
  // replace frame columns; re-apply on every theme change event.
  ctx.on("theme/change", () => applyAll(ctx));

  ctx.effect(
    () => () => {
      tokenDispose?.();
      tokenDispose = null;
      teardownColumnBlur();
      teardownWallpaper();
    },
    "frosted-glass: cleanup"
  );
  ctx.effect(() => ctx.locale.register(SETTINGS_NS, dictionaries), "frosted-glass: dictionaries");

  ctx.slots.inject("settings.general.item", () =>
    ctx.slots.register(
      {
        name: "settings.general.item",
        id: "frosted-glass",
        order: 20,
        store,
        locale: SETTINGS_NS,
        inject: (actions: typeof bound) => {
          bound = actions;
          sync(readPrefs());
          return {
            setOn: (on: boolean) => {
              writeOn(on);
              applyAll(ctx);
              sync(readPrefs());
            },
            setAlpha: (percent: number) => {
              // UI speaks "transparency %" (bigger = more see-through);
              // the surface token alpha is the inverse (1 - t/100).
              const alpha = Math.min(0.95, Math.max(0.05, 1 - percent / 100));
              writeAlpha(alpha);
              applyAll(ctx);
              sync(readPrefs());
            },
            setBlur: (px: number) => {
              writeBlur(px);
              applyAll(ctx);
              sync(readPrefs());
            },
            setWallpaper: (url: string | null) => {
              writeWallpaper(url);
              applyAll(ctx);
              sync(readPrefs());
            }
          };
        }
      },
      GlassRow
    )
  );
}
