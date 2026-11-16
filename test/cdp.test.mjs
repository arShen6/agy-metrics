import test from 'node:test';
import assert from 'node:assert/strict';
import { isLocalSocket, isAppTarget } from '../src/cdp.mjs';
import { resolvePaths, parseOptions } from '../src/paths.mjs';
test('CDP validates exact loopback hosts, ports and page type',()=>{
  assert.equal(isLocalSocket('ws://127.0.0.1:9222/devtools/page/abc',9222),true);
  for(const url of ['ws://127.0.0.1.evil.test:9222/a','ws://evil.test/a','ws://127.0.0.1:9223/a','wss://127.0.0.1:9222/a','ws://user:pass@127.0.0.1:9222/a']) assert.equal(isLocalSocket(url,9222),false);
  assert.equal(isAppTarget({type:'page',url:'http://127.0.0.1:1234/c/id'}),true);
  assert.equal(isAppTarget({type:'page',url:'https://127.0.0.1.evil.test/'}),false);
  assert.equal(isAppTarget({type:'iframe',url:'http://localhost:1234/'}),false);
});
test('channel paths resolve for all platforms without changing global Node settings',()=>{
  const mac=resolvePaths({home:'/home/demo',platform:'darwin',channel:'stable',env:{}});
  assert.equal(mac.dataDir,'/home/demo/.gemini/antigravity/conversations');
  assert.equal(mac.portFile,'/home/demo/Library/Application Support/Antigravity/DevToolsActivePort');
  const win=resolvePaths({home:'C:\\Users\\demo',platform:'win32',channel:'insiders',env:{APPDATA:'C:\\Roaming'}});
  assert.equal(win.portFile,'C:\\Roaming\\Antigravity - Insiders\\DevToolsActivePort');
});
test('CLI rejects unknown options, invalid ports and too-fast polling',()=>{
  assert.deepEqual(parseOptions(['doctor','--port','9222','--interval=1500']),{command:'doctor',port:9222,interval:1500,channel:'stable'});
  for(const args of [['--wat'],['--port','0'],['--port','99999'],['--interval','1'],['--context-limit','NaN'],['--channel','other']]) assert.throws(()=>parseOptions(args));
});
