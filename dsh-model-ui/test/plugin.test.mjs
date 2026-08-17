/**
 * Regression harness for the dsh-model-ui split seat (方案四「双浪」).
 *
 * Loads the REAL built bundle (dist/client.js) in jsdom with faithful fakes:
 *   - ModelDirectoryResolver is faked as a marker class (the resolver itself
 *     is official code we mount unchanged; the harness asserts we mount it).
 *   - The seat component is rendered with react-dom against a scripted
 *     directory store, so interactions (model pick, effort slider snap,
 *     reset, max-wave classes) are exercised for real.
 *
 * Scenarios:
 *   1. apply() registers the seat into conversation.input.model with the
 *      native inject face and mounts the resolver.
 *   2. Seat renders split: model button + effort chip (label = effective
 *      effort); at max effort the chip carries .dmu-max and equalizer bars.
 *   3. Effort slider: dragging to a level commits select({...reasoningEffort})
 *      (snap on release); "使用模型默认" commits without reasoningEffort.
 *   4. Model menu: picking a model commits select with its default effort
 *      (explicit current effort preserved when set).
 */

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const React = require("react");
const { createRoot } = require("react-dom/client");
const { act } = require("react");

function setupDom(html) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { url: "http://127.0.0.1/" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.Image = dom.window.Image;
  globalThis.MutationObserver = dom.window.MutationObserver;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame ?? ((fn) => setTimeout(fn, 0));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
}

setupDom('<div id="root"></div>');

class FakeService {
  constructor(ctx, name) {
    this.ctx = ctx;
    this.name = name;
  }
}

const moduleTable = {
  "react": React,
  "react/jsx-runtime": require("react/jsx-runtime"),
  "@deepseek-ai/dsh-client-runtime/client": { createSnapshotStore: () => { throw new Error("harness: directory store not exercised"); } },
  "@deepseek-ai/cordis": { Service: FakeService }
};

