// Native syntax validation only. Never registers a service or opens Antigravity.
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {systemdDefinition,windowsControlScript,windowsInvocation,portablePaths} from '../src/platform-services.mjs';

const temp=mkdtempSync(path.join(tmpdir(),'agy-service-smoke-'));
function check(command,args){
  const result=spawnSync(command,args,{encoding:'utf8',timeout:30000});
  if(result.status!==0)throw new Error(result.error?.message||result.stderr||result.stdout||`${command}: ${result.status}`);
  if(result.stderr)process.stderr.write(result.stderr);
}
try {
  const root=path.join(temp,"User 中文 & space%$'");mkdirSync(root,{recursive:true});
  const config={releaseDir:root,node:process.execPath,script:path.join(root,'helper.mjs'),log:path.join(root,'metrics.log'),language:'en'};
  writeFileSync(config.script,'// smoke fixture');
  if(process.platform==='linux') {
    const file=path.join(temp,'agy-token-tips.service');writeFileSync(file,systemdDefinition(config));
    check('systemd-analyze',['verify','--man=no',file]);
    console.log('Linux systemd unit syntax verified (no service registered).');
  }else if(process.platform==='win32') {
    const p=portablePaths({home:root,env:{LOCALAPPDATA:root},platform:'win32'});
    const scripts=[windowsControlScript(p,'apply',config),Buffer.from(windowsInvocation(config).split(' ').at(-1),'base64').toString('utf16le')];
    for(const script of scripts){
      const encoded=Buffer.from(script,'utf16le').toString('base64');
      const parse=`$tokens=$null; $errors=$null; [System.Management.Automation.Language.Parser]::ParseInput([Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${encoded}')),[ref]$tokens,[ref]$errors) | Out-Null; if ($errors.Count) { $errors | Out-String | Write-Error; exit 1 }`;
      check('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(parse,'utf16le').toString('base64')]);
    }
    console.log('Windows service and launcher PowerShell syntax verified (no task registered).');
  }else console.log('Native service syntax smoke applies to Windows/Linux.');
}finally{rmSync(temp,{recursive:true,force:true});}
