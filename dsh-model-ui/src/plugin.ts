/**
 * Plugin assembly: replaces the native model/effort seat with the split
 * design (方案四「双浪」).
 *
 * Wiring:
 *   - mount the official ModelDirectoryResolver (provides `modelDirectories`
 *     + composer blocking), then register our own seat into
 *     `conversation.input.model` and a parity `/model` command.
 *   - the native ui-model-selection row is disabled by this bundle's patch.
 */

import { ModelDirectoryResolver } from "./directory";

import { NS, dictionaries } from "./locale";
import { injectWaveStyles } from "./styles";
import { ModelSeat } from "./seat";

export { NS };

/** Services the loader resolves before apply — same face as the native plugin. */
export const inject = ["commandUi", "connection", "locale", "sessions", "slots", "remote"];

type LocaleService = {
  register(ns: string, dictionaries: { zh: Record<string, string>; en: Record<string, string> }): () => void;
  bind(ns: string): (key: string, params?: Record<string, unknown>) => string;
};

interface PluginCtx {
  locale: LocaleService;
  plugin(plugin: unknown, options?: Record<string, unknown>): unknown;
  inject(services: string[], callback: (scope: ModelScope) => void): void;
  effect(effect: () => void | (() => void), name?: string): void;
}

/** Services the seat + /model command consume (mirrors the native faces). */
interface DirectorySnapshot {
  groups: {
    id: string;
    name?: string;
    models: {
      id: string;
      name: string;
      description?: string;
      reasoning?: { defaultEffort?: string; efforts: { id: string; name: string; description?: string }[] };
    }[];
  }[];
  failures: { id: string; name: string; message: string }[];
  current: { provider: string; model: string; reasoningEffort?: string } | null;
  status: string;
}

interface ModelDirectory {
  store: {
    subscribe(fn: () => void): () => void;
    getSnapshot(): DirectorySnapshot;
  };
  load(): Promise<DirectorySnapshot>;
  select(selection: { provider: string; model: string; reasoningEffort?: string }): Promise<unknown>;
}

interface ModelScope {
  get(name: string): unknown;
  effect(effect: () => void | (() => void), name?: string): void;
  slots: {
    inject(name: string, callback: () => unknown): void;
    register(definition: unknown, component: unknown): unknown;
  };
  modelDirectories: { directoryFor(sessionId: string): ModelDirectory };
  sessions: { subagentAddress(sessionId: string): unknown };
  commandUi: { register(definition: unknown): () => void };
}

/** One session's model directory seat props (mirrors the native inject face). */
type SeatInject = {
  available: boolean;
  directory: unknown;
  load: () => void;
  select: (selection: { provider: string; model: string; reasoningEffort?: string }) => Promise<boolean>;
};

export function apply(ctx: PluginCtx): void {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), "dsh-model-ui: dictionaries");
  const t = ctx.locale.bind(NS);

  // Official directory service + composer blocking (routable gate).
  ctx.plugin(ModelDirectoryResolver, { blockReason: () => t("blocked.composer") });

  ctx.inject(["commandUi", "modelDirectories"], (scope) => {
    const command = scope.get("commandUi") as ModelScope["commandUi"];
    const models = scope.modelDirectories;
    const sessions = scope.sessions;

    // Parity /model command (popupSelect over the shared directory).
    scope.effect(() => {
      return command.register({
        name: "model",
        description: t("command.description"),
        available: (session: { sessionId: string }) => sessions.subagentAddress(session.sessionId) === undefined,
        ui: {
          kind: "popupSelect",
          options: async (session: { sessionId: string }) => {
            if (sessions.subagentAddress(session.sessionId) !== undefined) {
              throw new Error("model selection is unavailable for addressed subagent sessions");
            }
            return optionsOf(await models.directoryFor(session.sessionId).load(), t);
          },
          onSelect: async (option: { id: string }, session: { sessionId: string }) => {
            if (sessions.subagentAddress(session.sessionId) !== undefined) {
              throw new Error("model selection is unavailable for addressed subagent sessions");
            }
            const directory = models.directoryFor(session.sessionId);
            const selection = selectionOf(directory.store.getSnapshot(), option.id);
            if (selection === undefined) {
              throw new Error("this provider's catalog failed to load");
            }
            await directory.select(selection);
          }
        }
      });
    }, "dsh-model-ui: /model contribution");

    // The split seat.
    scope.slots.inject("conversation.input.model", () =>
      scope.slots.register(
        {
          name: "conversation.input.model",
          locale: NS,
          inject: (sessionId: string): SeatInject => {
            const directory = models.directoryFor(sessionId);
            const available = sessions.subagentAddress(sessionId) === undefined;
            return {
              available,
              directory: directory.store,
              load: () => {
                if (available) directory.load().catch(() => {});
              },
              select: (selection) =>
                available ? directory.select(selection).then(() => true, () => false) : Promise.resolve(false)
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

// ── popupSelect row helpers (mirror the native semantics) ───────────────────

function rowId(providerId: string, modelId: string): string {
  return `${providerId}/${modelId}`;
}

function optionsOf(
  directory: { groups: { id: string; name?: string; models: { id: string; name: string; description?: string }[] }[]; failures: { id: string; name: string; message: string }[]; current: { provider: string; model: string } | null },
  t: (key: string, params?: Record<string, unknown>) => string
) {
  const rows: { id: string; label: string; detail: string; active?: boolean }[] = [];
  for (const group of directory.groups) {
    for (const model of group.models) {
      rows.push({
        id: rowId(group.id, model.id),
        label: model.name,
        detail: model.description !== undefined ? `${group.name ?? group.id} · ${model.description}` : (group.name ?? group.id),
        ...(directory.current !== null && directory.current.provider === group.id && directory.current.model === model.id
          ? { active: true }
          : {})
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

function selectionOf(
  state: { groups: { id: string; models: { id: string; reasoning?: { defaultEffort?: string } }[] }[]; current: { provider: string; model: string; reasoningEffort?: string } | null },
  id: string
): { provider: string; model: string; reasoningEffort?: string } | undefined {
  for (const group of state.groups) {
    for (const model of group.models) {
      if (rowId(group.id, model.id) !== id) continue;
      const reasoningEffort =
        state.current !== null && state.current.provider === group.id && state.current.model === model.id
          ? state.current.reasoningEffort ?? model.reasoning?.defaultEffort
          : model.reasoning?.defaultEffort;
      return {
        provider: group.id,
        model: model.id,
        ...(reasoningEffort === undefined ? {} : { reasoningEffort })
      };
    }
  }
  return undefined;
}
