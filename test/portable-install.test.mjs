import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as desktop from '../src/desktop-install.mjs';

function fixture(t,platform) {
  const temp=mkdtempSync(path.join(os.tmpdir(),'agy-portable-'));
  t.after(()=>rmSync(temp,{recursive:true,force:true}));
  const sourceRoot=path.join(temp,'source'),home=path.join(temp,'User 中文 & space');
  for(const name of ['bin','src','ui','runtime'])mkdirSync(path.join(sourceRoot,name),{recursive:true});
  for(const name of ['bin/agy-metrics.mjs','src/metrics.mjs','ui/widget.js','LICENSE','runtime/LICENSE'])writeFileSync(path.join(sourceRoot,name),'fixture');
  writeFileSync(path.join(sourceRoot,'package.json'),'{}');
  writeFileSync(path.join(sourceRoot,'runtime',platform==='win32'?'node.exe':'node'),'fixture runtime');
  writeFileSync(path.join(sourceRoot,'private.db'),'never copy');
  let state={loaded:false,running:false,owned:true},config=null,fail=false,silentFailure=false;
  const backend={
    status:()=>({...state}),
    stop:()=>{state.running=false;},
    apply:value=>{config=value;state.loaded=true;},
    start:()=>{if(fail){fail=false;throw new Error('start failed');}state.running=!silentFailure;silentFailure=false;},
    remove:()=>{state={loaded:false,running:false,owned:true};}
  };
  return {home,sourceRoot,platform,env:{LOCALAPPDATA:path.join(home,'Local'),APPDATA:path.join(home,'Roaming')},backend,
    getConfig:()=>config,failStart:()=>{fail=true;},silentStartFailure:()=>{silentFailure=true;},makeForeign:()=>{state={loaded:true,running:true,owned:false};}};
}

for(const platform of ['linux','win32']) {
  test(`${platform}: installation keeps its own runtime and uninstall preserves user data`,t=>{
    assert.equal(typeof desktop.installPortable,'function');
    const f=fixture(t,platform),result=desktop.installPortable({...f,language:'en'});
    assert.equal(result.running,true);
    const config=f.getConfig();
    assert.equal(config.language,'en');
    assert.equal(readFileSync(config.node,'utf8'),'fixture runtime');
    assert.equal(existsSync(path.join(config.releaseDir,'private.db')),false);
    rmSync(f.sourceRoot,{recursive:true});
    assert.equal(existsSync(config.node),true);
    const userData=path.join(f.home,'conversation.db');writeFileSync(userData,'keep');
    desktop.uninstallPortable(f);
    assert.equal(readFileSync(userData,'utf8'),'keep');
    assert.equal(existsSync(config.node),true);
    assert.equal(desktop.portableStatus(f).loaded,false);
  });
  test(`${platform}: failed upgrade restores the previous runnable configuration`,t=>{
    assert.equal(typeof desktop.installPortable,'function');
    const f=fixture(t,platform);desktop.installPortable(f);
    const before=f.getConfig();f.failStart();
    assert.throws(()=>desktop.installPortable({...f,language:'en'}),/start failed/);
    assert.deepEqual(f.getConfig(),before);
    assert.equal(desktop.portableStatus(f).running,true);
  });
  test(`${platform}: unrelated service and unsupported language are left untouched`,t=>{
    assert.equal(typeof desktop.installPortable,'function');
    const f=fixture(t,platform);f.makeForeign();
    assert.throws(()=>desktop.installPortable(f),/owned|ownership/);
    assert.equal(f.getConfig(),null);
    assert.throws(()=>desktop.installPortable({...f,language:'fr'}),/Language/);
    assert.equal(f.getConfig(),null);
  });
  test(`${platform}: a registered service that fails to run triggers upgrade rollback`,t=>{
    const f=fixture(t,platform);desktop.installPortable(f);const before=f.getConfig();
    f.silentStartFailure();
    assert.throws(()=>desktop.installPortable(f),/start|running/);
    assert.deepEqual(f.getConfig(),before);
    assert.equal(desktop.portableStatus(f).running,true);
  });
}
