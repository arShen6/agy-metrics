// Self-contained so the same formatter can run in Node tests and the Desktop renderer.
export function formatRate(n) { return Number.isFinite(n)?n.toFixed(1):'—'; }

export function formatTooltip(payload,language='zh-CN',rate=formatRate) {
  const en=language==='en';
  const exact=n=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:0}):'—';
  if(!payload?.hasData) {
    const statuses=en?
      {missing:'No local conversation data',busy:'Database busy; retrying',unreadable:'Unable to read metrics','unsupported-schema':'Unsupported database format',waiting:'Waiting for call data'}:
      {missing:'无本地会话数据',busy:'数据库忙，正在重试',unreadable:'无法读取数据','unsupported-schema':'暂不支持此数据库格式',waiting:'等待调用数据'};
    return `${statuses[payload?.status]||statuses.waiting}\n${en?'Only locally recorded metrics are shown; tokens are never estimated.':'仅显示本地已写入的指标；不会估算 token。'}`;
  }
  const {latest:x,context:c,total:t}=payload;
  const hasTiming=[x.waitSeconds,x.streamSeconds,x.totalSeconds].some(Number.isFinite);
  if(en) return [
    'tokens-tips · Latest model call',
    `Status bar speed: ${rate(x.speed)} tok/s`,
    `Speed basis: ${x.mode==='stream'?'streaming output (excludes waiting)':x.mode==='end-to-end'?'end-to-end (includes waiting; possibly buffered)':'timing unavailable'}`,
    `End-to-end speed: ${rate(x.endToEndSpeed)} tok/s (includes waiting)`,
    hasTiming?`Timing: wait ${rate(x.waitSeconds)}s + output ${rate(x.streamSeconds)}s = total ${rate(x.totalSeconds)}s`:'',
    `Context: ${exact(c.used)} / ${exact(c.limit)}${c.source==='override'?' (manual limit)':c.source==='unknown'?' (limit unknown)':''}`,
    `Output: ${exact(x.output)} · Thinking ${exact(x.thinking)} · Response/tools ${exact(x.response)}`,
    `Session: ${exact(t.calls)} calls · Output ${exact(t.output)}`,
    `Input: ${exact(t.input)} · Cache read ${exact(t.cached)} · Hit rate ${rate(t.cachePercent)}%`,
    payload.skippedRows?`${payload.skippedRows} unreadable records skipped; session totals may be incomplete.`:'',
    'Based on local metadata; values may update after a model call completes.'
  ].filter(Boolean).join('\n');
  return [
    'tokens-tips · 最近一次模型调用',
    `底部速度：${rate(x.speed)} tok/s`,
    `速度口径：${x.mode==='stream'?'流式输出（不含等待）':x.mode==='end-to-end'?'端到端（含等待，可能为缓冲返回）':'计时未知'}`,
    `端到端速度：${rate(x.endToEndSpeed)} tok/s（含等待）`,
    hasTiming?`计时：等待 ${rate(x.waitSeconds)}s + 输出 ${rate(x.streamSeconds)}s = 总计 ${rate(x.totalSeconds)}s`:'',
    `上下文：${exact(c.used)} / ${exact(c.limit)}${c.source==='override'?'（手动上限）':c.source==='unknown'?'（上限未知）':''}`,
    `本次输出：${exact(x.output)} · 思考 ${exact(x.thinking)} · 响应/工具 ${exact(x.response)}`,
    `会话累计：${exact(t.calls)} 次调用 · 输出 ${exact(t.output)}`,
    `输入：${exact(t.input)} · 缓存读取 ${exact(t.cached)} · 命中 ${rate(t.cachePercent)}%`,
    payload.skippedRows?`已跳过 ${payload.skippedRows} 条无法解析的记录，累计可能不完整。`:'',
    '以本地元数据为准，可能在一次模型调用结束后更新。'
  ].filter(Boolean).join('\n');
}
