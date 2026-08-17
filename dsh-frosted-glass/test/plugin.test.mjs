/**
 * Regression harness for the frosted-glass client plugin.
 *
 * Loads the REAL built bundle (dist/client.js) in jsdom, with faithful fakes
 * for the harness seams:
 *   - theme service: mirrors ThemeRuntime's overrideTokens contract exactly
 *     (same-source layer replace, synchronous `theme/change` emit, disposer
 *     no-op on stale layer)
 *   - slots registry: inject() runs the contribution synchronously; register()
 *     creates the store (real defineStore from the installed client-runtime)
 *     and wires def.inject(actions)
 *   - locale: captures dictionaries
 *   - ctx.on: captures listeners; ctx.effect: runs + captures disposers
 *
 * The real @deepseek-ai/dsh-client-runtime/client is used for defineStore, so
 * the draft-injection contract is exercised, not faked.
 *
 * Scenarios (the two reported bugs):
 *   1. toggle OFF then ON — glass layer must be removed, then re-added
 *   2. opacity slider — override layer must be replaced with the new alpha
 *   3. theme/change re-entry — must not recurse infinitely (stack overflow)
 *   4. store state — must reflect the synced preferences (not corrupted)
 */

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);

function setupDom(html) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url: "http://127.0.0.1/" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.Image = dom.window.Image;
  globalThis.MutationObserver = dom.window.MutationObserver;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
}

setupDom(
  '<div id="root"><div class="frame"><div class="sidebar">s</div><div class="center">c</div><div class="details">d</div><div data-shell-overlay="true">o</div></div></div>'
);

// ── module table for the bundle's externals ─────────────────────────────────
//
// The installed @deepseek-ai/dsh-client-runtime package's `./client` export is
// itself a browser bundle (window.__ModuleLoader__.load), so it cannot load in
// Node. We fake defineStore with the exact contract verified from its source:
//   actions[key] = (...params) => store.update((draft) => { mutate(draft, ...params) })
// i.e. the draft is INJECTED as the first argument — callers must not pass it.

function fakeDefineStore(decl) {
  return {
    spec: decl,
    create() {
      const store = { state: decl.init() };
      const actions = {};
      for (const key of Object.keys(decl.actions)) {
        const mutate = decl.actions[key];
        actions[key] = (...params) => {
          const draft = { ...store.state }; // flat state — shallow copy suffices
          mutate(draft, ...params);
          store.state = draft;
        };
      }
      return {
        actions,
        getSnapshot: () => store.state,
        subscribe: () => () => {},
        store,
        clearPersisted: () => {}
      };
    }
  };
}

const moduleTable = {
  "react": require("react"),
  "react/jsx-runtime": require("react/jsx-runtime"),
  "@deepseek-ai/dsh-client-runtime/client": { defineStore: fakeDefineStore }
};

// ── faithful ThemeRuntime fake ──────────────────────────────────────────────

function createFakeTheme(emit) {
  const state = {
    overrides: new Map(),
    seq: 0,
    calls: [],
    snapshot: { preference: "system", active: { id: "light", tokens: {} }, themes: [], revision: 0 }
  };
  const service = {
    state,
    overrideTokens(source, tokens) {
      state.calls.push({ op: "override", source, tokenCount: Object.keys(tokens).length, tokens: Object.keys(tokens), tokenValues: tokens });
      const layer = { seq: state.seq++, source, tokens };
      state.overrides.set(source, layer);
      state.snapshot = { ...state.snapshot, revision: state.snapshot.revision + 1 };
      emit("theme/change", state.snapshot); // synchronous, like the real publish()
      return () => {
        if (state.overrides.get(source) !== layer) return; // stale disposer no-op
        state.overrides.delete(source);
        state.calls.push({ op: "dispose", source });
        state.snapshot = { ...state.snapshot, revision: state.snapshot.revision + 1 };
        emit("theme/change", state.snapshot);
      };
    }
  };
  return service;
}

// ── run one scenario against the bundle ─────────────────────────────────────

