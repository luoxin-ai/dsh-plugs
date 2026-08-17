/**
 * Settings row: master toggle + opacity slider + blur slider + wallpaper
 * picker, registered into the `settings.general.item` slot. Follows the
 * proven pattern of the liquid-glass skin (MIT): a defineStore mirroring
 * localStorage, with write actions injected by the plugin body.
 */

import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";

import { defineStore } from "@deepseek-ai/dsh-client-runtime/client";
import type { GlassPrefs } from "./storage";

export interface GlassStoreState {
  on: boolean;
  alpha: number;
  blur: number;
  wallpaper: string | null;
  revision: number;
}

export function createGlassStore() {
  return defineStore({
    init: (): GlassStoreState => ({
      on: true,
      alpha: 0.55,
      blur: 10,
      wallpaper: null,
      revision: -1
    }),
    actions: {
      sync: (
        d: GlassStoreState,
        on: boolean,
        alpha: number,
        blur: number,
        wallpaper: string | null,
        revision: number
      ) => {
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

export interface GlassActions {
  setOn: (on: boolean) => void;
  setAlpha: (percent: number) => void;
  setBlur: (px: number) => void;
  setWallpaper: (url: string | null) => void;
}

// ── styles (design tokens only, so the row follows the active theme) ────────

const styles = {
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
} as const;

// ── small controls ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return jsx("button", {
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
    children: jsx("span", {
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return jsxs("div", {
    style: styles.sliderRow,
    children: [
      jsx("span", { style: styles.sliderLabel, children: label }),
      jsx("input", {
        type: "range",
        min,
        max,
        step,
        value,
        style: styles.slider,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))
      }),
      jsx("span", { style: styles.sliderValue, children: format(value) })
    ]
  });
}

// ── wallpaper picker ─────────────────────────────────────────────────────────

const ACCEPTED_IMAGE_TYPES = /^image\/(jpeg|png|webp|gif)$/;

/** Downscale an image to a JPEG data URL (localStorage quota friendly). */
function compressImage(image: HTMLImageElement, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (context) context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function pickImageFile(
  file: File | undefined,
  onReady: (dataUrl: string) => void,
  onError: (type: string) => void
): void {
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

type Translate = (key: string) => string;

function WallpaperSection({
  url,
  onApply,
  t
}: {
  url: string | null;
  onApply: (value: string | null) => void;
  t: Translate;
}) {
  const [draft, setDraft] = useState<string | null>(url);
  const [urlText, setUrlText] = useState<string>(typeof url === "string" && /^https?:/i.test(url) ? url : "");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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

  return jsxs(Fragment, {
    children: [
      jsxs("div", {
        style: { display: "flex", alignItems: "flex-start", gap: "10px" },
        children: [
          draft !== null &&
            jsx("div", {
              style: styles.previewWrap,
              children: jsx("div", { style: { ...styles.previewImage, backgroundImage: `url("${draft}")` } })
            }),
          draft === null &&
            jsxs("button", {
              type: "button",
              style: styles.uploadBox,
              onClick: () => fileRef.current?.click(),
              children: [
                jsx("span", { style: styles.uploadPlus, children: "+" }),
                jsx("span", { style: styles.uploadText, children: t("wallpaper.upload") }),
                jsx("span", { style: styles.uploadText, children: t("wallpaper.formats") })
              ]
            }),
          draft !== null &&
            jsxs("div", {
              style: { display: "flex", flexDirection: "column", gap: "8px", justifyContent: "flex-start" },
              children: [
                jsx("button", {
                  type: "button",
                  style: styles.actionButton,
                  onClick: () => fileRef.current?.click(),
                  children: t("wallpaper.replace")
                }),
                jsx("button", {
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
      jsx("input", {
        ref: fileRef,
        type: "file",
        accept: "image/jpeg,image/png,image/webp,image/gif",
        style: { display: "none" },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
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
      jsxs("div", {
        style: { display: "flex", gap: "8px", marginTop: "6px", alignItems: "center" },
        children: [
          jsx("input", {
            style: styles.textInput,
            placeholder: t("wallpaper.urlPlaceholder"),
            value: urlText,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value;
              setUrlText(value);
              setError("");
              setDraft(value.trim() === "" ? null : value.trim());
            }
          }),
          jsx("button", {
            type: "button",
            style: dirty && !checking ? styles.saveButton : styles.saveButtonDisabled,
            disabled: !dirty || checking,
            onClick: handleSave,
            children: checking ? t("wallpaper.checking") : t("wallpaper.save")
          })
        ]
      }),
      error !== "" && jsx("div", { style: styles.dirtyHint, children: error }),
      error === "" && dirty && jsx("div", { style: styles.dirtyHint, children: t("wallpaper.unsaved") })
    ]
  });
}

// ── the settings row ─────────────────────────────────────────────────────────

export function GlassRow({
  t,
  useStore,
  setOn,
  setAlpha,
  setBlur,
  setWallpaper
}: {
  t: Translate;
  useStore: <T>(selector: (s: GlassStoreState) => T) => T;
  setOn: (v: boolean) => void;
  setAlpha: (percent: number) => void;
  setBlur: (px: number) => void;
  setWallpaper: (url: string | null) => void;
}) {
  const on = useStore((s) => s.on);
  const alpha = useStore((s) => s.alpha);
  const blur = useStore((s) => s.blur);
  const wallpaper = useStore((s) => s.wallpaper);
  return jsxs("div", {
    style: styles.group,
    children: [
      jsxs("div", {
        style: styles.headerRow,
        children: [
          jsx("div", { style: styles.title, children: t("row.title") }),
          jsx(Toggle, { checked: on, onChange: (v: boolean) => setOn(v) })
        ]
      }),
      on && jsx("div", { style: styles.subtitle, children: t("row.subtitle") }),
      on &&
        jsx(Slider, {
          label: t("glass.alpha"),
          value: Math.round((1 - alpha) * 100),
          min: 3,
          max: 95,
          step: 1,
          format: (v: number) => `${v}%`,
          onChange: setAlpha
        }),
      on && jsx("div", { style: styles.hint, children: t("glass.alphaHint") }),
      on &&
        jsx(Slider, {
          label: t("glass.blur"),
          value: blur,
          min: 0,
          max: 30,
          step: 1,
          format: (v: number) => `${v}px`,
          onChange: setBlur
        }),
      on && jsx("div", { style: styles.hint, children: t("glass.blurHint") }),
      on && jsx("div", { style: styles.sectionLabel, children: t("wallpaper.title") }),
      on && jsx(WallpaperSection, { url: wallpaper, onApply: (v: string | null) => setWallpaper(v), t }),
      on && jsx("div", { style: styles.hint, children: t("wallpaper.hint") })
    ]
  });
}

export type { GlassPrefs };
