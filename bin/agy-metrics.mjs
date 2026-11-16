#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { parseOptions, resolvePaths, candidatePorts } from '../src/paths.mjs';
import {widgetSource} from '../src/widget-source.mjs';

const help = `agy-token-tips 0.2.4 — Antigravity Desktop metrics

  node bin/agy-metrics.mjs start [options]
  node bin/agy-metrics.mjs doctor

  --channel stable|insiders  默认 stable
  --port 9222               指定本地 CDP 端口，否则自动发现
  --data-dir PATH           指定 conversations 目录
  --port-file PATH          指定 DevToolsActivePort 文件
  --context-limit N         手动覆盖上下文上限（默认读取元数据）
  --interval 1500           刷新间隔，500–60000 毫秒
  --language zh-CN|en       悬浮解释语言 / Tooltip language
  --launch                  尝试启动带本地调试端口的 Antigravity
  --app PATH                可选应用路径（Linux/Windows 启动时需要）

Ctrl+C 停止并移除指标。不会改动应用包、主题、字体或语言设置。`;

async function main() {
  const options=parseOptions(process.argv.slice(2));
  const metadata=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  const language=options.language||metadata.tokenTips?.language||'zh-CN';
  const en=language==='en';
  if(options.command==='help'){console.log(help);return;}
  const [major,minor]=process.versions.node.split('.').map(Number);
  if(major<22||(major===22&&minor<16)) throw new Error('需要 Node.js >=22.16。可运行 ./start.command 自动寻找本机已有的新版本 Node。');
  const {MetricsReader}=await import('../src/database.mjs');
  const {CdpClient,discover}=await import('../src/cdp.mjs');
  const paths=resolvePaths(options);
  async function endpoints(){
    const results=await Promise.all(candidatePorts(paths,options.port).map(async port=>{
      try{return {port,targets:await discover(port)};}catch{return {port,targets:[]};}
    }));
    return results;
  }
  if(options.command==='doctor'){
    const reports=await endpoints();
    const windows=[];
    for(const {port,targets} of reports) for(const target of targets) {
      let client;
      try {
        client=await CdpClient.connect(target.webSocketDebuggerUrl,port);
        const state=await client.evaluate(`(()=>{
          const host=document.getElementById('agy-metrics-widget');
          const rect=host?.getBoundingClientRect();
          let visible=!!host?.isConnected&&!!rect&&rect.width>0&&rect.height>0;
          for(let node=host;visible&&node;node=node.parentElement) {
            const style=getComputedStyle(node);
            if(style.display==='none'||style.visibility!=='visible'||Number(style.opacity)===0) visible=false;
          }
          return {desktop:!!document.getElementById('antigravity.agentSidePanelInputBox'),
            installed:!!window.__agyMetrics,mounted:!!host?.isConnected,
            visible,
            hasConversation:!!window.__agyMetrics?.conversationId(),
            display:host?.shadowRoot?.querySelector('button')?.textContent||null};
        })()`);
        if(state?.desktop) windows.push({port,...state});
      } catch { windows.push({port,error:'无法读取窗口状态'}); }
      // Diagnostics must never call dispose(), which removes the live widget.
      finally { client?.socket.close(); }
    }
    console.log(JSON.stringify({node:process.versions.node,channel:options.channel,
      dataDirectoryExists:existsSync(paths.dataDir),portFileExists:existsSync(paths.portFile),
      endpoints:reports.map(r=>({port:r.port,pages:r.targets.length})),
      windows,ready:windows.some(w=>w.visible)},null,2));
    return;
  }
  if(options.launch && !(await endpoints()).some(r=>r.targets.length)){
    const debugArgs=[`--remote-debugging-port=${options.port||paths.fallbackPort}`,'--remote-debugging-address=127.0.0.1'];
    let command,args;
    if(process.platform==='darwin'){command='/usr/bin/open';args=['-a',options.app||paths.appName,'--args',...debugArgs];}
    else if(options.app){command=options.app;args=debugArgs;}
    else throw new Error('此平台请手动启动 Antigravity，或通过 --app 指定应用程序路径。');
    await new Promise((resolve,reject)=>{
      const child=spawn(command,args,{stdio:'ignore',detached:process.platform!=='darwin'});
      child.once('error',reject);
      if(process.platform==='darwin') child.once('exit',code=>code===0?resolve():reject(new Error('无法启动 Antigravity')));
      else child.once('spawn',()=>{child.unref();resolve();});
    });
  }
  const source=widgetSource(language);
  const reader=new MetricsReader(paths.dataDir,{contextLimit:options.contextLimit});
  const clients=new Map(),stop=new AbortController(); let warned=false,connected=false;
  const shutdown=()=>stop.abort(); process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
  console.log(en?'agy-token-tips started; waiting for Antigravity. Ctrl+C stops the helper.':'agy-token-tips 已启动；等待 Antigravity。Ctrl+C 停止并移除指标。');
  try{
    while(!stop.signal.aborted){
      const found=await endpoints(); const live=new Set();
      for(const {port,targets} of found) for(const target of targets){
        const key=`${port}/${target.id}`; live.add(key);
        let client=clients.get(key);
        try{
          if(!client?.open){
            if(client) await client.dispose(); clients.delete(key);
            client=await CdpClient.connect(target.webSocketDebuggerUrl,port);
            if(!await client.install(source)){await client.dispose();continue;}
            clients.set(key,client); connected=true;
            console.log(en?'Connected to Antigravity. Metrics follow the current conversation.':'已连接 Antigravity，指标随当前对话更新。');
          }
          const state=await client.evaluate('({installed:!!window.__agyMetrics,id:window.__agyMetrics?.conversationId()||""})');
          if(!state?.installed){await client.evaluate(source);continue;}
          if(state.id){
            const payload=reader.read(state.id);
            await client.evaluate(`window.__agyMetrics?.update(${JSON.stringify(payload)})`);
          }
        }catch{
          if(client) await client.dispose(); clients.delete(key);
          console.log(en?'Connection interrupted; reconnecting.':'连接暂时中断，正在重新连接。');
        }
      }
      for(const [key,client] of clients) if(!live.has(key)){await client.dispose();clients.delete(key);}
      if(!connected&&!warned){
        warned=true;
        console.log(en?'If Desktop stays disconnected, save your work and restart it using start.command. This helper never closes the app.':'若应用已打开但始终无法连接：请保存工作并退出后，用 ./start.command 或 --launch 启动。不会自动关闭你的应用。');
      }
      await delay(options.interval,undefined,{signal:stop.signal}).catch(()=>{});
    }
  }finally{
    await Promise.allSettled([...clients.values()].map(c=>c.dispose()));
    process.removeListener('SIGINT',shutdown);process.removeListener('SIGTERM',shutdown);
    console.log(en?'agy-token-tips stopped; runtime metrics removed.':'agy-token-tips 已停止，运行时指标已移除。');
  }
}
main().catch(error=>{console.error(`agy-token-tips: ${error.message}`);process.exitCode=1;});