function loadPlugin() {
  const listeners = {};
  const effects = [];
  const locale = { dicts: null, register(ns, dictionaries) { locale.dicts = dictionaries; return () => {}; } };
  let registered = null;
  let storeHandle = null;

  const theme = createFakeTheme((event) => {
    for (const cb of listeners[event] ?? []) cb();
  });

  const ctx = {
    theme,
    locale,
    slots: {
      inject(name, callback) {
        assert.equal(name, "settings.general.item");
        registered = callback(); // run the contribution synchronously
      },
      register(definition, component) {
        assert.ok(definition.store, "registration must carry a store");
        storeHandle = definition.store.create();
        const injectedProps = definition.inject(storeHandle.actions);
        return { definition, component, injectedProps, storeHandle };
      }
    },
    on(event, cb) {
      (listeners[event] ??= []).push(cb);
    },
    effect(cb) {
      effects.push(cb);
      return cb;
    }
  };

  const bundle = readFileSync(new URL("../dist/client.js", import.meta.url), "utf8");
  const factoryBody = bundle.match(/factory: \(require\) => \{([\s\S]*)\n    return module\.exports;/)[1];
  const factory = new Function("require", `var module = { exports: {} };\nvar exports = module.exports;\n${factoryBody}\nreturn module.exports;`);
  const exportsObj = factory((name) => {
    const mod = moduleTable[name];
    if (!mod) throw new Error(`harness: unhandled external ${name}`);
    return mod;
  });
  assert.ok(exportsObj.apply, "bundle must export apply");
  assert.ok(exportsObj.inject, "bundle must export inject");

  const cleanup = [];
  for (const effect of effects) {
    const disposer = effect();
    if (typeof disposer === "function") cleanup.push(disposer);
  }

  return {
    ctx,
    exportsObj,
    cleanup,
    listeners,
    theme,
    get registered() { return registered; },
    get store() { return storeHandle; }
  };
}

function scenario() {
  const p = loadPlugin();
  p.exportsObj.apply(p.ctx);
  const actions = p.registered.injectedProps;
  assert.ok(actions, "inject must return actions");
  return p;
}

// ── scenarios ───────────────────────────────────────────────────────────────

function runToggleOffOn() {
  const p = scenario();
  // initial: layer applied
  assert.equal(p.theme.state.overrides.size, 1, "glass layer applied at activation");
  assert.equal(p.theme.state.calls[0].op, "override");
  // columns blurred
  const columns = Array.from(document.querySelectorAll(".frame > div:not([data-shell-overlay])"));
  assert.ok(columns.every((el) => el.style.backdropFilter.includes("blur(10px)")), "columns blurred at activation");

  // toggle OFF
  p.registered.injectedProps.setOn(false);
  assert.equal(p.theme.state.overrides.size, 0, "glass layer removed on OFF");
  assert.ok(columns.every((el) => el.style.backdropFilter === ""), "column blur cleared on OFF");

  // toggle ON — the reported bug: must come back
  p.registered.injectedProps.setOn(true);
  assert.equal(p.theme.state.overrides.size, 1, "glass layer re-added on ON");
  const reBlur = document.querySelectorAll(".frame > div:not([data-shell-overlay])");
  assert.ok(Array.from(reBlur).every((el) => el.style.backdropFilter.includes("blur(10px)")), "column blur restored on ON");

  // store state must reflect the final prefs
  const s = p.store.getSnapshot();
  assert.equal(s.on, true, "store.on reflects ON");
  assert.equal(typeof s.alpha, "number", "store.alpha is a number (not corrupted)");
  assert.equal(typeof s.blur, "number", "store.blur is a number (not corrupted)");

  for (const dispose of p.cleanup) dispose();
}

function runOpacity() {
  const p = scenario();
  // drag to 70% transparency → alpha = 0.3
  p.registered.injectedProps.setAlpha(70);
  assert.equal(p.theme.state.overrides.size, 1, "one layer remains");
  const last = p.theme.state.calls.filter((c) => c.op === "override").at(-1);
  assert.equal(last.tokenCount, 19, "override carries the surface token set + opaque pins");
  assert.ok(
    last.tokens.includes("--dsw-specific-input-major"),
    "input-major surface (new-session card/button) must be glassed"
  );
  assert.ok(
    last.tokens.includes("--dsw-specific-menu"),
    "menu token must be pinned in the override layer (it aliases the glassed layer-3)"
  );
  assert.equal(
    last.tokenValues["--dsw-specific-menu"].light,
    "#ffffff",
    "menu pin must be OPAQUE so popup text never bleeds through"
  );
  assert.ok(
    !last.tokens.includes("--dsw-alias-bg-overlay"),
    "overlay surfaces must stay opaque (readability)"
  );
  const s = p.store.getSnapshot();
  assert.equal(Math.round(s.alpha * 100), 30, "store.alpha synced to 0.3");

  for (const dispose of p.cleanup) dispose();
}

function runNoReentryLoop() {
  const p = scenario();
  // The reported crash: theme/change emitted synchronously by our own
  // overrideTokens must not re-enter applyAll forever. With the guard this
  // completes; without it the stack overflows.
  assert.doesNotThrow(() => p.registered.injectedProps.setAlpha(50), "no stack overflow on setAlpha");
  assert.doesNotThrow(() => p.registered.injectedProps.setOn(false), "no stack overflow on OFF");
  assert.doesNotThrow(() => p.registered.injectedProps.setOn(true), "no stack overflow on ON");
  // and a foreign theme/change (e.g. user switching built-in theme) is safe too
  assert.doesNotThrow(() => {
    for (const cb of p.listeners["theme/change"] ?? []) cb();
  }, "no stack overflow on foreign theme/change");

  for (const dispose of p.cleanup) dispose();
}

async function runLateFrame() {
  // The shell mounts the layout AFTER the plugin activates; blur must wait
  // for the frame instead of silently dropping.
  setupDom('<div id="root"></div>');
  const p = loadPlugin();
  p.exportsObj.apply(p.ctx);
  // no frame yet → observer armed, nothing blurred
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(document.querySelectorAll(".frame > div").length, 0, "frame not mounted yet");
  // layout mounts
  const frame = document.createElement("div");
  frame.className = "frame";
  frame.innerHTML =
    '<div class="sidebar">s</div><div class="center">c</div><div class="details">d</div><div data-shell-overlay="true">o</div>';
  document.getElementById("root").appendChild(frame);
  await new Promise((resolve) => setTimeout(resolve, 20));
  const columns = Array.from(frame.children).filter((el) => !el.hasAttribute("data-shell-overlay"));
  assert.ok(
    columns.every((el) => el.style.backdropFilter.includes("blur(10px)")),
    "blur applied once the frame appears"
  );
  // toggle OFF clears it and disarms the observer
  p.registered.injectedProps.setOn(false);
  assert.ok(columns.every((el) => el.style.backdropFilter === ""), "blur cleared on OFF");
  // a later frame mutation must not re-blur while OFF
  const extra = document.createElement("div");
  extra.className = "center";
  frame.appendChild(extra);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(extra.style.backdropFilter, "", "no blur while OFF");

  for (const dispose of p.cleanup) dispose();
}

async function runFixedOverlayGuard() {
  // The real-app regression: the settings panel is a position:fixed child of
  // the sidebar column; backdrop-filter on the column traps it in the
  // sidebar box. The guard must strip the column's blur while the overlay is
  // mounted, and restore it after unmount.
  setupDom(
    '<div id="root"><div class="frame"><div class="sidebar">s</div><div class="center">c</div><div class="details">d</div><div data-shell-overlay="true">o</div></div></div>'
  );
  const p = scenario();
  const sidebar = document.querySelector(".sidebar");
  const center = document.querySelector(".center");
  const details = document.querySelector(".details");
  assert.ok(sidebar.style.backdropFilter.includes("blur(10px)"), "sidebar blurred at activation");

  // overlay mounts inside the sidebar column
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.width = "400px";
  overlay.style.height = "500px";
  sidebar.appendChild(overlay);
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(sidebar.style.backdropFilter, "", "sidebar blur stripped while it hosts a fixed overlay");
  assert.ok(
    overlay.style.backdropFilter.includes("blur(10px)"),
    "blur handed off to the overlay itself (frosted, not see-through)"
  );
  assert.ok(center.style.backdropFilter.includes("blur(10px)"), "center column stays blurred");
  assert.ok(details.style.backdropFilter.includes("blur(10px)"), "details column stays blurred");

  // overlay unmounts → its blur cleared, column blur restored
  overlay.remove();
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(overlay.style.backdropFilter, "", "overlay blur cleared on unmount");
  assert.ok(sidebar.style.backdropFilter.includes("blur(10px)"), "sidebar blur restored after overlay unmounts");

  for (const dispose of p.cleanup) dispose();
}

runToggleOffOn();
runOpacity();
runNoReentryLoop();
await runLateFrame();
await runFixedOverlayGuard();
console.log("ALL HARNESS SCENARIOS PASSED");
