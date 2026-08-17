/**
 * Localized strings for the settings row. The settings framework passes `t`
 * bound to this namespace to the registered component.
 */

export const SETTINGS_NS = "settings.frosted-glass";

const zh = {
  "row.title": "毛玻璃",
  "row.subtitle": "由 Frosted Glass 提供 · 真模糊 + 半透明表面 + 背景图",
  "glass.toggle": "启用毛玻璃",
  "glass.alpha": "透明度",
  "glass.alphaHint": "透明度越大越透，背景越清晰。",
  "glass.blur": "模糊强度",
  "glass.blurHint": "背板模糊半径（0 表示只透明不模糊）。",
  "wallpaper.title": "背景图",
  "wallpaper.choose": "选择图片…",
  "wallpaper.upload": "点击上传背景图",
  "wallpaper.formats": "支持 JPG / PNG / WebP / GIF",
  "wallpaper.badType": "仅支持 JPG / PNG / WebP / GIF 格式的图片",
  "wallpaper.urlPlaceholder": "或粘贴图片 URL",
  "wallpaper.remove": "移除背景",
  "wallpaper.replace": "更换背景",
  "wallpaper.save": "保存",
  "wallpaper.unsaved": "有未保存的更改",
  "wallpaper.badUrl": "图片链接加载失败，请检查后重试",
  "wallpaper.checking": "校验中…",
  "wallpaper.hint": "背景铺满整个页面，保存在本浏览器；过大的图片会自动压缩。"
};

const en = {
  "row.title": "Frosted Glass",
  "row.subtitle": "Powered by Frosted Glass · real blur + translucent surfaces + wallpaper",
  "glass.toggle": "Enable frosted glass",
  "glass.alpha": "Opacity",
  "glass.alphaHint": "Higher transparency reveals more of the background.",
  "glass.blur": "Blur strength",
  "glass.blurHint": "Backdrop blur radius (0 = translucency only).",
  "wallpaper.title": "Background",
  "wallpaper.choose": "Choose image…",
  "wallpaper.upload": "Click to upload a background",
  "wallpaper.formats": "JPG / PNG / WebP / GIF",
  "wallpaper.badType": "Only JPG / PNG / WebP / GIF images are supported",
  "wallpaper.urlPlaceholder": "…or paste an image URL",
  "wallpaper.remove": "Remove background",
  "wallpaper.replace": "Replace",
  "wallpaper.save": "Save",
  "wallpaper.unsaved": "Unsaved changes",
  "wallpaper.badUrl": "Image failed to load from this URL. Please check and retry.",
  "wallpaper.checking": "Checking…",
  "wallpaper.hint": "The background spans the whole page and stays in this browser; large images are compressed automatically."
};

export const dictionaries = { zh, en };
