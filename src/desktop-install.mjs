import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, renameSync, rmSync, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {portablePaths,serviceBackend} from './platform-services.mjs';

const LABEL='io.github.arShen6.agy-metrics';
const OWNER='AGY Metrics desktop installation v1\n';
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const launchctl=args=>spawnSync('/bin/launchctl',args,{encoding:'utf8',timeout:20000});
const pause=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);

export function desktopPaths(home=os.homedir()) {
  const root=path.join(home,'Library','Application Support','AGY Metrics');
  return {root,marker:path.join(root,'.agy-metrics-owner'),
    plistPath:path.join(home,'Library','LaunchAgents',`${LABEL}.plist`)};
}

function requireOwned(p) {
  if(existsSync(p.root) && (lstatSync(p.root).isSymbolicLink() || !existsSync(p.marker) ||
      readFileSync(p.marker,'utf8')!==OWNER)) throw new Error('安装目录归属不明，未覆盖现有文件。');
  if(existsSync(p.plistPath) && (lstatSync(p.plistPath).isSymbolicLink() || !existsSync(p.marker) ||
      !readFileSync(p.plistPath,'utf8').includes(`<!-- ${LABEL} -->`)))
    throw new Error('后台服务文件归属不明，未覆盖现有文件。');
}

function checked(run,args) {
  const result=run(args);
  if(result.status!==0) throw new Error(`launchctl ${args[0]}: ${result.error?.message||result.stderr?.trim()||result.status}`);
  return result;
}

function queryService(run,target) {
  const result=run(['print',target]);
  if(result.status===0) return {loaded:true,running:/\bpid\s*=\s*\d+/.test(result.stdout||'')};
  if(!result.error && /could not find service/i.test(result.stderr||'')) return {loaded:false,running:false};
  throw new Error(`无法确认后台服务状态：${result.error?.message||result.stderr?.trim()||result.status}`);
}

function stopService(run,target,wait) {
  checked(run,['bootout',target]);
  // bootout may return while launchd still retains the terminating job.
  // Do not replace its definition or bootstrap a duplicate until it is gone.
  const deadline=Date.now()+20000;
  for(let attempt=0;attempt<=200;attempt++) {
    if(!queryService(run,target).loaded)return;
    if(attempt===200||Date.now()>=deadline)throw new Error('后台服务停止等待超时，未注册新服务。请稍后重新运行安装器。');
    wait(Math.min(100,Math.max(0,deadline-Date.now())));
  }
}

function atomicWrite(file,contents) {
  mkdirSync(path.dirname(file),{recursive:true});
  const temporary=`${file}.${randomUUID()}.tmp`;
  try {writeFileSync(temporary,contents,{mode:0o600});renameSync(temporary,file);}
  finally {rmSync(temporary,{force:true});}
}

function copyRuntime(source,destination,platform='darwin') {
  const copy=(from,to)=>{
    const stat=lstatSync(from);
    if(stat.isSymbolicLink()) throw new Error('安装源包含符号链接，请使用完整源码目录。');
    if(stat.isDirectory()) {
      mkdirSync(to,{recursive:true});
      for(const name of readdirSync(from)) {
        const entry=path.join(from,name);
        if(lstatSync(entry).isDirectory() || /\.(?:mjs|js)$/.test(name)) copy(entry,path.join(to,name));
      }
    } else {copyFileSync(from,to);}
  };
  mkdirSync(destination,{recursive:true});
  for(const name of ['bin','src','ui','package.json','LICENSE']) copy(path.join(source,name),path.join(destination,name));
  const runtime=path.join(source,'runtime');
  if(existsSync(runtime)) {
    mkdirSync(path.join(destination,'runtime'));
    const binary=platform==='win32'?'node.exe':'node';
    for(const name of [binary,'LICENSE']) {
      const file=path.join(runtime,name);
      if(!lstatSync(file).isFile()) throw new Error('Invalid bundled runtime');
      copyFileSync(file,path.join(destination,'runtime',name));
    }
    chmodSync(path.join(destination,'runtime',binary),0o755);
  }
}

export function desktopStatus({home=os.homedir(),uid=process.getuid?.(),run=launchctl}={}) {
  const p=desktopPaths(home),target=`gui/${uid}/${LABEL}`;
  return {...p,...queryService(run,target)};
}

