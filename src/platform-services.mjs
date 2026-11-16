import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,rmSync,lstatSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const NAME='agy-token-tips';
const MARK='# agy-token-tips managed user service';
const absolute=(value,fallback)=>value&&path.isAbsolute(value)?value:fallback;
export function portablePaths({platform=process.platform,home=os.homedir(),env=process.env}={}) {
  const data=platform==='win32'?(env.LOCALAPPDATA||path.join(home,'AppData','Local')):
    absolute(env.XDG_DATA_HOME,path.join(home,'.local','share'));
  const root=path.join(data,NAME);
  if(/[\r\n\0]/.test(root))throw new Error('Installation path contains unsupported control characters');
  const configHome=absolute(env.XDG_CONFIG_HOME,path.join(home,'.config'));
  return {root,marker:path.join(root,'.agy-metrics-owner'),config:path.join(root,'service.json'),
    servicePath:platform==='linux'?path.join(configHome,'systemd','user',`${NAME}.service`):null,
    taskName:`${NAME}-${createHash('sha256').update(root).digest('hex').slice(0,12)}`};
}

export function systemdDefinition(config) {
  const quote=value=>'"'+String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('%','%%')+'"';
  for(const value of Object.values(config))if(/[\r\n\0]/.test(value))throw new Error('Invalid service configuration');
  return `[Unit]\nDescription=agy-token-tips\n${MARK}\n\n[Service]\nType=exec\nExecStart=:${[config.node,config.script,'start','--language',config.language].map(quote).join(' ')}\nWorkingDirectory=${config.releaseDir.replaceAll('%','%%')}\nRestart=on-failure\nRestartSec=5\nStandardOutput=append:${config.log.replaceAll('%','%%')}\nStandardError=inherit\n\n[Install]\nWantedBy=default.target\n`;
}

const psLiteral=value=>"'"+String(value).replaceAll("'","''")+"'";
export function windowsInvocation(config) {
  const script=`& ${[config.node,config.script,'start','--language',config.language].map(psLiteral).join(' ')} *> ${psLiteral(config.log)}; exit $LASTEXITCODE`;
  return '-NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand '+Buffer.from(script,'utf16le').toString('base64');
}

// The command receives a base64 JSON payload, never interpolated shell paths.
export function windowsControlScript(p,action,config=null) {
  const data=Buffer.from(JSON.stringify({name:p.taskName,owner:`${MARK} ${p.root}`,action,config,
    arguments:config?windowsInvocation(config):null})).toString('base64');
  return `$ErrorActionPreference='Stop'
$p=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${data}')) | ConvertFrom-Json
$s=New-Object -ComObject 'Schedule.Service'; $s.Connect(); $folder=$s.GetFolder('\\')
$task=$null
try { $task=$folder.GetTask($p.name) } catch { if ($_.Exception.GetBaseException().HResult -ne -2147024894) { throw } }
$owned=($null -eq $task -or $task.Definition.RegistrationInfo.Description -eq $p.owner)
if ($p.action -eq 'status') { @{loaded=($null -ne $task);running=($null -ne $task -and $task.State -eq 4);owned=$owned} | ConvertTo-Json -Compress; exit }
if (-not $owned) { throw 'Existing task is not owned by this installation' }
switch ($p.action) {
 'apply' {
  $d=$s.NewTask(0); $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $d.RegistrationInfo.Description=$p.owner
  $d.Principal.UserId=$sid; $d.Principal.LogonType=3; $d.Principal.RunLevel=0
  $d.Settings.Enabled=$true; $d.Settings.AllowDemandStart=$true
  $d.Settings.DisallowStartIfOnBatteries=$false; $d.Settings.StopIfGoingOnBatteries=$false
  $d.Settings.ExecutionTimeLimit='PT0S'; $d.Settings.MultipleInstances=2
  $trigger=$d.Triggers.Create(9); $trigger.UserId=$sid
  $a=$d.Actions.Create(0)
  $a.Path=Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'
  $a.Arguments=$p.arguments; $a.WorkingDirectory=$p.config.releaseDir
  $folder.RegisterTaskDefinition($p.name,$d,6,$null,$null,3) | Out-Null
 }
 'start' {
  if ($null -eq $task) { throw 'Task not registered' }; $task.Run($null) | Out-Null
  for ($i=0; $i -lt 50; $i++) { Start-Sleep -Milliseconds 100; if ($folder.GetTask($p.name).State -eq 4) { break } }
  Start-Sleep -Milliseconds 1000
  if ($folder.GetTask($p.name).State -ne 4) { throw 'Background task failed to start' }
 }
 'stop' {
  if ($null -ne $task) {
   $task.Stop(0)
   for ($i=0; $i -lt 100; $i++) { if ($folder.GetTask($p.name).State -notin 2,4) { break }; Start-Sleep -Milliseconds 100 }
   if ($folder.GetTask($p.name).State -in 2,4) { throw 'Task did not stop' }
  }
 }
 'remove' { if ($null -ne $task) { $folder.DeleteTask($p.name,0) } }
 default { throw 'Unknown action' }
}
`;
}

