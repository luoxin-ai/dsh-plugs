/**
 * Injected stylesheet for the split seat (方案四「双浪」), restyled to match
 * the native model-selection aesthetic (verified from its shipped CSS):
 *   - triggers are BORDERLESS pills (radius 24, 13px/500, label-secondary,
 *     hover interactive-bg-hover) — no boxy frames
 *   - the model menu and effort popover OPEN UPWARD (bottom: calc(100% + 8px))
 *     — the seat sits at the bottom of the composer, so a downward menu is
 *     off-screen when the window is maximized
 *   - menu rows are two-line options (name 14px/500 + description 12px) with
 *     a check column; sticky group titles; inner scroll container
 * All class names are dmu-prefixed; colors use design tokens.
 */

export const STYLE_ID = "dsh-model-ui/styles";

const CSS = `
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

export function injectWaveStyles(): () => void {
  if (typeof document === "undefined") return () => {};
  const existing = document.getElementById(STYLE_ID);
  if (existing) return () => existing.remove();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.setAttribute("data-plugin-css", "dsh-model-ui");
  style.textContent = CSS;
  document.head.appendChild(style);
  return () => style.remove();
}
