window.__ModuleLoader__.load({
  id: "dsh-frosted-glass",
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
      SETTINGS_NS: () => SETTINGS_NS,
      apply: () => apply,
      inject: () => inject
    });
    module.exports = __toCommonJS(plugin_exports);
    
    // src/core.ts
    var SURFACE_TOKENS = [
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
    ];
    var LIGHT_SURFACE = "#ffffff";
    var DARK_SURFACE = "#151517";
    var OPAQUE_PINS = {
      "--dsw-specific-menu": { light: LIGHT_SURFACE, dark: DARK_SURFACE }
    };
    function hexToRgb(hex) {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
      if (!m) return null;
      const n = parseInt(m[1], 16);
      return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 };
    }
    function toRgba(hex, alpha) {
      const rgb = hexToRgb(hex);
      if (!rgb) return hex;
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
    function clampAlpha(alpha) {
      if (!Number.isFinite(alpha)) return 0.55;
      return Math.min(0.95, Math.max(0.05, alpha));
    }
    function clampBlur(px) {
      if (!Number.isFinite(px)) return 10;
      return Math.min(30, Math.max(0, Math.round(px)));
    }
    function buildTokenOverrides(config) {
      const alpha = clampAlpha(config.alpha);
      const overrides = {};
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
    
    // src/storage.ts
    var DEFAULT_PREFS = {
      on: true,
      alpha: 0.55,
      blur: 10,
      wallpaper: "https://picsum.photos/1920/1080"
    };
    var KEY_ON = "dsh-frosted-glass:on";
    var KEY_ALPHA = "dsh-frosted-glass:alpha";
    var KEY_BLUR = "dsh-frosted-glass:blur";
    var KEY_WALLPAPER = "dsh-frosted-glass:wallpaper";
    function readStorage(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    function writeStorage(key, value) {
      try {
        if (value === null || value === void 0) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      } catch {
      }
    }
    function readPrefs() {
      const rawOn = readStorage(KEY_ON);
      const rawAlpha = readStorage(KEY_ALPHA);
      const rawBlur = readStorage(KEY_BLUR);
      const rawWallpaper = readStorage(KEY_WALLPAPER);
      return {
        on: rawOn === null ? DEFAULT_PREFS.on : rawOn === "on",
        alpha: rawAlpha === null ? DEFAULT_PREFS.alpha : clampAlpha(Number(rawAlpha)),
        blur: rawBlur === null ? DEFAULT_PREFS.blur : clampBlur(Number(rawBlur)),
        wallpaper: rawWallpaper === null ? DEFAULT_PREFS.wallpaper : rawWallpaper === "" ? null : rawWallpaper
      };
    }
    function writeOn(on) {
      writeStorage(KEY_ON, on ? "on" : "off");
    }
    function writeAlpha(alpha) {
      writeStorage(KEY_ALPHA, String(clampAlpha(alpha)));
    }
    function writeBlur(blur) {
      writeStorage(KEY_BLUR, String(clampBlur(blur)));
    }
    function writeWallpaper(url) {
      writeStorage(KEY_WALLPAPER, url === null ? "" : url);
    }
    
    // src/dom.ts
    var wallpaperEl = null;
    var wallpaperLoaded = false;
    var blurredColumns = [];
    var strippedColumns = /* @__PURE__ */ new Set();
    var columnBlurPx = 0;
    var frameObserver = null;
    var guardObserver = null;
    var guardDirty = false;
    var pendingRecords = [];
    var handedOff = /* @__PURE__ */ new Map();
    function applyWallpaper(url) {
      if (url === null) {
        wallpaperEl?.remove();
        wallpaperEl = null;
        wallpaperLoaded = false;
        return;
      }
      if (wallpaperEl === null || !document.body.contains(wallpaperEl)) {
        wallpaperEl = document.createElement("div");
        wallpaperEl.style.cssText = "position:fixed;inset:0;z-index:-1;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat;";
        document.body.prepend(wallpaperEl);
      }
      wallpaperLoaded = false;
      const probe = new Image();
      probe.onload = () => {
        wallpaperLoaded = true;
        syncBodyBase();
      };
      probe.onerror = () => {
        wallpaperLoaded = false;
        syncBodyBase();
      };
      probe.src = url;
      wallpaperEl.style.backgroundImage = `url("${url}")`;
    }
    function teardownWallpaper() {
      wallpaperEl?.remove();
      wallpaperEl = null;
      wallpaperLoaded = false;
    }
    function hasWallpaper() {
      return wallpaperEl !== null && document.body.contains(wallpaperEl) && wallpaperLoaded;
    }
    function syncBodyBase() {
      document.body.style.setProperty(
        "background-color",
        hasWallpaper() ? "transparent" : ""
      );
    }
    function applyColumnBlur(blurPx) {
      teardownColumnBlur();
      teardownFrameObserver();
      if (blurPx <= 0) return;
      columnBlurPx = blurPx;
      const frame = findFrame();
      if (frame) {
        blurFrameColumns(frame, blurPx);
        armGuard();
        return;
      }
      frameObserver = new MutationObserver(() => {
        const found = findFrame();
        if (!found) return;
        teardownFrameObserver();
        blurFrameColumns(found, blurPx);
        armGuard();
      });
      frameObserver.observe(document.body, { childList: true, subtree: true });
    }
    function findFrame() {
      return document.querySelector("[data-shell-overlay]")?.parentElement ?? null;
    }
    function blurFrameColumns(frame, blurPx) {
      for (const el of Array.from(frame.children)) {
        if (el.hasAttribute("data-shell-overlay")) continue;
        blurredColumns.push(el);
        el.style.backdropFilter = `blur(${blurPx}px)`;
      }
      for (const col of [...blurredColumns]) {
        const fixed = firstFixedIn(col);
        if (fixed) stripColumnForOverlay(col, fixed);
      }
    }
    function teardownFrameObserver() {
      frameObserver?.disconnect();
      frameObserver = null;
    }
    function armGuard() {
      teardownGuard();
      if (typeof MutationObserver === "undefined") return;
      guardObserver = new MutationObserver((records) => {
        pendingRecords.push(...records);
        if (guardDirty) return;
        guardDirty = true;
        scheduleGuardPass();
      });
      guardObserver.observe(document.body, { childList: true, subtree: true });
    }
    function teardownGuard() {
      guardObserver?.disconnect();
      guardObserver = null;
      guardDirty = false;
      pendingRecords = [];
      strippedColumns.clear();
      handedOff.clear();
    }
    function scheduleGuardPass() {
      const run = () => {
        guardDirty = false;
        const records = pendingRecords;
        pendingRecords = [];
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;
            const fixed = firstFixedIn(node);
            if (!fixed) continue;
            for (const col of [...blurredColumns]) {
              if (col.contains(node)) stripColumnForOverlay(col, fixed);
            }
            for (const overlay of [...handedOff.keys()]) {
              if (overlay !== node && overlay.contains(node)) {
                overlay.style.backdropFilter = "";
                handedOff.delete(overlay);
              }
            }
          }
          for (const node of record.removedNodes) {
            if (handedOff.has(node)) removeHandoff(node);
          }
        }
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else setTimeout(run, 0);
    }
    function isFixed(el) {
      return el.style.position === "fixed" || getComputedStyle(el).position === "fixed";
    }
    function firstFixedIn(root) {
      if (isFixed(root)) return root;
      for (const el of root.querySelectorAll("*")) {
        const h = el;
        if (h.style.position === "fixed") return h;
        if (h instanceof HTMLElement && getComputedStyle(h).position === "fixed") return h;
      }
      return null;
    }
    function containsFixed(col) {
      for (const el of col.querySelectorAll("*")) {
        const h = el;
        if (h.style.position === "fixed") return true;
        if (h instanceof HTMLElement && getComputedStyle(h).position === "fixed") return true;
      }
      return false;
    }
    function stripColumnForOverlay(col, overlay) {
      col.style.backdropFilter = "";
      blurredColumns.splice(blurredColumns.indexOf(col), 1);
      strippedColumns.add(col);
      if (!overlay.style.backdropFilter) overlay.style.backdropFilter = `blur(${columnBlurPx}px)`;
      handedOff.set(overlay, col);
    }
    function removeHandoff(overlay) {
      const col = handedOff.get(overlay);
      handedOff.delete(overlay);
      overlay.style.backdropFilter = "";
      if (!col || !document.body.contains(col) || containsFixed(col)) return;
      col.style.backdropFilter = `blur(${columnBlurPx}px)`;
      blurredColumns.push(col);
      strippedColumns.delete(col);
    }
    function teardownColumnBlur() {
      teardownFrameObserver();
      teardownGuard();
      for (const el of blurredColumns) {
        el.style.backdropFilter = "";
      }
      for (const overlay of handedOff.keys()) {
        overlay.style.backdropFilter = "";
      }
      blurredColumns = [];
      strippedColumns.clear();
      handedOff.clear();
    }
    
    // src/locale.ts
    var SETTINGS_NS = "settings.frosted-glass";
    var zh = {
      "row.title": "\u6BDB\u73BB\u7483",
      "row.subtitle": "\u7531 Frosted Glass \u63D0\u4F9B \xB7 \u771F\u6A21\u7CCA + \u534A\u900F\u660E\u8868\u9762 + \u80CC\u666F\u56FE",
      "glass.toggle": "\u542F\u7528\u6BDB\u73BB\u7483",
      "glass.alpha": "\u900F\u660E\u5EA6",
      "glass.alphaHint": "\u900F\u660E\u5EA6\u8D8A\u5927\u8D8A\u900F\uFF0C\u80CC\u666F\u8D8A\u6E05\u6670\u3002",
      "glass.blur": "\u6A21\u7CCA\u5F3A\u5EA6",
      "glass.blurHint": "\u80CC\u677F\u6A21\u7CCA\u534A\u5F84\uFF080 \u8868\u793A\u53EA\u900F\u660E\u4E0D\u6A21\u7CCA\uFF09\u3002",
      "wallpaper.title": "\u80CC\u666F\u56FE",
      "wallpaper.choose": "\u9009\u62E9\u56FE\u7247\u2026",
      "wallpaper.upload": "\u70B9\u51FB\u4E0A\u4F20\u80CC\u666F\u56FE",
      "wallpaper.formats": "\u652F\u6301 JPG / PNG / WebP / GIF",
      "wallpaper.badType": "\u4EC5\u652F\u6301 JPG / PNG / WebP / GIF \u683C\u5F0F\u7684\u56FE\u7247",
      "wallpaper.urlPlaceholder": "\u6216\u7C98\u8D34\u56FE\u7247 URL",
      "wallpaper.remove": "\u79FB\u9664\u80CC\u666F",
      "wallpaper.replace": "\u66F4\u6362\u80CC\u666F",
      "wallpaper.save": "\u4FDD\u5B58",
      "wallpaper.unsaved": "\u6709\u672A\u4FDD\u5B58\u7684\u66F4\u6539",
      "wallpaper.badUrl": "\u56FE\u7247\u94FE\u63A5\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u540E\u91CD\u8BD5",
      "wallpaper.checking": "\u6821\u9A8C\u4E2D\u2026",
      "wallpaper.hint": "\u80CC\u666F\u94FA\u6EE1\u6574\u4E2A\u9875\u9762\uFF0C\u4FDD\u5B58\u5728\u672C\u6D4F\u89C8\u5668\uFF1B\u8FC7\u5927\u7684\u56FE\u7247\u4F1A\u81EA\u52A8\u538B\u7F29\u3002"
    };
    var en = {
      "row.title": "Frosted Glass",
      "row.subtitle": "Powered by Frosted Glass \xB7 real blur + translucent surfaces + wallpaper",
      "glass.toggle": "Enable frosted glass",
      "glass.alpha": "Opacity",
      "glass.alphaHint": "Higher transparency reveals more of the background.",
      "glass.blur": "Blur strength",
      "glass.blurHint": "Backdrop blur radius (0 = translucency only).",
      "wallpaper.title": "Background",
      "wallpaper.choose": "Choose image\u2026",
      "wallpaper.upload": "Click to upload a background",
      "wallpaper.formats": "JPG / PNG / WebP / GIF",
      "wallpaper.badType": "Only JPG / PNG / WebP / GIF images are supported",
      "wallpaper.urlPlaceholder": "\u2026or paste an image URL",
      "wallpaper.remove": "Remove background",
      "wallpaper.replace": "Replace",
      "wallpaper.save": "Save",
      "wallpaper.unsaved": "Unsaved changes",
      "wallpaper.badUrl": "Image failed to load from this URL. Please check and retry.",
      "wallpaper.checking": "Checking\u2026",
      "wallpaper.hint": "The background spans the whole page and stays in this browser; large images are compressed automatically."
    };
    var dictionaries = { zh, en };
    
    // src/settings.tsx
    var import_jsx_runtime = require("react/jsx-runtime");
    var import_react = require("react");
    var import_client = require("@deepseek-ai/dsh-client-runtime/client");
    function createGlassStore() {
      return (0, import_client.defineStore)({
        init: () => ({
          on: true,
          alpha: 0.55,
          blur: 10,
          wallpaper: null,
          revision: -1
        }),
        actions: {
          sync: (d, on, alpha, blur, wallpaper, revision) => {
            if (revision <= d.revision) return;
            d.on = on;
            d.alpha = alpha;
            d.blur = blur;
            d.wallpaper = wallpaper;
            d.revision = revision;
          }
        }
      });
    }
    var styles = {
      group: {
        borderBottom: "1px solid var(--dsw-alias-border-l2)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "16px 0"
      },
      title: { color: "var(--dsw-alias-label-primary)", fontSize: "14px", fontWeight: 400, lineHeight: "22px" },
      subtitle: { color: "var(--dsw-alias-label-tertiary)", fontSize: "12px", lineHeight: "18px" },
      hint: { color: "var(--dsw-alias-label-tertiary)", fontSize: "12px", lineHeight: "18px" },
      sectionLabel: { color: "var(--dsw-alias-label-secondary)", fontSize: "12px", lineHeight: "18px", marginTop: "4px" },
      headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" },
      sliderRow: { display: "flex", alignItems: "center", gap: "10px" },
      sliderLabel: { color: "var(--dsw-alias-label-secondary)", fontSize: "12px", width: "72px", flexShrink: 0 },
      slider: { flex: 1, minWidth: "120px" },
      sliderValue: { color: "var(--dsw-alias-label-tertiary)", fontSize: "12px", width: "48px", textAlign: "right" },
      button: {
        padding: "5px 12px",
        borderRadius: "8px",
        border: "1px solid var(--dsw-alias-border-l2)",
        background: "var(--dsw-alias-bg-layer-1)",
        color: "var(--dsw-alias-label-primary)",
        fontSize: "12px",
        cursor: "pointer",
        font: "inherit"
      },
      textInput: {
        flex: 1,
        minWidth: "180px",
        padding: "5px 10px",
        borderRadius: "8px",
        border: "1px solid var(--dsw-alias-border-l2)",
        background: "var(--dsw-alias-bg-layer-1)",
        color: "var(--dsw-alias-label-primary)",
        fontSize: "12px",
        font: "inherit",
        boxSizing: "border-box"
      },
      actionRow: { display: "flex", gap: "8px", marginTop: "6px" },
      actionButton: {
        padding: "4px 10px",
        borderRadius: "8px",
        border: "1px solid var(--dsw-alias-border-l2)",
        background: "transparent",
        color: "var(--dsw-alias-label-secondary)",
        fontSize: "12px",
        lineHeight: "18px",
        cursor: "pointer",
        font: "inherit"
      },
      actionButtonDanger: {
        padding: "4px 10px",
        borderRadius: "8px",
        border: "1px solid rgba(229, 72, 77, 0.45)",
        background: "transparent",
        color: "#e5484d",
        fontSize: "12px",
        lineHeight: "18px",
        cursor: "pointer",
        font: "inherit"
      },
      uploadBox: {
        width: "200px",
        aspectRatio: "16 / 9",
        borderRadius: "10px",
        border: "1.5px dashed var(--dsw-alias-border-l2)",
        background: "var(--dsw-alias-bg-layer-1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        cursor: "pointer",
        font: "inherit",
        padding: 0
      },
      uploadPlus: { fontSize: "22px", lineHeight: "1", color: "var(--dsw-alias-label-tertiary)" },
      uploadText: { fontSize: "12px", color: "var(--dsw-alias-label-tertiary)" },
      saveButton: {
        padding: "4px 10px",
        borderRadius: "8px",
        border: "none",
        background: "#4d6bfe",
        color: "#ffffff",
        fontSize: "12px",
        lineHeight: "18px",
        cursor: "pointer",
        font: "inherit"
      },
      saveButtonDisabled: {
        padding: "4px 10px",
        borderRadius: "8px",
        border: "none",
        background: "var(--dsw-alias-bg-layer-2)",
        color: "var(--dsw-alias-label-tertiary)",
        fontSize: "12px",
        lineHeight: "18px",
        cursor: "default",
        font: "inherit"
      },
      dirtyHint: { color: "#e5484d", fontSize: "12px", lineHeight: "18px" },
      previewWrap: {
        position: "relative",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid var(--dsw-alias-border-l1)",
        width: "140px",
        aspectRatio: "16 / 9",
        background: "var(--dsw-alias-bg-layer-1)",
        flexShrink: 0
      },
      previewImage: {
        position: "absolute",
        inset: 0,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }
    };
    function Toggle({ checked, onChange }) {
      return (0, import_jsx_runtime.jsx)("button", {
        type: "button",
        role: "switch",
        "aria-checked": checked,
        onClick: () => onChange(!checked),
        style: {
          width: "40px",
          height: "22px",
          borderRadius: "11px",
          background: checked ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-bg-layer-3)",
          border: checked ? "1px solid transparent" : "1px solid var(--dsw-alias-border-l2)",
          position: "relative",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          transition: "background 0.2s",
          font: "inherit",
          boxSizing: "border-box"
        },
        children: (0, import_jsx_runtime.jsx)("span", {
          style: {
            position: "absolute",
            top: "2px",
            left: checked ? "20px" : "2px",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
            transition: "left 0.2s"
          }
        })
      });
    }
    function Slider({
      label,
      value,
      min,
      max,
      step,
      format,
      onChange
    }) {
      return (0, import_jsx_runtime.jsxs)("div", {
        style: styles.sliderRow,
        children: [
          (0, import_jsx_runtime.jsx)("span", { style: styles.sliderLabel, children: label }),
          (0, import_jsx_runtime.jsx)("input", {
            type: "range",
            min,
            max,
            step,
            value,
            style: styles.slider,
            onChange: (e) => onChange(Number(e.target.value))
          }),
          (0, import_jsx_runtime.jsx)("span", { style: styles.sliderValue, children: format(value) })
        ]
      });
    }
    var ACCEPTED_IMAGE_TYPES = /^image\/(jpeg|png|webp|gif)$/;
    function compressImage(image, maxSide, quality) {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (context) context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", quality);
    }
    function pickImageFile(file, onReady, onError) {
      if (!file) return;
      if (!ACCEPTED_IMAGE_TYPES.test(file.type)) {
        onError(file.type || "unknown");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => onReady(compressImage(img, 1920, 0.85));
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    }
    function WallpaperSection({
      url,
      onApply,
      t
    }) {
      const [draft, setDraft] = (0, import_react.useState)(url);
      const [urlText, setUrlText] = (0, import_react.useState)(typeof url === "string" && /^https?:/i.test(url) ? url : "");
      const [checking, setChecking] = (0, import_react.useState)(false);
      const [error, setError] = (0, import_react.useState)("");
      const fileRef = (0, import_react.useRef)(null);
      (0, import_react.useEffect)(() => {
        setDraft(url);
        setUrlText(typeof url === "string" && /^https?:/i.test(url) ? url : "");
        setError("");
      }, [url]);
      const dirty = draft !== url;
      const handleSave = () => {
        if (!dirty || checking) return;
        setError("");
        if (draft && /^https?:/i.test(draft)) {
          setChecking(true);
          const probe = new Image();
          probe.onload = () => {
            setChecking(false);
            onApply(draft);
          };
          probe.onerror = () => {
            setChecking(false);
            setError(t("wallpaper.badUrl"));
          };
          probe.src = draft;
        } else {
          onApply(draft);
        }
      };
      return (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, {
        children: [
          (0, import_jsx_runtime.jsxs)("div", {
            style: { display: "flex", alignItems: "flex-start", gap: "10px" },
            children: [
              draft !== null && (0, import_jsx_runtime.jsx)("div", {
                style: styles.previewWrap,
                children: (0, import_jsx_runtime.jsx)("div", { style: { ...styles.previewImage, backgroundImage: `url("${draft}")` } })
              }),
              draft === null && (0, import_jsx_runtime.jsxs)("button", {
                type: "button",
                style: styles.uploadBox,
                onClick: () => fileRef.current?.click(),
                children: [
                  (0, import_jsx_runtime.jsx)("span", { style: styles.uploadPlus, children: "+" }),
                  (0, import_jsx_runtime.jsx)("span", { style: styles.uploadText, children: t("wallpaper.upload") }),
                  (0, import_jsx_runtime.jsx)("span", { style: styles.uploadText, children: t("wallpaper.formats") })
                ]
              }),
              draft !== null && (0, import_jsx_runtime.jsxs)("div", {
                style: { display: "flex", flexDirection: "column", gap: "8px", justifyContent: "flex-start" },
                children: [
                  (0, import_jsx_runtime.jsx)("button", {
                    type: "button",
                    style: styles.actionButton,
                    onClick: () => fileRef.current?.click(),
                    children: t("wallpaper.replace")
                  }),
                  (0, import_jsx_runtime.jsx)("button", {
                    type: "button",
                    style: styles.actionButtonDanger,
                    onClick: () => {
                      setDraft(null);
                      setUrlText("");
                      setError("");
                    },
                    children: t("wallpaper.remove")
                  })
                ]
              })
            ]
          }),
          (0, import_jsx_runtime.jsx)("input", {
            ref: fileRef,
            type: "file",
            accept: "image/jpeg,image/png,image/webp,image/gif",
            style: { display: "none" },
            onChange: (e) => {
              pickImageFile(
                e.target.files?.[0],
                (dataUrl) => {
                  setDraft(dataUrl);
                  setUrlText("");
                  setError("");
                },
                () => setError(t("wallpaper.badType"))
              );
              e.target.value = "";
            }
          }),
          (0, import_jsx_runtime.jsxs)("div", {
            style: { display: "flex", gap: "8px", marginTop: "6px", alignItems: "center" },
            children: [
              (0, import_jsx_runtime.jsx)("input", {
                style: styles.textInput,
                placeholder: t("wallpaper.urlPlaceholder"),
                value: urlText,
                onChange: (e) => {
                  const value = e.target.value;
                  setUrlText(value);
                  setError("");
                  setDraft(value.trim() === "" ? null : value.trim());
                }
              }),
              (0, import_jsx_runtime.jsx)("button", {
                type: "button",
                style: dirty && !checking ? styles.saveButton : styles.saveButtonDisabled,
                disabled: !dirty || checking,
                onClick: handleSave,
                children: checking ? t("wallpaper.checking") : t("wallpaper.save")
              })
            ]
          }),
          error !== "" && (0, import_jsx_runtime.jsx)("div", { style: styles.dirtyHint, children: error }),
          error === "" && dirty && (0, import_jsx_runtime.jsx)("div", { style: styles.dirtyHint, children: t("wallpaper.unsaved") })
        ]
      });
    }
    function GlassRow({
      t,
      useStore,
      setOn,
      setAlpha,
      setBlur,
      setWallpaper
    }) {
      const on = useStore((s) => s.on);
      const alpha = useStore((s) => s.alpha);
      const blur = useStore((s) => s.blur);
      const wallpaper = useStore((s) => s.wallpaper);
      return (0, import_jsx_runtime.jsxs)("div", {
        style: styles.group,
        children: [
          (0, import_jsx_runtime.jsxs)("div", {
            style: styles.headerRow,
            children: [
              (0, import_jsx_runtime.jsx)("div", { style: styles.title, children: t("row.title") }),
              (0, import_jsx_runtime.jsx)(Toggle, { checked: on, onChange: (v) => setOn(v) })
            ]
          }),
          on && (0, import_jsx_runtime.jsx)("div", { style: styles.subtitle, children: t("row.subtitle") }),
          on && (0, import_jsx_runtime.jsx)(Slider, {
            label: t("glass.alpha"),
            value: Math.round((1 - alpha) * 100),
            min: 3,
            max: 95,
            step: 1,
            format: (v) => `${v}%`,
            onChange: setAlpha
          }),
          on && (0, import_jsx_runtime.jsx)("div", { style: styles.hint, children: t("glass.alphaHint") }),
          on && (0, import_jsx_runtime.jsx)(Slider, {
            label: t("glass.blur"),
            value: blur,
            min: 0,
            max: 30,
            step: 1,
            format: (v) => `${v}px`,
            onChange: setBlur
          }),
          on && (0, import_jsx_runtime.jsx)("div", { style: styles.hint, children: t("glass.blurHint") }),
          on && (0, import_jsx_runtime.jsx)("div", { style: styles.sectionLabel, children: t("wallpaper.title") }),
          on && (0, import_jsx_runtime.jsx)(WallpaperSection, { url: wallpaper, onApply: (v) => setWallpaper(v), t }),
          on && (0, import_jsx_runtime.jsx)("div", { style: styles.hint, children: t("wallpaper.hint") })
        ]
      });
    }
    
    // src/plugin.ts
    var inject = ["slots", "locale", "theme"];
    var OVERRIDE_SOURCE = "dsh-frosted-glass:glass";
    var tokenDispose = null;
    var applying = false;
    function applyTokens(ctx, prefs) {
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
    function applyAll(ctx) {
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
    function apply(ctx) {
      const store = createGlassStore();
      let bound;
      let revision = 0;
      const sync = (prefs) => {
        revision += 1;
        bound?.sync(prefs.on, prefs.alpha, prefs.blur, prefs.wallpaper, revision);
      };
      applyAll(ctx);
      sync(readPrefs());
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
      ctx.slots.inject(
        "settings.general.item",
        () => ctx.slots.register(
          {
            name: "settings.general.item",
            id: "frosted-glass",
            order: 20,
            store,
            locale: SETTINGS_NS,
            inject: (actions) => {
              bound = actions;
              sync(readPrefs());
              return {
                setOn: (on) => {
                  writeOn(on);
                  applyAll(ctx);
                  sync(readPrefs());
                },
                setAlpha: (percent) => {
                  const alpha = Math.min(0.95, Math.max(0.05, 1 - percent / 100));
                  writeAlpha(alpha);
                  applyAll(ctx);
                  sync(readPrefs());
                },
                setBlur: (px) => {
                  writeBlur(px);
                  applyAll(ctx);
                  sync(readPrefs());
                },
                setWallpaper: (url) => {
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
    
    return module.exports;
  }
});
