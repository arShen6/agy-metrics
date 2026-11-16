import {formatTooltip,formatRate} from '../src/messages.mjs';

export function mountWidget(language='zh-CN',tooltipFormatter=formatTooltip,rateFormatter=formatRate) {
  // CDP's document-start hook may run before the root exists; the daemon retries.
  if (!document.documentElement) return;
  const VERSION = `0.2.4/${language}`;
  if (window.__agyMetrics?.version === VERSION) return;
  window.__agyMetrics?.dispose();
  const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
  let host, button, tooltip, lastId = '', payload = null, stopped = false, frame = 0;
  let observedFooter = null, resize = null;
  const compact = n => !Number.isFinite(n) ? '—' : n >= 1e6 ? `${+(n/1e6).toFixed(2)}M`
    : n >= 1000 ? `${+(n/1000).toFixed(1)}k` : String(Math.round(n));
  const rate = rateFormatter;
  function conversationId() {
    const route = location.pathname.match(/^\/c\/([^/]+)/)?.[1];
    if (route && UUID.test(route)) return route;
    const query = new URLSearchParams(location.search).get('cascadeId');
    if (query && UUID.test(query)) return query;
    // Never borrow a selected sidebar item on the new-conversation/home page.
    if (location.pathname === '/' || location.pathname === '/new') return '';
    const selected = document.querySelector('[data-testid="conversation-row-sidebar"][data-selected="true"]');
    const id = selected?.getAttribute('data-cascade-id');
    return id && UUID.test(id) ? id : '';
  }
  function hideTooltip() { if (tooltip) tooltip.hidden = true; }
  function showTooltip() {
    if (!tooltip || !tooltip.textContent || !host?.isConnected) return;
    tooltip.hidden = false;
    const r = button.getBoundingClientRect(), w = tooltip.offsetWidth, h = tooltip.offsetHeight;
    tooltip.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
    tooltip.style.top = `${Math.max(8, r.top >= h + 12 ? r.top - h - 8 : Math.min(innerHeight - h - 8, r.bottom + 8))}px`;
  }
  function create() {
    host = document.createElement('span'); host.id = 'agy-metrics-widget';
    host.style.cssText = 'display:inline-flex;min-width:0;max-width:100%;flex-shrink:1;vertical-align:middle;';
    const root = host.attachShadow({mode: 'open'}), style = document.createElement('style');
    style.textContent = `
      :host{font:11px/1.5 system-ui,-apple-system,sans-serif;color:inherit;contain:style}
      button{all:unset;box-sizing:border-box;cursor:help;display:block;max-width:100%;padding:4px 7px;border-radius:7px;border:1px solid color-mix(in srgb,currentColor 16%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:inherit;color:inherit;font-variant-numeric:tabular-nums;line-height:18px}
      button:hover,button:focus-visible{background:color-mix(in srgb,currentColor 6%,transparent)}
      button:focus-visible{outline:2px solid #5688e9;outline-offset:2px}
      :host([data-layout=stacked]) button{white-space:normal;overflow-wrap:anywhere}
      .brand{font-weight:750;opacity:.65;margin-right:6px}.data{opacity:.85}
      :host([data-level=warning]) .data{color:#a76b00}:host([data-level=critical]) .data{color:#c83c3c}
      .tip{position:fixed;z-index:2147483647;box-sizing:border-box;width:max-content;max-width:calc(100vw - 16px);padding:12px 14px;border:1px solid #dedee3;border-radius:10px;background:#fff;color:#242424;box-shadow:0 8px 28px #0002;white-space:pre-line;font:12px/1.85 system-ui,-apple-system,sans-serif;pointer-events:none}
      :host([data-dark=true]) .tip{background:#202126;color:#eee;border-color:#444}
      :host([data-dark=true][data-level=warning]) .data{color:#ebc06a}
      :host([data-dark=true][data-level=critical]) .data{color:#ff9292}
      [hidden]{display:none!important}
    `;
    button = document.createElement('button'); button.type = 'button';
    button.setAttribute('aria-describedby', 'agy-metrics-details');
    const brand = document.createElement('span'); brand.className = 'brand'; brand.textContent = 'agy';
    const data = document.createElement('span'); data.className = 'data';
    button.append(brand, data);
    tooltip = document.createElement('div'); tooltip.id = 'agy-metrics-details'; tooltip.className = 'tip';
    tooltip.setAttribute('role','tooltip'); tooltip.hidden = true;
    button.addEventListener('mouseenter', showTooltip); button.addEventListener('mouseleave', hideTooltip);
    button.addEventListener('focus', showTooltip); button.addEventListener('blur', hideTooltip);
    button.addEventListener('keydown', e => { if (e.key === 'Escape') hideTooltip(); });
    button.addEventListener('click', () => { if (tooltip.hidden) showTooltip(); else hideTooltip(); });
    root.append(style, button, tooltip);
  }
  function paint() {
    if (!host || !button) return;
    const label = button.querySelector('.data');
    let text;
    const details=tooltipFormatter(payload,language,rate);
    if (!payload?.hasData) {
      const statuses = {missing:'No local data',busy:'Database busy',unreadable:'Cannot read metrics',
        'unsupported-schema':'Unsupported format',waiting:'Waiting for metrics'};
      text = statuses[payload?.status] || statuses.waiting;
      host.dataset.level = 'normal';
    } else {
      const {latest: x, context: c} = payload;
      const speed = rate(x.speed);
      text = `${speed} tok/s · ${x.mode === 'stream' ? 'TTFT' : 'Hold'} ${rate(x.waitSeconds)}s · Ctx ${compact(c.used)}/${compact(c.limit)}${c.percent === null ? '' : ` (${Math.round(c.percent)}%)`} · Out ${compact(x.output)}`;
      host.dataset.level = c.percent >= 90 ? 'critical' : c.percent >= 75 ? 'warning' : 'normal';
    }
    if (label.textContent !== text) label.textContent = text;
    if (tooltip.textContent !== details) tooltip.textContent = details;
    button.setAttribute('aria-label', `AGY metrics: ${text}`);
  }
  function mount() {
    frame = 0; if (stopped) return;
    const id = conversationId();
    if (id !== lastId) { lastId = id; payload = null; hideTooltip(); }
    if (!id) { if (host) host.style.display = 'none'; return; }
    const box = document.getElementById('antigravity.agentSidePanelInputBox');
    if (!box) { host?.remove(); return; }
    const footer = box.querySelector('.agy-composer-footer') ||
      Array.from(box.querySelectorAll('div.flex.w-full.items-center.justify-between, [data-testid="input-box-bottom-toolbar"]'))
        .reverse().find(row => row.querySelector('[data-testid="model-selector-trigger"]'));
    if (!footer || !footer.firstElementChild) { host?.remove(); return; }
    if (!host) create();
    host.style.display = 'inline-flex';
    paint();
    const left = footer.firstElementChild;
    const siblingsWidth = Array.from(left.children).filter(e=>e!==host).reduce((sum,e)=>sum+e.getBoundingClientRect().width+8,0);
    const controlsWidth = Array.from(footer.children).filter(e=>e!==left && e!==host).reduce((sum,e)=>sum+e.getBoundingClientRect().width+8,0);
    const available = footer.clientWidth - siblingsWidth - controlsWidth - 20;
    const needed = Math.max(290, button.scrollWidth + 4);
    const stacked = available < needed;
    host.dataset.layout = stacked ? 'stacked' : 'inline';
    host.style.margin = stacked ? '8px 0 0' : '0 0 0 4px';
    if (stacked) { if (host.parentNode !== footer.parentNode || host.previousSibling !== footer) footer.after(host); }
    else if (host.parentNode !== left) left.appendChild(host);
    const rgb = getComputedStyle(box).color.match(/[\d.]+/g)?.map(Number);
    host.dataset.dark = String(rgb ? rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722 > 150 : matchMedia('(prefers-color-scheme:dark)').matches);
    if (observedFooter !== footer && typeof ResizeObserver !== 'undefined') {
      resize?.disconnect(); observedFooter = footer; resize = new ResizeObserver(schedule); resize.observe(footer);
    }
  }
  function schedule() { if (!stopped && !frame) frame = requestAnimationFrame(mount); }
  const observer = new MutationObserver(changes => {
    if (changes.some(c=>c.target!==host && !host?.contains(c.target))) schedule();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  const timer = setInterval(schedule,700);
  window.addEventListener('resize',schedule); window.addEventListener('popstate',schedule);
  window.addEventListener('scroll',hideTooltip,true);
  window.__agyMetrics = {
    version: VERSION, conversationId,
    update(next) {
      const current = conversationId();
      if (!current || next?.conversationId !== current) return false;
      lastId = current; payload = next; mount(); return true;
    },
    dispose() {
      stopped=true; clearInterval(timer); cancelAnimationFrame(frame); observer.disconnect(); resize?.disconnect();
      window.removeEventListener('resize',schedule); window.removeEventListener('popstate',schedule);
      window.removeEventListener('scroll',hideTooltip,true); host?.remove(); delete window.__agyMetrics;
    }
  };
  schedule();
}
