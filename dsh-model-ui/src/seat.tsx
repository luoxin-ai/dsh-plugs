/**
 * The split seat (方案四「双浪」): a model dropdown (native interaction
 * preserved) plus an independent effort chip that opens a Claude /effort
 * style slider. At the highest effort level (MAX/ultra) the chip shows
 * equalizer bars and the slider track shows a flowing wave.
 *
 * Data semantics mirror the native ModelSelect exactly:
 *   - model change submits {provider, model} (host applies the model default)
 *   - effort change submits {provider, model, reasoningEffort}; "use model
 *     default" submits without reasoningEffort
 */

import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

export interface EffortLevel {
  id: string;
  name: string;
  description?: string;
}

export interface ModelMeta {
  id: string;
  name: string;
  description?: string;
  reasoning?: { defaultEffort?: string; efforts: EffortLevel[] };
}

export interface ModelGroup {
  id: string;
  name?: string;
  models: ModelMeta[];
}

export interface DirectoryState {
  groups: ModelGroup[];
  failures: { id: string; name: string; message: string }[];
  current: { provider: string; model: string; reasoningEffort?: string } | null;
  status: "idle" | "loading" | "selecting" | "ready" | "error";
}

export interface DirectoryStore {
  subscribe(fn: () => void): () => void;
  getSnapshot(): DirectoryState;
}

export interface SeatProps {
  locked: boolean;
  available: boolean;
  directory: DirectoryStore;
  load: () => void;
  select: (selection: { provider: string; model: string; reasoningEffort?: string }) => Promise<boolean>;
  t: (key: string, params?: Record<string, unknown>) => string;
}

type Selection = { provider: string; model: string; reasoningEffort?: string };

