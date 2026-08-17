window.__ModuleLoader__.load({
  id: "dsh-model-ui",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    
    // src/plugin.ts
    var plugin_exports = {};
    __export(plugin_exports, {
      NS: () => NS,
      apply: () => apply,
      inject: () => inject
    });
    module.exports = __toCommonJS(plugin_exports);
    
    // src/directory.ts
    var import_client = require("@deepseek-ai/dsh-client-runtime/client");
    var import_cordis = require("@deepseek-ai/cordis");
    var ModelDirectory = class {
      sessions;
      sessionId;
      available;
      /** The shared snapshot both entries render from (uSES-safe store). */
      store = (0, import_client.createSnapshotStore)({
        current: null,
        routable: null,
        groups: [],
        failures: [],
        status: "idle",
        error: null
      });
      /** Latest operation wins; an older response never overwrites a newer one. */
      generation = 0;
      disposed = false;
      constructor(sessions, sessionId, available) {
        this.sessions = sessions;
        this.sessionId = sessionId;
        this.available = available;
      }
      async load() {
        this.assertAvailable();
        const generation = ++this.generation;
        this.store.update((s) => {
          s.status = "loading";
          s.error = null;
        });
        const { result } = await this.sessions.models({ sessionId: this.sessionId });
        if (this.disposed || generation !== this.generation) {
          if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
          return result.value;
        }
        if (!result.ok) {
          this.store.update((s) => {
            s.status = "error";
            s.error = `${result.error.code}: ${result.error.message}`;
          });
          throw new Error(`session.models failed: ${result.error.code}: ${result.error.message}`);
        }
        const { current, routable, groups, failures } = result.value;
        this.store.update((s) => {
          s.current = current;
          s.routable = routable;
          s.groups = groups;
          s.failures = failures;
          s.status = "ready";
          s.error = null;
        });
        return result.value;
      }
      async select(selection) {
        this.assertAvailable();
        const generation = ++this.generation;
        this.store.update((s) => {
          s.status = "selecting";
          s.error = null;
        });
        const { result } = await this.sessions.selectModel({
          sessionId: this.sessionId,
          provider: selection.provider,
          model: selection.model,
          ...selection.reasoningEffort === void 0 ? {} : { reasoningEffort: selection.reasoningEffort }
        });
        if (this.disposed || generation !== this.generation) {
          if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
          return;
        }
        if (!result.ok) {
          this.store.update((s) => {
            s.status = "error";
            s.error = `${result.error.code}: ${result.error.message}`;
          });
          throw new Error(`session.selectModel failed: ${result.error.code}: ${result.error.message}`);
        }
        this.store.update((s) => {
          s.current = result.value.selected;
          s.routable = true;
          s.status = "ready";
          s.error = null;
        });
      }
      resetConnected() {
        if (this.disposed) return;
        ++this.generation;
        this.store.update((s) => {
          s.current = null;
          s.routable = null;
          s.groups = [];
          s.failures = [];
          s.status = "idle";
          s.error = null;
        });
        if (!this.available()) return;
        this.load().catch(() => {
        });
      }
      dispose() {
        this.disposed = true;
      }
      assertAvailable() {
        if (!this.available()) throw new Error("model selection is unavailable for addressed subagent sessions");
      }
    };
    var ModelDirectoryResolver = class extends import_cordis.Service {
      static inject = ["connection", "sessions", "remote"];
      live = { directories: /* @__PURE__ */ new Map() };
      blockReason;
      constructor(ctx, config) {
        super(ctx, "modelDirectories");
        this.blockReason = config.blockReason;
        ctx.on("connection/reset", () => {
          for (const directory of this.live.directories.values()) directory.resetConnected();
        });
        const refresh = () => {
          for (const directory of this.live.directories.values()) directory.load().catch(() => {
          });
        };
        ctx.remote.$on("llm/adapters-updated", refresh);
        ctx.remote.$on("settings/document-updated", refresh);
      }
      directoryFor(sessionId) {
        const { live } = this;
        const existing = live.directories.get(sessionId);
        if (existing !== void 0) return existing;
        const sessions = this.ctx.get("sessions");
        const actx = sessions.scope(sessionId);
        if (actx === void 0) throw new Error(`dsh-model-ui: session "${String(sessionId)}" resolved no scope`);
        const directory = new ModelDirectory(
          this.ctx.get("connection").api.sessions,
          sessionId,
          () => sessions.subagentAddress(sessionId) === void 0
        );
        live.directories.set(sessionId, directory);
        const conversation = this.ctx.get("conversation");
        if (conversation !== void 0) {
          const publish = () => {
            conversation.blocks.set(
              sessionId,
              directory.store.getSnapshot().routable === false ? { reason: this.blockReason() } : void 0
            );
          };
          publish();
          actx.effect(() => {
            const stop = directory.store.subscribe(publish);
            return () => {
              stop();
              conversation.blocks.set(sessionId, void 0);
            };
          }, "dsh-model-ui: composer block");
        }
        actx.effect(
          () => () => {
            directory.dispose();
            live.directories.delete(sessionId);
          },
          "dsh-model-ui: session directory"
        );
        return directory;
      }
    };
    
    // src/locale.ts
    var NS = "model-ui";
    var zh = {
      "command.description": "\u9009\u62E9\u672C\u4F1A\u8BDD\u4F7F\u7528\u7684\u6A21\u578B",
      "option.loadError": "\u76EE\u5F55\u52A0\u8F7D\u5931\u8D25\uFF1A{message}",
      "trigger.fallback": "\u9009\u62E9\u6A21\u578B",
      "trigger.aria": "\u9009\u62E9\u6A21\u578B\uFF0C\u5F53\u524D {model}",
      "trigger.ariaEffort": "\u9009\u62E9\u6A21\u578B\uFF0C\u5F53\u524D {model}\uFF0C\u63A8\u7406\u7B49\u7EA7 {effort}",
      "menu.model": "\u6A21\u578B",
      "status.loading": "\u6B63\u5728\u5237\u65B0\u6A21\u578B\u5217\u8868\u2026",
      "error.action": "\u6A21\u578B\u64CD\u4F5C\u5931\u8D25\uFF1A{message}",
      "action.reload": "\u91CD\u65B0\u52A0\u8F7D",
      "warning.groupLoad": "{name} \u52A0\u8F7D\u5931\u8D25\uFF1A{message}",
      "empty.models": "\u6CA1\u6709\u53EF\u7528\u7684\u6A21\u578B\u3002",
      "blocked.composer": "\u5F53\u524D\u6A21\u578B\u4E0D\u53EF\u7528\uFF0C\u8BF7\u5148\u9009\u62E9\u6A21\u578B",
      "empty.efforts": "\u5F53\u524D\u6A21\u578B\u672A\u63D0\u4F9B\u63A8\u7406\u7B49\u7EA7\u3002",
      "effort.title": "\u63A8\u7406\u5F3A\u5EA6",
      "effort.providerDefault": "\u9ED8\u8BA4",
      "effort.reset": "\u4F7F\u7528\u6A21\u578B\u9ED8\u8BA4",
      "effort.resetHint": "\u56DE\u5230\u6A21\u578B\u9002\u914D\u5668\u9ED8\u8BA4\u7684\u63A8\u7406\u5F3A\u5EA6",
      "effort.defaultDesc": "\u7531\u6A21\u578B\u9002\u914D\u5668\u51B3\u5B9A\u63A8\u7406\u5F3A\u5EA6\u3002",
      "effort.aria": "\u63A8\u7406\u7B49\u7EA7\uFF0C\u5F53\u524D {effort}",
      "effort.fixed": "\u8BE5\u6A21\u578B\u4EC5\u63D0\u4F9B\u4E00\u6863\u63A8\u7406\u5F3A\u5EA6\uFF1A{effort}",
      "effort.max": "Max"
    };
    var en = {
      "command.description": "Select the model for this conversation",
      "option.loadError": "Catalog failed to load: {message}",
      "trigger.fallback": "Select model",
      "trigger.aria": "Select model, current {model}",
      "trigger.ariaEffort": "Select model, current {model}, effort {effort}",
      "menu.model": "Model",
      "status.loading": "Refreshing model list\u2026",
      "error.action": "Model operation failed: {message}",
      "action.reload": "Reload",
      "warning.groupLoad": "{name} failed to load: {message}",
      "empty.models": "No models available.",
      "blocked.composer": "The current model is unavailable, select a model first",
      "empty.efforts": "The current model exposes no effort levels.",
      "effort.title": "Reasoning effort",
      "effort.providerDefault": "Default",
      "effort.reset": "Use model default",
      "effort.resetHint": "Revert to the adapter's default reasoning effort",
      "effort.defaultDesc": "The model adapter decides the reasoning effort.",
      "effort.aria": "Reasoning effort, current {effort}",
      "effort.fixed": "This model exposes a single fixed effort: {effort}",
      "effort.max": "Max"
    };
    var dictionaries = { zh, en };
    
    // src/styles.ts
    var STYLE_ID = "dsh-model-ui/styles";
    var CSS = `
    /* seat + triggers (borderless pills, native aesthetic) */
    .dmu-seat{position:relative;display:inline-flex;align-items:center;gap:2px}
    .dmu-anchor{position:relative;display:inline-flex}
    .dmu-model-btn{min-width:0;max-width:220px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:24px;outline:none;align-items:center;gap:4px;padding:0 4px 0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex;font-family:inherit}
    .dmu-model-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
    .dmu-model-btn:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
    .dmu-model-btn:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}
    .dmu-name{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}
    .dmu-chev{color:var(--dsw-alias-label-caption);flex:none;font-size:10px;transition:transform .12s;line-height:1}
    .dmu-chev-open{transform:rotate(180deg)}
    .dmu-chip{height:28px;display:inline-flex;align-items:center;gap:5px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:24px;outline:none;padding:0 8px 0 10px;font-size:13px;font-weight:500;line-height:20px;font-family:inherit}
    .dmu-chip:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
    .dmu-chip:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
    .dmu-chip:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}
    .dmu-chip.dmu-static{color:var(--dsw-alias-label-secondary);cursor:default}
    .dmu-chip.dmu-static:hover{background:0 0}
    .dmu-chip.dmu-max{color:var(--dsw-alias-brand-primary)}
    .dmu-chip .dmu-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary);flex:none}
    .dmu-chip.dmu-max .dmu-dot{background:var(--dsw-alias-brand-primary)}
    .dmu-eq{display:inline-flex;align-items:flex-end;gap:2px;height:12px;flex:none;--dmu-dur:1.1s}
    .dmu-eq i{display:block;width:3px;border-radius:1px;background:var(--dsw-alias-brand-primary);animation:dmu-eq var(--dmu-dur) ease-in-out infinite}
    .dmu-flat{width:13px;height:2px;border-radius:1px;background:var(--dsw-alias-label-tertiary);flex:none}
    .dmu-eq i:nth-child(1){height:60%;animation-delay:0s}
    .dmu-eq i:nth-child(2){height:100%;animation-delay:.15s}
    .dmu-eq i:nth-child(3){height:45%;animation-delay:.3s}
    .dmu-eq i:nth-child(4){height:80%;animation-delay:.45s}
    @keyframes dmu-eq{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
    
    /* model menu (opens UPWARD, native structure) */
    .dmu-menu{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);z-index:50;width:min(240px,100vw - 32px);max-height:min(420px,calc(100vh - 96px));border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);border-radius:12px;padding:4px;display:flex;flex-direction:column;overflow:hidden;animation:dmu-pop-in .14s ease-out;transform-origin:bottom center}
    .dmu-groups{min-height:0;overflow-y:auto}
    .dmu-groupTitle{z-index:1;background:var(--dsw-specific-menu);color:var(--dsw-alias-label-tertiary);padding:5px 8px 3px;font-size:12px;font-weight:500;line-height:18px;position:sticky;top:0}
    .dmu-row{width:100%;min-height:38px;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:10px;outline:none;align-items:center;gap:8px;padding:6px 8px;display:flex;font-family:inherit}
    .dmu-row:hover:not(:disabled),.dmu-row:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}
    .dmu-check{color:var(--dsw-alias-label-primary);flex:0 0 18px;place-items:center;display:grid;font-size:14px}
    .dmu-copy{flex-direction:column;flex:1;min-width:0;display:flex}
    .dmu-modelName{color:inherit;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;line-height:20px;overflow:hidden}
    .dmu-desc{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;overflow:hidden}
    .dmu-note{color:var(--dsw-alias-label-tertiary);padding:10px;font-size:13px;line-height:20px}
    .dmu-note button.dmu-reload{color:var(--dsw-alias-brand-primary);background:0 0;border:none;cursor:pointer;padding:0;margin-left:6px;font:inherit;font-weight:500}
    
    /* effort popover (opens UPWARD) */
    .dmu-popover{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);z-index:50;width:300px;max-width:calc(100vw - 32px);border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;animation:dmu-pop-in .14s ease-out;transform-origin:bottom center}
    @keyframes dmu-pop-in{from{opacity:0;transform:translate(-50%,5px) scale(.97)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
    .dmu-popover .dmu-head{display:flex;justify-content:space-between;align-items:center}
    .dmu-popover .dmu-head .dmu-t{font-size:12px;color:var(--dsw-alias-label-tertiary);line-height:18px}
    .dmu-popover .dmu-reset{font-size:12px;color:var(--dsw-alias-brand-primary);background:0 0;border:none;cursor:pointer;padding:0;font-family:inherit;line-height:18px}
    .dmu-popover .dmu-name{font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary);line-height:20px}
    .dmu-popover .dmu-desc{font-size:12px;color:var(--dsw-alias-label-secondary);min-height:18px;line-height:18px}
    .dmu-trackwrap{position:relative;margin-top:2px}
    .dmu-trackwrap input[type="range"]{width:100%;-webkit-appearance:none;appearance:none;height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-3);outline:none;margin:10px 0 2px;display:block}
    .dmu-trackwrap input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-brand-primary);border:2.5px solid var(--dsw-alias-bg-base);box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer}
    .dmu-trackwrap .dmu-ticks{display:flex;justify-content:space-between;font-size:11px;color:var(--dsw-alias-label-tertiary)}
    .dmu-trackwave{position:absolute;left:0;right:0;top:10px;height:6px;border-radius:3px;overflow:hidden;pointer-events:none;--dmu-dur:1.4s}
    .dmu-trackwave svg{width:200%;height:100%;display:block}
    .dmu-trackwave path{stroke:var(--dsw-alias-brand-primary);stroke-width:2;fill:none;animation:dmu-wave var(--dmu-dur) linear infinite}
    @keyframes dmu-wave{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    `;
    function injectWaveStyles() {
      if (typeof document === "undefined") return () => {
      };
      const existing = document.getElementById(STYLE_ID);
      if (existing) return () => existing.remove();
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.setAttribute("data-plugin-css", "dsh-model-ui");
      style.textContent = CSS;
      document.head.appendChild(style);
      return () => style.remove();
    }
    
    // src/seat.tsx
    var import_jsx_runtime = require("react/jsx-runtime");
    var import_react = require("react");
    function findCurrentChoice(state) {
      if (state.current === null) return null;
      for (const group of state.groups) {
        for (const model of group.models) {
          if (group.id === state.current.provider && model.id === state.current.model) {
            return { group, model };
          }
        }
      }
      return null;
    }
    function ModelSeat({ locked, available, directory, load, select, t }) {
      const state = (0, import_react.useSyncExternalStore)(directory.subscribe, directory.getSnapshot);
      const [modelOpen, setModelOpen] = (0, import_react.useState)(false);
      const [effortOpen, setEffortOpen] = (0, import_react.useState)(false);
      const rootRef = (0, import_react.useRef)(null);
      const currentChoice = (0, import_react.useMemo)(() => findCurrentChoice(state), [state]);
      const reasoning = currentChoice?.model.reasoning;
      const efforts = reasoning?.efforts ?? [];
      const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort ?? (efforts.length === 1 ? efforts[0].id : void 0);
      const effortIndex = reasoning !== void 0 && effectiveEffort !== void 0 ? efforts.findIndex((level) => level.id === effectiveEffort) : -1;
      const topIndex = efforts.length - 1;
      const effortRatio = topIndex <= 0 ? effortIndex >= 0 ? 1 : 0 : Math.max(0, effortIndex / topIndex);
      const isTopLevel = effortRatio >= 1;
      const hasWave = reasoning !== void 0 && effortIndex >= 0;
      const isFlatLine = hasWave && effortRatio <= 1e-3;
      const waveDuration = (1.1 - effortRatio * 0.6).toFixed(2);
      const effortLabel = reasoning === void 0 ? void 0 : effectiveEffort === void 0 ? t("effort.providerDefault") : efforts.find((level) => level.id === effectiveEffort)?.name ?? effectiveEffort;
      const hasEffortChoice = reasoning !== void 0 && efforts.length > 1;
      const modelLabel = currentChoice?.model.name ?? t("trigger.fallback");
      const closeAll = (0, import_react.useCallback)(() => {
        setModelOpen(false);
        setEffortOpen(false);
      }, []);
      (0, import_react.useEffect)(() => {
        if (available) load();
      }, [available, load]);
      (0, import_react.useEffect)(() => {
        if (!modelOpen && !effortOpen) return;
        const closeOutside = (event) => {
          if (!rootRef.current?.contains(event.target)) closeAll();
        };
        const closeEsc = (event) => {
          if (event.key === "Escape") closeAll();
        };
        document.addEventListener("mousedown", closeOutside);
        document.addEventListener("keydown", closeEsc);
        return () => {
          document.removeEventListener("mousedown", closeOutside);
          document.removeEventListener("keydown", closeEsc);
        };
      }, [modelOpen, effortOpen, closeAll]);
      if (!available) return null;
      const chooseModel = (group, model) => {
        closeAll();
        void select({ provider: group.id, model: model.id });
      };
      const chooseEffort = (effortId) => {
        if (state.current === null) return;
        const selection = {
          provider: state.current.provider,
          model: state.current.model,
          ...effortId === void 0 ? {} : { reasoningEffort: effortId }
        };
        void select(selection);
      };
      return (0, import_jsx_runtime.jsxs)("div", {
        ref: rootRef,
        className: "dmu-seat",
        children: [
          // Each trigger gets its own positioning anchor so menus/popovers center
          // on THE TRIGGER, not on the whole seat row.
          (0, import_jsx_runtime.jsxs)("span", {
            className: "dmu-anchor",
            children: [
              (0, import_jsx_runtime.jsxs)("button", {
                type: "button",
                className: "dmu-model-btn",
                disabled: locked,
                title: t("trigger.aria", { model: modelLabel }),
                onClick: () => {
                  setEffortOpen(false);
                  setModelOpen((open) => !open);
                  if (!modelOpen) load();
                },
                children: [
                  (0, import_jsx_runtime.jsx)("span", { className: "dmu-name", children: modelLabel }),
                  (0, import_jsx_runtime.jsx)("span", { className: "dmu-chev" + (modelOpen ? " dmu-chev-open" : ""), children: "\u25BC" })
                ]
              }),
              modelOpen && (0, import_jsx_runtime.jsx)(ModelMenu, {
                state,
                t,
                currentProviderId: state.current === null ? null : state.current.provider,
                currentModelId: state.current === null ? null : state.current.model,
                onPick: chooseModel,
                onReload: () => load()
              })
            ]
          }),
          reasoning !== void 0 && (0, import_jsx_runtime.jsxs)("span", {
            className: "dmu-anchor",
            children: [
              (0, import_jsx_runtime.jsxs)("button", {
                type: "button",
                className: "dmu-chip" + (isTopLevel ? " dmu-max" : "") + (hasEffortChoice ? "" : " dmu-static"),
                disabled: locked || !hasEffortChoice,
                title: hasEffortChoice ? t("effort.aria", { effort: effortLabel ?? "" }) : t("effort.fixed", { effort: effortLabel ?? "" }),
                onClick: () => {
                  if (!hasEffortChoice) return;
                  setModelOpen(false);
                  setEffortOpen((open) => !open);
                },
                children: [
                  (0, import_jsx_runtime.jsx)("span", { className: "dmu-dot" }),
                  isFlatLine ? (0, import_jsx_runtime.jsx)("span", { className: "dmu-flat" }) : hasWave && (0, import_jsx_runtime.jsx)("span", {
                    className: "dmu-eq",
                    style: { "--dmu-dur": waveDuration + "s" },
                    children: [(0, import_jsx_runtime.jsx)("i", {}), (0, import_jsx_runtime.jsx)("i", {}), (0, import_jsx_runtime.jsx)("i", {}), (0, import_jsx_runtime.jsx)("i", {})]
                  }),
                  (0, import_jsx_runtime.jsx)("span", { children: effortLabel })
                ]
              }),
              effortOpen && reasoning !== void 0 && hasEffortChoice && (0, import_jsx_runtime.jsx)(EffortPopover, {
                efforts,
                effectiveEffort,
                t,
                onPick: chooseEffort
              })
            ]
          })
        ]
      });
    }
    function ModelMenu({
      state,
      t,
      currentProviderId,
      currentModelId,
      onPick,
      onReload
    }) {
      if (state.status === "loading" && state.groups.length === 0) {
        return (0, import_jsx_runtime.jsx)("div", { className: "dmu-menu", children: (0, import_jsx_runtime.jsx)("div", { className: "dmu-note", children: t("status.loading") }) });
      }
      return (0, import_jsx_runtime.jsxs)("div", {
        className: "dmu-menu",
        children: [
          state.groups.length === 0 && state.status !== "loading" && (0, import_jsx_runtime.jsx)("div", {
            className: "dmu-note",
            children: (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, {
              children: [
                (0, import_jsx_runtime.jsx)("span", { children: t("empty.models") }),
                (0, import_jsx_runtime.jsx)("button", {
                  type: "button",
                  className: "dmu-reload",
                  onClick: onReload,
                  children: t("action.reload")
                })
              ]
            })
          }),
          (0, import_jsx_runtime.jsxs)("div", {
            className: "dmu-groups",
            children: state.groups.map(
              (group) => (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, {
                children: [
                  (0, import_jsx_runtime.jsx)("div", { className: "dmu-groupTitle", children: group.name ?? group.id }),
                  ...group.models.map(
                    (model) => (0, import_jsx_runtime.jsxs)("button", {
                      type: "button",
                      className: "dmu-row",
                      onClick: () => onPick(group, model),
                      children: [
                        (0, import_jsx_runtime.jsx)("span", {
                          className: "dmu-check",
                          children: group.id === currentProviderId && model.id === currentModelId ? "\u2713" : ""
                        }),
                        (0, import_jsx_runtime.jsxs)("span", {
                          className: "dmu-copy",
                          children: [
                            (0, import_jsx_runtime.jsx)("span", { className: "dmu-modelName", children: model.name }),
                            model.description !== void 0 && (0, import_jsx_runtime.jsx)("span", { className: "dmu-desc", children: model.description })
                          ]
                        })
                      ]
                    }, `${group.id}/${model.id}`)
                  )
                ]
              }, group.id)
            )
          }),
          state.failures.length > 0 && state.failures.map(
            (failure) => (0, import_jsx_runtime.jsx)("div", {
              className: "dmu-note",
              children: t("option.loadError", { message: failure.message })
            }, `failure/${failure.id}`)
          )
        ]
      });
    }
    function EffortPopover({
      efforts,
      effectiveEffort,
      t,
      onPick
    }) {
      const activeIndex = effectiveEffort === void 0 ? -1 : efforts.findIndex((level) => level.id === effectiveEffort);
      const [preview, setPreview] = (0, import_react.useState)(activeIndex);
      const sliderRef = (0, import_react.useRef)(null);
      (0, import_react.useEffect)(() => {
        setPreview(activeIndex);
      }, [activeIndex]);
      (0, import_react.useEffect)(() => {
        const el = sliderRef.current;
        if (!el) return;
        const commit = (e) => {
          const value = Number(e.target.value);
          setPreview(value);
          onPick(efforts[value]?.id);
        };
        el.addEventListener("change", commit);
        return () => el.removeEventListener("change", commit);
      }, [efforts, onPick]);
      if (efforts.length === 0) {
        return (0, import_jsx_runtime.jsx)("div", { className: "dmu-popover", children: (0, import_jsx_runtime.jsx)("div", { className: "dmu-note", children: t("empty.efforts") }) });
      }
      const shownIndex = preview >= 0 ? preview : 0;
      const shown = preview < 0 ? null : efforts[shownIndex];
      const topIndex = efforts.length - 1;
      const previewRatio = topIndex <= 0 ? preview >= 0 ? 1 : 0 : Math.max(0, preview / topIndex);
      const previewDuration = (1.1 - previewRatio * 0.6).toFixed(2);
      return (0, import_jsx_runtime.jsxs)("div", {
        className: "dmu-popover",
        children: [
          (0, import_jsx_runtime.jsxs)("div", {
            className: "dmu-head",
            children: [
              (0, import_jsx_runtime.jsx)("span", { className: "dmu-t", children: t("effort.title") }),
              (0, import_jsx_runtime.jsx)("button", {
                type: "button",
                className: "dmu-reset",
                title: t("effort.resetHint"),
                onClick: () => onPick(void 0),
                children: t("effort.reset")
              })
            ]
          }),
          (0, import_jsx_runtime.jsx)("div", { className: "dmu-name", children: shown === null ? t("effort.providerDefault") : shown.name }),
          (0, import_jsx_runtime.jsx)("div", {
            className: "dmu-desc",
            children: shown === null ? t("effort.defaultDesc") : shown.description ?? ""
          }),
          (0, import_jsx_runtime.jsxs)("div", {
            className: "dmu-trackwrap",
            children: [
              (0, import_jsx_runtime.jsx)("input", {
                ref: sliderRef,
                type: "range",
                min: 0,
                max: efforts.length - 1,
                step: 1,
                value: shownIndex,
                onInput: (e) => setPreview(Number(e.target.value))
              }),
              preview > 0 && (0, import_jsx_runtime.jsx)("div", {
                className: "dmu-trackwave",
                style: { "--dmu-dur": previewDuration + "s" },
                children: (0, import_jsx_runtime.jsx)("svg", {
                  preserveAspectRatio: "none",
                  viewBox: "0 0 240 6",
                  children: (0, import_jsx_runtime.jsx)("path", { d: "M0,3 Q7.5,0 15,3 T30,3 T45,3 T60,3 T75,3 T90,3 T105,3 T120,3 T135,3 T150,3 T165,3 T180,3 T195,3 T210,3 T225,3 T240,3" })
                })
              }),
              (0, import_jsx_runtime.jsx)("div", {
                className: "dmu-ticks",
                children: efforts.map((level) => (0, import_jsx_runtime.jsx)("span", { children: level.name }, level.id))
              })
            ]
          })
        ]
      });
    }
    
    // src/plugin.ts
    var inject = ["commandUi", "connection", "locale", "sessions", "slots", "remote"];
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, dictionaries), "dsh-model-ui: dictionaries");
      const t = ctx.locale.bind(NS);
      ctx.plugin(ModelDirectoryResolver, { blockReason: () => t("blocked.composer") });
      ctx.inject(["commandUi", "modelDirectories"], (scope) => {
        const command = scope.get("commandUi");
        const models = scope.modelDirectories;
        const sessions = scope.sessions;
        scope.effect(() => {
          return command.register({
            name: "model",
            description: t("command.description"),
            available: (session) => sessions.subagentAddress(session.sessionId) === void 0,
            ui: {
              kind: "popupSelect",
              options: async (session) => {
                if (sessions.subagentAddress(session.sessionId) !== void 0) {
                  throw new Error("model selection is unavailable for addressed subagent sessions");
                }
                return optionsOf(await models.directoryFor(session.sessionId).load(), t);
              },
              onSelect: async (option, session) => {
                if (sessions.subagentAddress(session.sessionId) !== void 0) {
                  throw new Error("model selection is unavailable for addressed subagent sessions");
                }
                const directory = models.directoryFor(session.sessionId);
                const selection = selectionOf(directory.store.getSnapshot(), option.id);
                if (selection === void 0) {
                  throw new Error("this provider's catalog failed to load");
                }
                await directory.select(selection);
              }
            }
          });
        }, "dsh-model-ui: /model contribution");
        scope.slots.inject(
          "conversation.input.model",
          () => scope.slots.register(
            {
              name: "conversation.input.model",
              locale: NS,
              inject: (sessionId) => {
                const directory = models.directoryFor(sessionId);
                const available = sessions.subagentAddress(sessionId) === void 0;
                return {
                  available,
                  directory: directory.store,
                  load: () => {
                    if (available) directory.load().catch(() => {
                    });
                  },
                  select: (selection) => available ? directory.select(selection).then(() => true, () => false) : Promise.resolve(false)
                };
              }
            },
            ModelSeat
          )
        );
      });
      const removeStyles = injectWaveStyles();
      ctx.effect(() => removeStyles, "dsh-model-ui: styles");
    }
    function rowId(providerId, modelId) {
      return `${providerId}/${modelId}`;
    }
    function optionsOf(directory, t) {
      const rows = [];
      for (const group of directory.groups) {
        for (const model of group.models) {
          rows.push({
            id: rowId(group.id, model.id),
            label: model.name,
            detail: model.description !== void 0 ? `${group.name ?? group.id} \xB7 ${model.description}` : group.name ?? group.id,
            ...directory.current !== null && directory.current.provider === group.id && directory.current.model === model.id ? { active: true } : {}
          });
        }
      }
      for (const failure of directory.failures) {
        rows.push({
          id: `failure/${failure.id}`,
          label: failure.name,
          detail: t("option.loadError", { message: failure.message })
        });
      }
      return rows;
    }
    function selectionOf(state, id) {
      for (const group of state.groups) {
        for (const model of group.models) {
          if (rowId(group.id, model.id) !== id) continue;
          const reasoningEffort = state.current !== null && state.current.provider === group.id && state.current.model === model.id ? state.current.reasoningEffort ?? model.reasoning?.defaultEffort : model.reasoning?.defaultEffort;
          return {
            provider: group.id,
            model: model.id,
            ...reasoningEffort === void 0 ? {} : { reasoningEffort }
          };
        }
      }
      return void 0;
    }
    
    return module.exports;
  }
});
