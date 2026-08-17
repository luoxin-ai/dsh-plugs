/**
 * Vendored from `@deepseek-ai/dsh-client-ui-model-selection` (MIT, DeepSeek
 * Harness) — `ModelDirectory` + `ModelDirectoryResolver`.
 *
 * Why vendored: this plugin DISABLES the native ui-model-selection row, and
 * the client module table only serves bundles from ENABLED roster rows — a
 * runtime `require` of the disabled package would fail to materialize.
 * Behavior is ported 1:1 (load/select/resetConnected/dispose, per-session
 * lazy map, connection-reset repull, adapter/settings refresh, composer
 * routable block); only the surface is TypeScript.
 */

import { createSnapshotStore } from "@deepseek-ai/dsh-client-runtime/client";
import { Service, type Context } from "@deepseek-ai/cordis";

interface SessionWire {
  models(options: { sessionId: string }): Promise<{
    result: { ok: boolean; error: { code: string; message: string }; value?: DirectorySnapshot };
  }>;
  selectModel(options: {
    sessionId: string;
    provider: string;
    model: string;
    reasoningEffort?: string;
  }): Promise<{
    result: { ok: boolean; error: { code: string; message: string }; value?: { selected: DirectorySnapshot["current"] } };
  }>;
}

export interface EffortLevel {
  id: string;
  name: string;
  description?: string;
}

export interface DirectorySnapshot {
  current: { provider: string; model: string; reasoningEffort?: string } | null;
  routable: boolean | null;
  groups: {
    id: string;
    name?: string;
    models: {
      id: string;
      name: string;
      description?: string;
      reasoning?: { defaultEffort?: string; efforts: EffortLevel[] };
    }[];
  }[];
  failures: { id: string; name: string; message: string }[];
  status: "idle" | "loading" | "selecting" | "ready" | "error";
  error: string | null;
}

export interface ModelDirectoryHandle {
  store: {
    subscribe(fn: () => void): () => void;
    getSnapshot(): DirectorySnapshot;
  };
  load(): Promise<DirectorySnapshot>;
  select(selection: { provider: string; model: string; reasoningEffort?: string }): Promise<void>;
}

export class ModelDirectory implements ModelDirectoryHandle {
  sessions: SessionWire;
  sessionId: string;
  available: () => boolean;
  /** The shared snapshot both entries render from (uSES-safe store). */
  store = createSnapshotStore<DirectorySnapshot>({
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

  constructor(sessions: SessionWire, sessionId: string, available: () => boolean) {
    this.sessions = sessions;
    this.sessionId = sessionId;
    this.available = available;
  }

  async load(): Promise<DirectorySnapshot> {
    this.assertAvailable();
    const generation = ++this.generation;
    this.store.update((s) => {
      s.status = "loading";
      s.error = null;
    });
    const { result } = await this.sessions.models({ sessionId: this.sessionId });
    if (this.disposed || generation !== this.generation) {
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
      return result.value!;
    }
    if (!result.ok) {
      this.store.update((s) => {
        s.status = "error";
        s.error = `${result.error.code}: ${result.error.message}`;
      });
      throw new Error(`session.models failed: ${result.error.code}: ${result.error.message}`);
    }
    const { current, routable, groups, failures } = result.value!;
    this.store.update((s) => {
      s.current = current;
      s.routable = routable;
      s.groups = groups;
      s.failures = failures;
      s.status = "ready";
      s.error = null;
    });
    return result.value!;
  }

  async select(selection: { provider: string; model: string; reasoningEffort?: string }): Promise<void> {
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
      ...(selection.reasoningEffort === undefined ? {} : { reasoningEffort: selection.reasoningEffort })
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
      s.current = result.value!.selected;
      s.routable = true;
      s.status = "ready";
      s.error = null;
    });
  }

  resetConnected(): void {
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
    this.load().catch(() => {});
  }

  dispose(): void {
    this.disposed = true;
  }

  assertAvailable(): void {
    if (!this.available()) throw new Error("model selection is unavailable for addressed subagent sessions");
  }
}

/**
 * `ctx.modelDirectories`: the root owner of per-session ModelDirectory
 * instances. Both entries (the /model popup and the composer seat) resolve
 * through this service — one shared state per session.
 */
export class ModelDirectoryResolver extends Service {
  static inject = ["connection", "sessions", "remote"];

  live = { directories: new Map<string, ModelDirectory>() };
  blockReason: () => string;

  constructor(ctx: Context, config: { blockReason: () => string }) {
    super(ctx, "modelDirectories");
    this.blockReason = config.blockReason;
    ctx.on("connection/reset", () => {
      for (const directory of this.live.directories.values()) directory.resetConnected();
    });
    const refresh = () => {
      for (const directory of this.live.directories.values()) directory.load().catch(() => {});
    };
    ctx.remote.$on("llm/adapters-updated", refresh);
    ctx.remote.$on("settings/document-updated", refresh);
  }

  directoryFor(sessionId: string): ModelDirectoryHandle {
    const { live } = this;
    const existing = live.directories.get(sessionId);
    if (existing !== undefined) return existing;
    const sessions = this.ctx.get("sessions") as {
      scope(sessionId: string): { effect(fn: () => void | (() => void), name?: string): void } | undefined;
      subagentAddress(sessionId: string): unknown;
    };
    const actx = sessions.scope(sessionId);
    if (actx === undefined) throw new Error(`dsh-model-ui: session "${String(sessionId)}" resolved no scope`);
    const directory = new ModelDirectory(
      (this.ctx.get("connection") as { api: { sessions: SessionWire } }).api.sessions,
      sessionId,
      () => sessions.subagentAddress(sessionId) === undefined
    );
    live.directories.set(sessionId, directory);
    const conversation = this.ctx.get("conversation") as
      | { blocks: { set(sessionId: string, value: { reason: string } | undefined): void } }
      | undefined;
    if (conversation !== undefined) {
      const publish = () => {
        conversation.blocks.set(
          sessionId,
          directory.store.getSnapshot().routable === false ? { reason: this.blockReason() } : undefined
        );
      };
      publish();
      actx.effect(() => {
        const stop = directory.store.subscribe(publish);
        return () => {
          stop();
          conversation.blocks.set(sessionId, undefined);
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
}
