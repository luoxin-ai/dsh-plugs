/**
 * Localized strings. Keys mirror the native model-selection dictionary where
 * the behavior is shared (blocked.composer, trigger.fallback, ...) plus new
 * keys owned by the split seat.
 */

export const NS = "model-ui";

const zh = {
  "command.description": "选择本会话使用的模型",
  "option.loadError": "目录加载失败：{message}",
  "trigger.fallback": "选择模型",
  "trigger.aria": "选择模型，当前 {model}",
  "trigger.ariaEffort": "选择模型，当前 {model}，推理等级 {effort}",
  "menu.model": "模型",
  "status.loading": "正在刷新模型列表…",
  "error.action": "模型操作失败：{message}",
  "action.reload": "重新加载",
  "warning.groupLoad": "{name} 加载失败：{message}",
  "empty.models": "没有可用的模型。",
  "blocked.composer": "当前模型不可用，请先选择模型",
  "empty.efforts": "当前模型未提供推理等级。",
  "effort.title": "推理强度",
  "effort.reset": "使用模型默认",
  "effort.resetHint": "回到模型适配器默认的推理强度",
  "effort.defaultDesc": "由模型适配器决定推理强度。",
  "effort.aria": "推理等级，当前 {effort}",
  "effort.max": "Max"
};

const en = {
  "command.description": "Select the model for this conversation",
  "option.loadError": "Catalog failed to load: {message}",
  "trigger.fallback": "Select model",
  "trigger.aria": "Select model, current {model}",
  "trigger.ariaEffort": "Select model, current {model}, effort {effort}",
  "menu.model": "Model",
  "status.loading": "Refreshing model list…",
  "error.action": "Model operation failed: {message}",
  "action.reload": "Reload",
  "warning.groupLoad": "{name} failed to load: {message}",
  "empty.models": "No models available.",
  "blocked.composer": "The current model is unavailable, select a model first",
  "empty.efforts": "The current model exposes no effort levels.",
  "effort.title": "Reasoning effort",
  "effort.reset": "Use model default",
  "effort.resetHint": "Revert to the adapter's default reasoning effort",
  "effort.defaultDesc": "The model adapter decides the reasoning effort.",
  "effort.aria": "Reasoning effort, current {effort}",
  "effort.max": "Max"
};

export const dictionaries = { zh, en };