export function installDesktop({home=os.homedir(),sourceRoot,nodePath=process.execPath,uid=process.getuid?.(),run=launchctl,language='zh-CN',wait=pause}) {
  if(!['zh-CN','en'].includes(language)) throw new Error('Language must be zh-CN or en');
  const p=desktopPaths(home);requireOwned(p);
  const target=`gui/${uid}/${LABEL}`,domain=`gui/${uid}`;
  const previous=existsSync(p.plistPath)?readFileSync(p.plistPath,'utf8'):null;
  const wasLoaded=queryService(run,target).loaded;
  // Never adopt a launchd job not created by this installer.
  if(wasLoaded && previous===null) throw new Error('已存在同名服务，归属不明，未修改。');
  mkdirSync(p.root,{recursive:true,mode:0o700});
  writeFileSync(p.marker,OWNER,{mode:0o600});
  const releaseDir=path.join(p.root,'versions',randomUUID());
  copyRuntime(sourceRoot,releaseDir);
  const installedNode=existsSync(path.join(releaseDir,'runtime','node'))?path.join(releaseDir,'runtime','node'):nodePath;
  const logs=path.join(p.root,'logs');mkdirSync(logs,{recursive:true,mode:0o700});
  const plist=`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<!-- ${LABEL} -->
<key>Label</key><string>${LABEL}</string>
<key>ProgramArguments</key><array><string>${xml(installedNode)}</string><string>${xml(path.join(releaseDir,'bin/agy-metrics.mjs'))}</string><string>start</string><string>--language</string><string>${language}</string></array>
<key>WorkingDirectory</key><string>${xml(releaseDir)}</string>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>ThrottleInterval</key><integer>15</integer>
<key>ExitTimeOut</key><integer>15</integer>
<key>ProcessType</key><string>Background</string>
<key>StandardOutPath</key><string>${xml(path.join(logs,'metrics.log'))}</string>
<key>StandardErrorPath</key><string>${xml(path.join(logs,'error.log'))}</string>
</dict></plist>\n`;
  let definitionChanged=false;
  try {
    if(wasLoaded) stopService(run,target,wait);
    atomicWrite(p.plistPath,plist);
    definitionChanged=true;
    checked(run,['bootstrap',domain,p.plistPath]);
    const state=desktopStatus({home,uid,run});
    if(!state.loaded) throw new Error('后台服务未成功注册。');
    return {...state,releaseDir};
  } catch(error) {
    // A failed/timed-out bootout can still have stopped the old job.
    // Query the actual state; unknown status must not be treated as unloaded.
    try {
      let loaded=queryService(run,target).loaded;
      if(definitionChanged && loaded) {
        stopService(run,target,wait);
        loaded=false;
      }
      if(previous!==null) atomicWrite(p.plistPath,previous); else rmSync(p.plistPath,{force:true});
      if(wasLoaded&&!loaded) checked(run,['bootstrap',domain,p.plistPath]);
    } catch(rollbackError) {
      error.message+=`；无法完成自动回滚：${rollbackError.message}。请运行 status.command 检查。`;
    }
    throw error;
  }
}

export function uninstallDesktop({home=os.homedir(),uid=process.getuid?.(),run=launchctl,wait=pause}={}) {
  const p=desktopPaths(home);requireOwned(p);
  const target=`gui/${uid}/${LABEL}`;
  const loaded=queryService(run,target).loaded;
  if(!existsSync(p.plistPath)&&!loaded) return {removed:false};
  if(!existsSync(p.marker)) throw new Error('服务归属不明，未修改。');
  if(loaded) stopService(run,target,wait);
  if(queryService(run,target).loaded) throw new Error('后台服务仍在运行，卸载未完成。');
  rmSync(p.plistPath,{force:true});
  // Keep version backups/logs. Never remove Antigravity data or settings.
  return {removed:true,retainedDirectory:p.root};
}

function portableContext(options={}) {
  const platform=options.platform||process.platform;
  if(!['linux','win32'].includes(platform))throw new Error('Unsupported installer platform');
  const p=portablePaths({...options,platform});
  if(existsSync(p.root)&&(lstatSync(p.root).isSymbolicLink()||!existsSync(p.marker)||readFileSync(p.marker,'utf8')!==OWNER))
    throw new Error('Installation directory ownership is unknown; no files were changed.');
  for(const file of [p.config,p.servicePath].filter(Boolean))if(existsSync(file)&&lstatSync(file).isSymbolicLink())
    throw new Error('Installation file ownership is unknown (symbolic link).');
  return {p,platform,backend:options.backend||serviceBackend(p,platform)};
}

export function portableStatus(options={}) {
  const {p,backend}=portableContext(options);
  return {...p,...backend.status()};
}

export function installPortable(options={}) {
  const language=options.language||'zh-CN';
  if(!['zh-CN','en'].includes(language))throw new Error('Language must be zh-CN or en');
  const {p,platform,backend}=portableContext(options),before=backend.status();
  if(before.loaded&&!before.owned)throw new Error('Existing service is not owned by this installation.');
  const previous=existsSync(p.config)?JSON.parse(readFileSync(p.config,'utf8')):null;
  if(before.loaded&&!previous)throw new Error('Existing service ownership cannot be confirmed.');
  mkdirSync(p.root,{recursive:true,mode:0o700});writeFileSync(p.marker,OWNER,{mode:0o600});
  const releaseDir=path.join(p.root,'versions',randomUUID());
  copyRuntime(options.sourceRoot,releaseDir,platform);
  const binary=path.join(releaseDir,'runtime',platform==='win32'?'node.exe':'node');
  const logs=path.join(p.root,'logs');mkdirSync(logs,{recursive:true,mode:0o700});
  const config={releaseDir,node:existsSync(binary)?binary:(options.nodePath||process.execPath),
    script:path.join(releaseDir,'bin','agy-metrics.mjs'),log:path.join(logs,'metrics.log'),language};
  backend.validate?.(config);
  try {
    if(before.loaded)backend.stop();
    backend.apply(config);atomicWrite(p.config,JSON.stringify(config));backend.start();
    const state=backend.status();
    if(!state.loaded||!state.running)throw new Error('Background service failed to start running.');
    return {...p,...state,releaseDir};
  }catch(error){
    try {
      const current=backend.status();
      if(current.loaded&&!current.owned)throw new Error('Service ownership changed; rollback stopped.');
      if(current.loaded)backend.stop();
      if(previous){backend.apply(previous);atomicWrite(p.config,JSON.stringify(previous));if(before.running)backend.start();}
      else {backend.remove();rmSync(p.config,{force:true});}
    }catch(rollback){error.message+=` Rollback failed: ${rollback.message}`;}
    throw error;
  }
}

export function uninstallPortable(options={}) {
  const {p,backend}=portableContext(options),state=backend.status();
  if(state.loaded&&(!state.owned||!existsSync(p.marker)))throw new Error('Existing service is not owned by this installation.');
  if(state.loaded)backend.stop();
  backend.remove();rmSync(p.config,{force:true});
  return {removed:true,retainedDirectory:p.root};
}
