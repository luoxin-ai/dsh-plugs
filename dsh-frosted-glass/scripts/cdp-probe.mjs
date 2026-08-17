/**
 * Probe the live UI for surfaces that remain OPAQUE (the glass coverage gap).
 */
const DSH_URL = process.env.DSH_URL ?? "http://127.0.0.1:38999";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(m.error) : p.res(m.result); }
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) return { __exception: r.exceptionDetails.exception?.description ?? r.exceptionDetails.text };
  return r.result.value;
};

await send("Page.navigate", { url: DSH_URL });
await sleep(12000);

const probe = await evalJs(`(() => {
  const seen = new Set();
  const out = { opaque: [], translucent: [] };
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue;
    const bg = getComputedStyle(el).backgroundColor;
    if (!bg || bg === 'rgba(0, 0, 0, 0)') continue;
    const key = bg + '|' + el.tagName;
    if (seen.has(key)) continue;
    seen.add(key);
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) continue;
    const item = { bg, cls: String(el.className).slice(0, 36), tag: el.tagName, w: Math.round(rect.width), h: Math.round(rect.height) };
    const m = bg.match(/rgba\\(\\d+, \\d+, \\d+, ([\\d.]+)\\)/);
    const alpha = m ? parseFloat(m[1]) : 1;
    (alpha >= 0.99 ? out.opaque : out.translucent).push(item);
  }
  const byArea = (a, b) => b.w * b.h - a.w * a.h;
  out.opaque.sort(byArea);
  out.translucent.sort(byArea);
  return out;
})()`);

console.log("=== OPAQUE SURFACES (largest first) ===");
console.log(JSON.stringify(probe.opaque.slice(0, 45), null, 1));
console.log("\n=== TRANSLUCENT SURFACES ===");
console.log(JSON.stringify(probe.translucent.slice(0, 25), null, 1));
process.exit(0);
