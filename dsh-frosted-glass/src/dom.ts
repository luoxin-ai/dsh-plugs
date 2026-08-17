/**
 * The only module that touches the DOM. Two responsibilities:
 *
 *  1. Column blur — the real `backdrop-filter` frosted look.
 *  2. Wallpaper + body base — the "behind" content blur has to show.
 *
 * Blur placement is the entire risk of this plugin: `backdrop-filter` makes
 * its element a containing block for fixed/absolute descendants, which broke
 * the settings dialog in an earlier glass skin that blurred `body > *`.
 * We blur only the content columns of the shell frame — never the overlay
 * layer — and a runtime guard strips blur from any column the moment a
 * `position: fixed` overlay mounts inside it (observed in the real app: the
 * settings panel is a fixed child of the sidebar column; with blur on the
 * column it got trapped in the 280px sidebar box). The blur returns once the
 * overlay unmounts. The frame is located through the stable
 * `data-shell-overlay` anchor, so no hashed CSS-module class name is ever
 * depended on.
 */

let wallpaperEl: HTMLDivElement | null = null;
let wallpaperLoaded = false;
let blurredColumns: HTMLElement[] = [];
let strippedColumns = new Set<HTMLElement>();
let columnBlurPx = 0;
let frameObserver: MutationObserver | null = null;
let guardObserver: MutationObserver | null = null;
let guardDirty = false;
let pendingRecords: MutationRecord[] = [];
/** Fixed overlays that received a blur handoff → the column they came from. */
let handedOff = new Map<HTMLElement, HTMLElement>();

/** Full-page wallpaper layer behind everything (z-index -1). */
export function applyWallpaper(url: string | null): void {
  if (url === null) {
    wallpaperEl?.remove();
    wallpaperEl = null;
    wallpaperLoaded = false;
    return;
  }
  if (wallpaperEl === null || !document.body.contains(wallpaperEl)) {
    wallpaperEl = document.createElement("div");
    wallpaperEl.style.cssText =
      "position:fixed;inset:0;z-index:-1;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat;";
    document.body.prepend(wallpaperEl);
  }
  // The body base only goes transparent once the image actually loads; a
  // failed/offline wallpaper keeps the design-token base instead of a
  // see-through window.
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

export function teardownWallpaper(): void {
  wallpaperEl?.remove();
  wallpaperEl = null;
  wallpaperLoaded = false;
}

export function hasWallpaper(): boolean {
  return wallpaperEl !== null && document.body.contains(wallpaperEl) && wallpaperLoaded;
}

/**
 * With a wallpaper mounted the body base must go transparent so the image
 * shows through the translucent surface tokens; without one the body keeps
 * its design-token base so the glass does not sit on an empty window.
 */
export function syncBodyBase(): void {
  document.body.style.setProperty(
    "background-color",
    hasWallpaper() ? "transparent" : ""
  );
}

/**
 * Apply backdrop blur to the shell's content columns (sidebar / center /
 * details) — never the overlay layer. Idempotent: re-applying replaces the
 * previous effect.
 *
 * The plugin activates before the layout renders (the shell settles the
 * plugin tree, then mounts the UI), so the frame may not exist yet; in that
 * case a MutationObserver waits for the stable `data-shell-overlay` anchor
 * and applies as soon as it appears.
 */
export function applyColumnBlur(blurPx: number): void {
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

function findFrame(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-shell-overlay]")?.parentElement ?? null;
}

function blurFrameColumns(frame: HTMLElement, blurPx: number): void {
  for (const el of Array.from(frame.children) as HTMLElement[]) {
    if (el.hasAttribute("data-shell-overlay")) continue;
    blurredColumns.push(el);
    el.style.backdropFilter = `blur(${blurPx}px)`;
  }
  // Columns that already host a fixed overlay (e.g. settings open at boot)
  // must not be blurred in the first place — hand the blur off instead.
  for (const col of [...blurredColumns]) {
    const fixed = firstFixedIn(col);
    if (fixed) stripColumnForOverlay(col, fixed);
  }
}

function teardownFrameObserver(): void {
  frameObserver?.disconnect();
  frameObserver = null;
}

// ── containing-block guard with blur handoff ────────────────────────────────
//
// backdrop-filter turns its element into a containing block for fixed
// descendants. Overlays (settings panel, pickers) are mounted INSIDE the
// columns by the shell, so a blurred column must yield while it hosts one —
// and the blur is HANDED OFF to the overlay element itself, so the overlay
// stays frosted (its translucent panel reads over a blurred backdrop) instead
// of becoming a see-through window. The guard watches node
// additions/removals and strips/restores per column. Cost is bounded: only
// added subtrees are scanned, throttled to one pass per animation frame.

function armGuard(): void {
  teardownGuard();
  if (typeof MutationObserver === "undefined") return;
  guardObserver = new MutationObserver((records) => {
    // Accumulate every batch; the rAF pass drains them all (dropping a batch
    // would miss an overlay mount).
    pendingRecords.push(...records);
    if (guardDirty) return;
    guardDirty = true;
    scheduleGuardPass();
  });
  guardObserver.observe(document.body, { childList: true, subtree: true });
}

function teardownGuard(): void {
  guardObserver?.disconnect();
  guardObserver = null;
  guardDirty = false;
  pendingRecords = [];
  strippedColumns.clear();
  handedOff.clear();
}

function scheduleGuardPass(): void {
  const run = () => {
    guardDirty = false;
    const records = pendingRecords;
    pendingRecords = [];
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const fixed = firstFixedIn(node);
        if (!fixed) continue;
        // A fixed overlay mounted inside a blurred column → strip the column
        // and hand the blur to the overlay itself.
        for (const col of [...blurredColumns]) {
          if (col.contains(node)) stripColumnForOverlay(col, fixed);
        }
        // A fixed element mounted inside a handed-off overlay → the overlay's
        // own blur must yield too (its column is already stripped).
        for (const overlay of [...handedOff.keys()]) {
          // contains() includes the element itself — the just-mounted overlay
          // must not match its own handoff.
          if (overlay !== node && overlay.contains(node)) {
            overlay.style.backdropFilter = "";
            handedOff.delete(overlay);
          }
        }
      }
      for (const node of record.removedNodes) {
        if (handedOff.has(node as HTMLElement)) removeHandoff(node as HTMLElement);
      }
    }
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
  else setTimeout(run, 0);
}

