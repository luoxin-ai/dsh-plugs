/**
 * CDP driver for the REAL DSH web UI (headless Chrome).
 *
 * Usage:
 *   DSH_URL=http://127.0.0.1:38999 node scripts/cdp-driver.mjs
 * (Chrome must be running with --remote-debugging-port=9222)
 *
 * Sequence: load page → wait for settle → dump diagnostics (tokens, columns,
 * wallpaper, console errors) → open settings → locate the 毛玻璃 row →
 * toggle OFF/ON and drag the opacity slider → sample tokens after each step.
 */

const DSH_URL = process.env.DSH_URL ?? "http://127.0.0.1:38999";
const CDP_HTTP = "http://127.0.0.1:9222";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  const list = await (await fetch(`${CDP_HTTP}/json/list`)).json();
  const page = list.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    } else if (m.method) {
      events.push(m);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __exception: r.exceptionDetails.text };
    return r.result.value;
  };
  return { send, evaluate, events, ws };
}

const DIAG = `(() => {
  const overlay = document.querySelector('[data-shell-overlay]');
  const frame = overlay ? overlay.parentElement : null;
  const columns = frame ? [...frame.children].filter((el) => !el.hasAttribute('data-shell-overlay')).map((el) => ({ cls: String(el.className).slice(0, 40), blur: el.style.backdropFilter })) : null;
  const html = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  const t = (n) => html.getPropertyValue(n).trim() || body.getPropertyValue(n).trim();
  const wallpaper = [...document.querySelectorAll('body > div')].filter((el) => el.style.zIndex === '-1').map((el) => el.style.backgroundImage);
  const rows = [...document.querySelectorAll('button')].map((b) => ({ t: (b.title || b.getAttribute('aria-label') || '').slice(0, 30), txt: (b.textContent || '').trim().slice(0, 16), role: b.getAttribute('role') })).filter((b) => b.t || b.txt);
  return {
    url: location.href,
    title: document.title,
    hasOverlay: !!overlay,
    columns,
    tokens: {
      bgBase: t('--dsw-alias-bg-base'),
      bgLayer1: t('--dsw-alias-bg-layer-1'),
      sidebarFill: t('--dsw-specific-sidebar-fill'),
      menu: t('--dsw-specific-menu'),
      bubble: t('--dsw-specific-bubble'),
      codeBlock: t('--dsw-alias-markdown-code-block')
    },
    bodyBg: body.backgroundColor,
    wallpaper,
    moduleLoader: typeof window.__ModuleLoader__,
    buttons: rows.slice(0, 30)
  };
})()`;

function summarize(events) {
  return events
    .filter((m) => m.method === "Runtime.exceptionThrown" || (m.method === "Log.entryAdded" && ["error", "warning"].includes(m.params.entry.level)))
    .map((m) => {
      if (m.method === "Runtime.exceptionThrown") {
        const d = m.params.exceptionDetails;
        return `EXC: ${d.exception?.description ?? d.text} @ ${d.url}:${d.lineNumber}`;
      }
      return `${m.params.entry.level.toUpperCase()}: ${m.params.entry.text} @ ${m.params.entry.url ?? ""}`;
    });
}

