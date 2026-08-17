/**
 * Capture screenshots of the real UI for visual review.
 * Usage: DSH_URL=... node scripts/cdp-shots.mjs <outdir>
 */
import { writeFileSync } from "node:fs";

const DSH_URL = process.env.DSH_URL ?? "http://127.0.0.1:38999";
const OUT = process.argv[2] ?? "/tmp/dsh-shots";
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
const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: DSH_URL });
await sleep(12000);

const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.data, "base64"));
  console.log("saved", name);
};

await shot("1-main");
// open settings
await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /设置|settings/i.test(x.title || x.getAttribute('aria-label') || x.textContent || '')); if (b) b.click(); return !!b })()`);
await sleep(2500);
await shot("2-settings");
// open the 毛玻璃 row expanded (it should be visible in settings list)
// toggle glass off to compare
await evalJs(`(() => { const s = document.querySelector('[role=switch]'); if (s && s.getAttribute('aria-checked') === 'true') s.click(); return true })()`);
await sleep(1500);
await shot("3-glass-off");
// toggle back on
await evalJs(`(() => { const s = document.querySelector('[role=switch]'); if (s && s.getAttribute('aria-checked') === 'false') s.click(); return true })()`);
await sleep(1500);
await shot("4-glass-on-again");
console.log("done");
process.exit(0);