function isFixed(el: HTMLElement): boolean {
  return el.style.position === "fixed" || getComputedStyle(el).position === "fixed";
}

function firstFixedIn(root: HTMLElement): HTMLElement | null {
  if (isFixed(root)) return root;
  for (const el of root.querySelectorAll("*")) {
    const h = el as HTMLElement;
    if (h.style.position === "fixed") return h;
    if (h instanceof HTMLElement && getComputedStyle(h).position === "fixed") return h;
  }
  return null;
}

function containsFixed(col: HTMLElement): boolean {
  for (const el of col.querySelectorAll("*")) {
    const h = el as HTMLElement;
    if (h.style.position === "fixed") return true;
    if (h instanceof HTMLElement && getComputedStyle(h).position === "fixed") return true;
  }
  return false;
}

/** Strip a column's blur and hand it to the fixed overlay that forced it. */
function stripColumnForOverlay(col: HTMLElement, overlay: HTMLElement): void {
  col.style.backdropFilter = "";
  blurredColumns.splice(blurredColumns.indexOf(col), 1);
  strippedColumns.add(col);
  if (!overlay.style.backdropFilter) overlay.style.backdropFilter = `blur(${columnBlurPx}px)`;
  handedOff.set(overlay, col);
}

/** The overlay unmounted: clear its blur and restore its column if clean. */
function removeHandoff(overlay: HTMLElement): void {
  const col = handedOff.get(overlay);
  handedOff.delete(overlay);
  overlay.style.backdropFilter = "";
  if (!col || !document.body.contains(col) || containsFixed(col)) return;
  col.style.backdropFilter = `blur(${columnBlurPx}px)`;
  blurredColumns.push(col);
  strippedColumns.delete(col);
}

export function teardownColumnBlur(): void {
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
