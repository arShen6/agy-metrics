"""Development-only UI integration checks: python -m pip install playwright; playwright install chromium."""
from pathlib import Path
import json
import os
import subprocess
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ID = '12345678-1234-1234-1234-123456789abc'
NEXT = '87654321-1234-1234-1234-123456789abc'
HTML = '''<!doctype html><style>
body{margin:0;background:#f7f7f8;font:14px system-ui;color:#242424}
main{max-width:960px;margin:60px auto;padding:24px}
.card{border:1px solid #ddd;border-radius:18px;padding:16px;background:white}
.editor{height:110px} .agy-composer-footer{display:flex;align-items:center;justify-content:space-between;gap:10px}
.left{display:flex;align-items:center;gap:8px;min-width:0}button{font:inherit;white-space:nowrap;border:0;padding:7px;border-radius:7px}
</style><main><h1>AGY Metrics · standalone</h1><p>Demo fixture — synthetic data</p>
<div id="antigravity.agentSidePanelInputBox" class="card"><div class="editor" contenteditable="true">Ask Antigravity…</div>
<div class="agy-composer-footer"><div class="left"><button data-testid="model-selector-trigger">Gemini 3.1 Pro</button></div><button data-testid="send-button">↑</button></div></div></main>'''
PAYLOAD = {'conversationId': ID, 'hasData': True, 'status': 'ready', 'skippedRows': 0,
 'latest': {'speed': 50, 'mode': 'stream', 'waitSeconds': 1.25, 'output': 200,
            'endToEndSpeed': 38.1, 'thinking': 50, 'response': 150},
 'context': {'used': 4000, 'limit': 200000, 'percent': 2, 'source': 'metadata'},
 'total': {'calls': 3, 'input': 3000, 'cached': 9000, 'output': 600, 'cachePercent': 75}}

def run():
    language = os.environ.get('AGY_LANGUAGE', 'zh-CN')
    source = subprocess.check_output([os.environ.get('AGY_NODE_BIN', 'node'), '--input-type=module', '-e',
        'import {widgetSource} from "./src/widget-source.mjs";process.stdout.write(widgetSource(process.argv[1]));', language], cwd=ROOT, text=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1100, 'height': 600})
        page.route('http://127.0.0.1:19091/**', lambda r: r.fulfill(content_type='text/html', body=HTML))
        page.goto('http://127.0.0.1:19091/c/'+ID)
        page.evaluate(source)
        page.evaluate('(p)=>window.__agyMetrics.update(p)', PAYLOAD)
        label = page.locator('#agy-metrics-widget').get_by_role('button')
        label.wait_for()
        assert '50.0 tok/s' in label.inner_text()
        assert 'TTFT 1.3s' in label.inner_text()
        assert page.locator('[contenteditable]').inner_text() == 'Ask Antigravity…'
        page.evaluate(source)
        assert page.locator('#agy-metrics-widget').count() == 1
        label.focus()
        assert page.locator('#agy-metrics-widget').get_by_role('tooltip').is_visible()
        assert '75.0%' in page.locator('#agy-metrics-widget').get_by_role('tooltip').inner_text()
        page.keyboard.press('Escape')
        assert not page.locator('#agy-metrics-widget').get_by_role('tooltip').is_visible()
        if os.environ.get('AGY_SCREENSHOT'):
            page.screenshot(path=os.environ['AGY_SCREENSHOT'])
        page.set_viewport_size({'width': 360, 'height': 600})
        page.wait_for_function("document.getElementById('agy-metrics-widget').dataset.layout==='stacked'")
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.evaluate('(id)=>history.pushState({}, "", "/c/"+id)', NEXT)
        page.wait_for_function('(id)=>window.__agyMetrics.conversationId()===id', arg=NEXT)
        page.wait_for_timeout(800)
        assert '50.0 tok/s' not in label.inner_text()
        page.evaluate('(p)=>window.__agyMetrics.update(p)', PAYLOAD)
        assert '50.0 tok/s' not in label.inner_text()
        page.evaluate('history.pushState({}, "", "/")')
        page.wait_for_timeout(800)
        assert not page.locator('#agy-metrics-widget').is_visible()
        page.evaluate('window.__agyMetrics.dispose()')
        assert page.locator('#agy-metrics-widget').count() == 0
        assert page.locator('[contenteditable]').inner_text() == 'Ask Antigravity…'
        browser.close()
    print(json.dumps({'ui': 'passed', 'checks': ['numeric display','editor preserved','idempotent injection','keyboard tooltip','narrow layout','route reset','stale payload rejection','home hidden','cleanup']}))

if __name__ == '__main__': run()
