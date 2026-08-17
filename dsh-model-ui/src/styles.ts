/**
 * Injected stylesheet for the split seat (方案四「双浪」).
 *
 * - `.dmu-seat`          the split control row (model button + effort chip)
 * - `.dmu-model-btn`     native-style model dropdown trigger
 * - `.dmu-menu`          model list panel (provider groups)
 * - `.dmu-chip`          effort pill; `.dmu-max` = highest effort state
 * - `.dmu-eq`            equalizer bars inside the chip (max only)
 * - `.dmu-popover`       effort slider panel (Claude /effort style)
 * - `.dmu-trackwave`     animated wave over the slider track (max only)
 * All class names are dmu-prefixed; colors use design tokens so the seat
 * follows the active theme. The style tag is tagged with data-plugin-css so
 * the HMR driver can remove it on teardown.
 */

export const STYLE_ID = "dsh-model-ui/styles";

const CSS = `
.dmu-seat{position:relative;display:inline-flex;align-items:center;gap:6px}
.dmu-model-btn{display:inline-flex;align-items:center;gap:4px;font-size:12px;line-height:18px;padding:3px 9px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit;max-width:220px}
.dmu-model-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dmu-model-btn:disabled{opacity:.55;cursor:default}
.dmu-model-btn .dmu-chev{font-size:9px;color:var(--dsw-alias-label-tertiary);flex:none}
.dmu-model-btn .dmu-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dmu-chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;line-height:18px;padding:3px 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;font:inherit}
.dmu-chip:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dmu-chip.dmu-max{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.dmu-chip .dmu-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary);flex:none}
.dmu-eq{display:inline-flex;align-items:flex-end;gap:2px;height:12px;flex:none}
.dmu-eq i{display:block;width:3px;border-radius:1px;background:var(--dsw-alias-brand-primary);animation:dmu-eq 1s ease-in-out infinite}
.dmu-eq i:nth-child(1){height:60%;animation-delay:0s}
.dmu-eq i:nth-child(2){height:100%;animation-delay:.15s}
.dmu-eq i:nth-child(3){height:45%;animation-delay:.3s}
.dmu-eq i:nth-child(4){height:80%;animation-delay:.45s}
@keyframes dmu-eq{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
.dmu-menu{position:absolute;top:calc(100% + 6px);right:0;z-index:50;min-width:240px;max-width:min(360px,calc(100vw - 32px));max-height:min(420px,calc(100vh - 120px));overflow:auto;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);border-radius:12px;padding:4px;display:flex;flex-direction:column;gap:1px}
.dmu-menu .dmu-group{font-size:11px;color:var(--dsw-alias-label-tertiary);padding:6px 8px 2px;line-height:16px}
.dmu-menu .dmu-row{display:flex;align-items:center;gap:8px;min-height:32px;padding:5px 8px;border-radius:8px;cursor:pointer;font-size:12.5px;color:var(--dsw-alias-label-primary);line-height:18px}
.dmu-menu .dmu-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dmu-menu .dmu-row.dmu-active{color:var(--dsw-alias-brand-primary)}
.dmu-menu .dmu-row .dmu-detail{font-size:11px;color:var(--dsw-alias-label-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.dmu-menu .dmu-note{font-size:11px;color:var(--dsw-alias-label-tertiary);padding:6px 8px}
.dmu-popover{position:absolute;top:calc(100% + 6px);right:0;z-index:50;width:300px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-menu);box-shadow:var(--dsw-shadow-lv3);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.dmu-popover .dmu-head{display:flex;justify-content:space-between;align-items:center}
.dmu-popover .dmu-head .dmu-t{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dmu-popover .dmu-reset{font-size:11px;color:var(--dsw-alias-brand-primary);background:none;border:none;cursor:pointer;padding:0;font:inherit}
.dmu-popover .dmu-name{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.dmu-popover .dmu-desc{font-size:11.5px;color:var(--dsw-alias-label-secondary);min-height:16px;line-height:16px}
.dmu-trackwrap{position:relative;margin-top:4px}
.dmu-trackwrap input[type="range"]{width:100%;-webkit-appearance:none;appearance:none;height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-3);outline:none;margin:10px 0 2px;display:block}
.dmu-trackwrap input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-brand-primary);border:2.5px solid var(--dsw-alias-bg-base);box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer}
.dmu-trackwrap .dmu-ticks{display:flex;justify-content:space-between;font-size:10px;color:var(--dsw-alias-label-tertiary)}
.dmu-trackwave{position:absolute;left:0;right:0;top:10px;height:6px;border-radius:3px;overflow:hidden;pointer-events:none}
.dmu-trackwave svg{width:200%;height:100%;display:block}
.dmu-trackwave path{stroke:var(--dsw-alias-brand-primary);stroke-width:2;fill:none;animation:dmu-wave 1.4s linear infinite}
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