export function serviceBackend(p,platform,run=(exe,args)=>spawnSync(exe,args,{encoding:'utf8',timeout:20000,windowsHide:true})) {
  function invoke(exe,args) {
    const result=run(exe,args);
    if(result.error||result.status!==0)throw new Error(`${exe}: ${result.error?.message||result.stderr?.trim()||result.stdout?.trim()||result.status}`);
    return result.stdout||'';
  }
  function validate(config) {
    const modules=['database.mjs','cdp.mjs','widget-source.mjs'].map(name=>pathToFileURL(path.join(config.releaseDir,'src',name)).href);
    const probe=`const [a,b]=process.versions.node.split('.').map(Number); if(a<22||(a===22&&b<16))throw new Error('Node >=22.16 required'); for(const url of ${JSON.stringify(modules)})await import(url);`;
    invoke(config.node,['--input-type=module','-e',probe]);
    invoke(config.node,[config.script,'help']);
  }
  if(platform==='win32') {
    const call=(action,config)=>invoke('powershell.exe',['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-EncodedCommand',
      Buffer.from(windowsControlScript(p,action,config),'utf16le').toString('base64')]);
    return {validate,status:()=>JSON.parse(call('status').replace(/^\uFEFF/,'')),apply:config=>call('apply',config),
      start:()=>call('start'),stop:()=>call('stop'),remove:()=>call('remove')};
  }
  const unit=`${NAME}.service`,ctl=(...args)=>invoke('systemctl',['--user',...args]);
  function ownsFile(){
    if(existsSync(p.servicePath)&&(lstatSync(p.servicePath).isSymbolicLink()||!readFileSync(p.servicePath,'utf8').includes(MARK)))
      throw new Error('Existing systemd file is not owned by this installation');
  }
  return {
    validate,
    status(){
      ownsFile();
      const result=run('systemctl',['--user','show',unit,'--property=LoadState,ActiveState,FragmentPath']);
      const values=Object.fromEntries((result.stdout||'').trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
      if(result.error||!values.LoadState||(![0,4].includes(result.status)))
        throw new Error(`systemd user session is unavailable: ${result.error?.message||result.stderr?.trim()||result.status}`);
      return {loaded:values.LoadState!=='not-found',running:values.ActiveState==='active',
        owned:values.LoadState==='not-found'||(values.FragmentPath===p.servicePath&&existsSync(p.servicePath))};
    },
    apply(config){ownsFile();mkdirSync(path.dirname(p.servicePath),{recursive:true});writeFileSync(p.servicePath,systemdDefinition(config),{mode:0o600});ctl('daemon-reload');},
    start(){ctl('enable','--now',unit);},
    stop(){ctl('stop',unit);},
    remove(){ownsFile();if(existsSync(p.servicePath)){ctl('disable',unit);rmSync(p.servicePath);ctl('daemon-reload');}}
  };
}