function findCurrentChoice(state: DirectoryState): { group: ModelGroup; model: ModelMeta } | null {
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

export function ModelSeat({ locked, available, directory, load, select, t }: SeatProps) {
  const state = useSyncExternalStore(directory.subscribe, directory.getSnapshot);
  const [modelOpen, setModelOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentChoice = useMemo(() => findCurrentChoice(state), [state]);
  const reasoning = currentChoice?.model.reasoning;
  const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort;
  const efforts = reasoning?.efforts ?? [];
  const isMax =
    reasoning !== undefined && effectiveEffort !== undefined && efforts.length > 0 &&
    effectiveEffort === efforts[efforts.length - 1].id;
  const effortLabel =
    reasoning === undefined
      ? undefined
      : effectiveEffort === undefined
        ? t("effort.title")
        : efforts.find((level) => level.id === effectiveEffort)?.name ?? effectiveEffort;
  const modelLabel = currentChoice?.model.name ?? t("trigger.fallback");

  const closeAll = useCallback(() => {
    setModelOpen(false);
    setEffortOpen(false);
  }, []);

  // Native behavior: auto-load the advisory directory on mount so the labels
  // render without requiring the user to open the menu first.
  useEffect(() => {
    if (available) load();
  }, [available, load]);

  useEffect(() => {
    if (!modelOpen && !effortOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeAll();
    };
    const closeEsc = (event: KeyboardEvent) => {
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

  const chooseModel = (group: ModelGroup, model: ModelMeta) => {
    // Native semantics: model changes submit {provider, model} only — the
    // host applies the new model's adapter default effort.
    closeAll();
    void select({ provider: group.id, model: model.id });
  };

  const chooseEffort = (effortId: string | undefined) => {
    if (state.current === null) return;
    const selection: Selection = {
      provider: state.current.provider,
      model: state.current.model,
      ...(effortId === undefined ? {} : { reasoningEffort: effortId })
    };
    void select(selection);
  };

  return jsxs("div", {
    ref: rootRef,
    className: "dmu-seat",
    children: [
      jsxs("button", {
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
          jsx("span", { className: "dmu-name", children: modelLabel }),
          jsx("span", { className: "dmu-chev", children: modelOpen ? "▲" : "▼" })
        ]
      }),
      reasoning !== undefined &&
        jsxs("button", {
          type: "button",
          className: "dmu-chip" + (isMax ? " dmu-max" : ""),
          disabled: locked,
          title: t("effort.aria", { effort: effortLabel ?? "" }),
          onClick: () => {
            setModelOpen(false);
            setEffortOpen((open) => !open);
          },
          children: [
            jsx("span", { className: "dmu-dot" }),
            isMax && jsx("span", { className: "dmu-eq", children: [jsx("i", {}), jsx("i", {}), jsx("i", {}), jsx("i", {})] }),
            jsx("span", { children: effortLabel })
          ]
        }),
      modelOpen &&
        jsx(ModelMenu, {
          state,
          t,
          currentModelId: state.current === null ? null : state.current.model,
          onPick: chooseModel,
          onReload: () => load()
        }),
      effortOpen && reasoning !== undefined &&
        jsx(EffortPopover, {
          efforts,
          effectiveEffort,
          isMax,
          t,
          onPick: chooseEffort
        })
    ]
  });
}

function ModelMenu({
  state,
  t,
  currentModelId,
  onPick,
  onReload
}: {
  state: DirectoryState;
  t: SeatProps["t"];
  currentModelId: string | null;
  onPick: (group: ModelGroup, model: ModelMeta) => void;
  onReload: () => void;
}) {
  if (state.status === "loading" && state.groups.length === 0) {
    return jsx("div", { className: "dmu-menu", children: jsx("div", { className: "dmu-note", children: t("status.loading") }) });
  }
  return jsxs("div", {
    className: "dmu-menu",
    children: [
      state.groups.length === 0 && state.status !== "loading" &&
        jsx("div", {
          className: "dmu-note",
          children: jsxs(Fragment, {
            children: [
              jsx("span", { children: t("empty.models") }),
              jsx("button", {
                type: "button",
                className: "dmu-reset",
                style: { marginLeft: 6 },
                onClick: onReload,
                children: t("action.reload")
              })
            ]
          })
        }),
      state.groups.map((group) =>
        jsxs(Fragment, {
          children: [
            jsx("div", { className: "dmu-group", children: group.name ?? group.id }),
            ...group.models.map((model) =>
              jsxs("div", {
                className: "dmu-row" + (model.id === currentModelId ? " dmu-active" : ""),
                onClick: () => onPick(group, model),
                children: [
                  jsx("span", { children: model.name }),
                  jsx("span", {
                    className: "dmu-detail",
                  children: model.description !== undefined ? model.description : ""
                })
              ]
            })
          )
        ]}, group.id)
      ),
      state.failures.length > 0 &&
        state.failures.map((failure) =>
          jsx("div", {
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
  isMax,
  t,
  onPick
}: {
  efforts: EffortLevel[];
  effectiveEffort: string | undefined;
  isMax: boolean;
  t: SeatProps["t"];
  onPick: (effortId: string | undefined) => void;
}) {
  const activeIndex = effectiveEffort === undefined ? -1 : efforts.findIndex((level) => level.id === effectiveEffort);
  const [preview, setPreview] = useState<number>(activeIndex);
  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(activeIndex);
  }, [activeIndex]);

  // Commit on the NATIVE `change` event: real browsers fire it once when the
  // thumb is RELEASED (Claude /effort snap semantics) — React's onChange maps
  // to the continuous `input` event for range inputs, which would commit on
  // every drag tick.
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const commit = (e: Event) => {
      const value = Number((e.target as HTMLInputElement).value);
      setPreview(value);
      onPick(efforts[value]?.id);
    };
    el.addEventListener("change", commit);
    return () => el.removeEventListener("change", commit);
  }, [efforts, onPick]);

  if (efforts.length === 0) {
    return jsx("div", { className: "dmu-popover", children: jsx("div", { className: "dmu-note", children: t("empty.efforts") }) });
  }

  const shownIndex = preview >= 0 ? preview : 0;
  const shown = preview < 0 ? null : efforts[shownIndex];

  return jsxs("div", {
    className: "dmu-popover",
    children: [
      jsxs("div", {
        className: "dmu-head",
        children: [
          jsx("span", { className: "dmu-t", children: t("effort.title") }),
          jsx("button", {
            type: "button",
            className: "dmu-reset",
            title: t("effort.resetHint"),
            onClick: () => onPick(undefined),
            children: t("effort.reset")
          })
        ]
      }),
      jsx("div", { className: "dmu-name", children: shown === null ? t("effort.title") : shown.name }),
      jsx("div", {
        className: "dmu-desc",
        children: shown === null ? t("effort.defaultDesc") : (shown.description ?? "")
      }),
      jsxs("div", {
        className: "dmu-trackwrap",
        children: [
          jsx("input", {
            ref: sliderRef,
            type: "range",
            min: 0,
            max: efforts.length - 1,
            step: 1,
            value: shownIndex,
            onInput: (e: React.ChangeEvent<HTMLInputElement>) => setPreview(Number(e.target.value))
          }),
          isMax && preview === efforts.length - 1 &&
            jsx("div", {
              className: "dmu-trackwave",
              children: jsx("svg", {
                preserveAspectRatio: "none",
                viewBox: "0 0 240 6",
                children: jsx("path", { d: "M0,3 Q7.5,0 15,3 T30,3 T45,3 T60,3 T75,3 T90,3 T105,3 T120,3 T135,3 T150,3 T165,3 T180,3 T195,3 T210,3 T225,3 T240,3" })
              })
            }),
          jsx("div", {
            className: "dmu-ticks",
            children: efforts.map((level) => jsx("span", { children: level.name }, level.id))
          })
        ]
      })
    ]
  });
}