function loadPlugin() {
  const listeners = {};
  const effects = [];
  const mounted = [];
  const locale = {
    dicts: null,
    register(ns, dictionaries) { locale.dicts = dictionaries; return () => {}; },
    bind(ns) {
      return (key, params) => {
        const dict = locale.dicts?.[ns] ?? {};
        let text = dict[key] ?? key;
        if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
        return text;
      };
    }
  };
  let registered = null;
  let commandRegistered = null;

  const scope = {
    get(name) { return this[name]; },
    effect(cb) { effects.push(cb); return cb; },
    slots: {
      inject(name, callback) { registered = callback(); },
      register(definition, component) { return { definition, component }; }
    },
    modelDirectories: {
      directoryFor(sessionId) {
        return { store: fakeStore, load: async () => fakeStore.getSnapshot(), select: async (sel) => { selectCalls.push(sel); return { ok: true }; } };
      }
    },
    sessions: { subagentAddress: () => undefined },
    commandUi: { register(def) { commandRegistered = def; return () => {}; } }
  };

  const ctx = {
    locale,
    plugin(plugin, options) { mounted.push({ plugin, options }); return {}; },
    inject(services, callback) { callback(scope); },
    effect(cb) { effects.push(cb); return cb; }
  };

  const bundle = readFileSync(new URL("../dist/client.js", import.meta.url), "utf8");
  const factoryBody = bundle.match(/factory: \(require\) => \{([\s\S]*)\n    return module\.exports;/)[1];
  const factory = new Function("require", `var module = { exports: {} };\nvar exports = module.exports;\n${factoryBody}\nreturn module.exports;`);
  const exportsObj = factory((name) => {
    const mod = moduleTable[name];
    if (!mod) throw new Error(`harness: unhandled external ${name}`);
    return mod;
  });

  return { ctx, exportsObj, mounted, scope, locale, get registered() { return registered; }, get command() { return commandRegistered; }, effects };
}

// ── scripted directory store ────────────────────────────────────────────────

const EFFORTS = [
  { id: "low", name: "Low", description: "轻量" },
  { id: "medium", name: "Medium", description: "平衡" },
  { id: "high", name: "High", description: "深度" },
  { id: "max", name: "Max", description: "全力以赴" }
];

function makeState(overrides = {}) {
  return {
    groups: [
      {
        id: "deepseek-official",
        name: "DeepSeek 官方",
        models: [
          {
            id: "deepseek-v4-flash",
            name: "DeepSeek-V4-Flash",
            description: "快速",
            reasoning: { defaultEffort: "medium", efforts: EFFORTS }
          },
          { id: "deepseek-v4", name: "DeepSeek-V4", description: "旗舰" }
        ]
      }
    ],
    failures: [],
    current: { provider: "deepseek-official", model: "deepseek-v4-flash", reasoningEffort: "max" },
    status: "ready",
    ...overrides
  };
}

let state = makeState();
let selectCalls = [];
let fakeStore = {
  subscribe(fn) { return () => {}; },
  getSnapshot() { return state; }
};

function resetStore() {
  state = makeState();
  selectCalls = [];
  fakeStore = {
    subscribe(fn) { return () => {}; },
    getSnapshot() { return state; }
  };
}

// ── scenario helpers ─────────────────────────────────────────────────────────

function boot() {
  const p = loadPlugin();
  p.exportsObj.apply(p.ctx);
  for (const effect of p.effects) effect();
  return p;
}

function mountSeat(p) {
  const { definition, component } = p.registered;
  const injectProps = definition.inject("session-1");
  assert.ok(injectProps.available, "seat must be available for a normal session");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const host = { root, container, rerender: null };
  host.rerender = (props) => {
    act(() => {
      root.render(React.createElement(component, { ...injectProps, locked: false, t: p.locale.bind("model-ui"), ...props }));
    });
  };
  host.rerender({});
  return host;
}

const textOf = (el) => (el?.textContent ?? "").trim();

// ── scenarios ───────────────────────────────────────────────────────────────

function runRegistration() {
  const p = boot();
  // the vendored ModelDirectoryResolver is mounted via ctx.plugin with the
  // composer block reason (its static inject lists the service faces)
  assert.equal(p.mounted.length, 1, "resolver mounted via ctx.plugin");
  const [mount] = p.mounted;
  assert.ok(Array.isArray(mount.plugin?.inject), "mounted plugin is the resolver (declares static inject)");
  assert.equal(typeof mount.options?.blockReason, "function", "resolver configured with a localized block reason");
  assert.ok(p.registered, "seat must be registered");
  assert.equal(p.registered.definition.name, "conversation.input.model");
  assert.ok(p.command, "/model command must be registered (parity)");
  const injectProps = p.registered.definition.inject("session-1");
  assert.equal(typeof injectProps.load, "function");
  assert.equal(typeof injectProps.select, "function");
  assert.ok(injectProps.directory, "directory store must be injected");

  // injected stylesheet: borderless pill triggers + UPWARD-opening menus
  const style = document.querySelector('style[data-plugin-css="dsh-model-ui"]');
  assert.ok(style, "wave stylesheet injected");
  const css = style.textContent;
  assert.ok(
    css.includes(".dmu-model-btn{min-width:0;max-width:220px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none"),
    "model trigger is a borderless pill (no boxy frame)"
  );
  assert.ok(css.includes(".dmu-menu{position:absolute;bottom:calc(100% + 8px);left:50%"), "model menu opens UPWARD, centered above the trigger");
  assert.ok(css.includes(".dmu-popover{position:absolute;bottom:calc(100% + 8px);left:50%"), "effort popover opens UPWARD, centered");
  assert.ok(css.includes("@keyframes dmu-pop-in"), "popups have a small pop-in animation");
  assert.ok(css.includes(".dmu-groups{min-height:0;overflow-y:auto}"), "menu has an inner scroll container");
  assert.ok(css.includes(".dmu-chip.dmu-static"), "single-effort models render a static chip");
}

function runSplitRender() {
  resetStore();
  const p = boot();
  const host = mountSeat(p);
  const buttons = host.container.querySelectorAll("button");
  // model button + effort chip (two separate controls)
  assert.ok(textOf(buttons[0]).includes("DeepSeek-V4-Flash"), "model button shows the model name");
  assert.ok(buttons[1].className.includes("dmu-chip"), "second control is the effort chip");
  assert.ok(textOf(buttons[1]).includes("Max"), "chip shows the effective effort label");
  assert.ok(buttons[1].className.includes("dmu-max"), "chip carries dmu-max at the highest effort");
  const maxEq = host.container.querySelector(".dmu-eq");
  assert.ok(maxEq, "equalizer bars render at max effort");
  const maxDur = parseFloat(maxEq.style.getPropertyValue("--dmu-dur") || "1");
  assert.ok(maxDur < 0.8, "max wave is fast (duration < 0.8s): " + maxDur);

  // switch to a midpoint level → wave still shows but SLOWER, no dmu-max
  state = makeState({ current: { provider: "deepseek-official", model: "deepseek-v4-flash", reasoningEffort: "high" } });
  host.rerender({});
  const chip = host.container.querySelector(".dmu-chip");
  assert.ok(!chip.className.includes("dmu-max"), "no dmu-max at midpoint effort");
  const midEq = host.container.querySelector(".dmu-eq");
  assert.ok(midEq, "wave renders at midpoint effort too (speed distinguishes level)");
  const midDur = parseFloat(midEq.style.getPropertyValue("--dmu-dur") || "1");
  assert.ok(midDur > maxDur, "midpoint wave is slower than max (" + midDur + " > " + maxDur + ")");

  // lowest level (low, ratio 0) → a flat, motionless line, no undulation
  state = makeState({ current: { provider: "deepseek-official", model: "deepseek-v4-flash", reasoningEffort: "low" } });
  host.rerender({});
  assert.ok(!host.container.querySelector(".dmu-eq"), "lowest level has no animated equalizer");
  assert.ok(host.container.querySelector(".dmu-flat"), "lowest level shows a flat line");

  // a model at its default effort (medium) → wave at medium speed
  state = makeState({ current: { provider: "deepseek-official", model: "deepseek-v4-flash" } });
  host.rerender({});
  const defEq = host.container.querySelector(".dmu-eq");
  assert.ok(defEq, "default effort is a concrete level → wave shows (medium speed)");

  // a model with NO default and NO explicit effort → no concrete level → no wave
  state = makeState({
    groups: [
      {
        id: "kimi",
        name: "Kimi",
        models: [
          { id: "k2", name: "Kimi K2", reasoning: { efforts: EFFORTS } } // no defaultEffort
        ]
      }
    ],
    current: { provider: "kimi", model: "k2" }
  });
  host.rerender({});
  assert.ok(host.container.querySelector(".dmu-chip"), "chip still renders for a no-default model");
  assert.ok(!host.container.querySelector(".dmu-eq"), "no wave when no concrete level is active");

  host.root.unmount();
}

function runSingleEffortStatic() {
  // Kimi-K3-style model: a single fixed effort level → the chip is a static
  // badge (no dead slider, no popover) pinned to that level.
  resetStore();
  state = makeState({
    groups: [
      {
        id: "kimi",
        name: "Kimi",
        models: [
          {
            id: "kimi-k3",
            name: "Kimi K3",
            // Real Kimi K3 shape: ONE effort, NO defaultEffort, host current
            // carries no explicit effort either.
            reasoning: { efforts: [{ id: "max", name: "Max", description: "固定" }] }
          }
        ]
      }
    ],
    current: { provider: "kimi", model: "kimi-k3" }
  });
  const p = boot();
  const host = mountSeat(p);
  const chip = host.container.querySelector(".dmu-chip");
  assert.ok(chip, "chip renders for a single-effort model");
  assert.ok(chip.className.includes("dmu-static"), "chip is static (no choice)");
  assert.ok(chip.disabled, "chip disabled — a fixed effort offers no interaction");
  assert.ok(textOf(chip).includes("Max"), "chip shows the pinned single level, not 默认");
  assert.ok(chip.className.includes("dmu-max"), "single pinned level is treated as max (wave)");
  // clicking must NOT open a popover
  act(() => { chip.click(); });
  assert.ok(!host.container.querySelector(".dmu-popover"), "no popover for a single-effort model");

  host.root.unmount();
}

function runEffortSlider() {
  resetStore();
  const p = boot();
  const host = mountSeat(p);

  // open the effort popover
  act(() => { host.container.querySelectorAll("button")[1].click(); });
  const popover = host.container.querySelector(".dmu-popover");
  assert.ok(popover, "effort popover opens on chip click");
  assert.ok(popover.querySelector(".dmu-reset"), "reset button present");
  const slider = popover.querySelector("input[type=range]");
  assert.equal(slider.max, "3", "slider spans the effort levels");

  // drag to Low (snap commit on change)
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(slider, "0");
    slider.dispatchEvent(new window.Event("input", { bubbles: true }));
    slider.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  assert.equal(selectCalls.length, 1, "slider release commits one selection");
  assert.deepEqual(selectCalls[0], { provider: "deepseek-official", model: "deepseek-v4-flash", reasoningEffort: "low" });
  assert.ok(textOf(popover.querySelector(".dmu-name")).includes("Low"), "popover preview follows the slider");

  // reset to model default → commit without reasoningEffort
  selectCalls.length = 0;
  act(() => { popover.querySelector(".dmu-reset").click(); });
  assert.equal(selectCalls.length, 1, "reset commits one selection");
  assert.deepEqual(selectCalls[0], { provider: "deepseek-official", model: "deepseek-v4-flash" }, "reset drops reasoningEffort");

  host.root.unmount();
}

function runModelMenu() {
  resetStore();
  const p = boot();
  const host = mountSeat(p);

  // open the model menu
  act(() => { host.container.querySelectorAll("button")[0].click(); });
  const menu = host.container.querySelector(".dmu-menu");
  assert.ok(menu, "model menu opens");
  const rows = menu.querySelectorAll(".dmu-row");
  assert.equal(rows.length, 2, "both models listed");
  // pick the second model → native semantics: submit {provider, model} only
  act(() => { rows[1].click(); });
  assert.equal(selectCalls.length, 1, "model pick commits one selection");
  assert.deepEqual(selectCalls[0], { provider: "deepseek-official", model: "deepseek-v4" }, "model change submits provider/model only (host applies default effort)");

  host.root.unmount();
}

runRegistration();
runSplitRender();
runSingleEffortStatic();
runEffortSlider();
runModelMenu();
console.log("ALL HARNESS SCENARIOS PASSED");