async function main() {
  const { send, evaluate, events } = await connect();
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: DSH_URL });
  await sleep(12000);

  console.log("== DIAGNOSTICS (after load) ==");
  console.log(JSON.stringify(await evaluate(DIAG), null, 1));
  console.log("== CONSOLE ERRORS SO FAR ==");
  console.log(summarize(events).join("\n") || "(none)");

  // ── open settings ─────────────────────────────────────────────────────────
  const opened = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => {
      const t = (b.title || b.getAttribute('aria-label') || b.textContent || '');
      return /设置|settings/i.test(t);
    });
    if (!btn) return { ok: false };
    btn.click();
    return { ok: true, label: btn.title || btn.getAttribute('aria-label') || btn.textContent };
  })()`);
  console.log("\n== OPEN SETTINGS ==");
  console.log(JSON.stringify(opened));
  await sleep(2500);

  // ── locate the 毛玻璃 row ─────────────────────────────────────────────────
  const row = await evaluate(`(() => {
    const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /毛玻璃|Frosted Glass/.test(e.textContent || '') && (e.textContent || '').length < 30);
    if (!el) return { found: false };
    // walk up to the row group container
    let node = el;
    for (let i = 0; i < 6 && node; i++) node = node.parentElement;
    const info = {
      found: true,
      switches: [...(node?.querySelectorAll('[role=switch]') || [])].map((s) => ({ checked: s.getAttribute('aria-checked'), text: s.parentElement?.textContent?.slice(0, 40) })),
      sliders: [...(node?.querySelectorAll('input[type=range]') || [])].map((s) => ({ value: s.value, min: s.min, max: s.max })),
      inputs: [...(node?.querySelectorAll('input') || [])].map((s) => ({ type: s.type, value: String(s.value).slice(0, 60) })),
      outerHTML: node?.outerHTML?.slice(0, 400)
    };
    return info;
  })()`);
  console.log("\n== 毛玻璃 ROW ==");
  console.log(JSON.stringify(row, null, 1));

  const sample = () => evaluate(`(() => {
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const t = (n) => html.getPropertyValue(n).trim() || body.getPropertyValue(n).trim();
    const overlay = document.querySelector('[data-shell-overlay]');
    const frame = overlay ? overlay.parentElement : null;
    const columns = frame ? [...frame.children].filter((el) => !el.hasAttribute('data-shell-overlay')).map((el) => el.style.backdropFilter) : null;
    return { bgBase: t('--dsw-alias-bg-base'), sidebar: t('--dsw-specific-sidebar-fill'), columns, bodyBg: body.backgroundColor };
  })()`);

  // ── toggle OFF then ON ────────────────────────────────────────────────────
  console.log("\n== BEFORE TOGGLE ==");
  console.log(JSON.stringify(await sample(), null, 1));
  const toggled = await evaluate(`(() => {
    const sw = document.querySelector('[role=switch]');
    if (!sw) return { ok: false };
    const before = sw.getAttribute('aria-checked');
    sw.click();
    return { ok: true, before };
  })()`);
  console.log("toggled:", JSON.stringify(toggled));
  await sleep(1500);
  console.log("\n== AFTER TOGGLE 1 ==");
  console.log(JSON.stringify(await sample(), null, 1));
  console.log("switch state:", JSON.stringify(await evaluate(`(() => { const s = document.querySelector('[role=switch]'); return s ? s.getAttribute('aria-checked') : null })()`)));

  // toggle again
  await evaluate(`(() => { const sw = document.querySelector('[role=switch]'); if (sw) sw.click(); return true })()`);
  await sleep(1500);
  console.log("\n== AFTER TOGGLE 2 ==");
  console.log(JSON.stringify(await sample(), null, 1));
  console.log("switch state:", JSON.stringify(await evaluate(`(() => { const s = document.querySelector('[role=switch]'); return s ? s.getAttribute('aria-checked') : null })()`)));

  // ── drag opacity slider ───────────────────────────────────────────────────
  const drag = await evaluate(`(() => {
    const input = document.querySelector('input[type=range]');
    if (!input) return { ok: false };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '70');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: input.value };
  })()`);
  console.log("\n== DRAG SLIDER ==", JSON.stringify(drag));
  await sleep(1500);
  console.log("\n== AFTER DRAG ==");
  console.log(JSON.stringify(await sample(), null, 1));

  console.log("\n== CONSOLE ERRORS (FULL SESSION) ==");
  console.log(summarize(events).join("\n") || "(none)");
  process.exit(0);
}

main().catch((e) => { console.error("driver failed:", e); process.exit(1); });
