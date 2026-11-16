import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as desktop from '../src/desktop-install.mjs';

function fixture(t) {
  const root=mkdtempSync(path.join(tmpdir(),'agy-desktop-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const sourceRoot=path.join(root,'source');
  for(const dir of ['bin','src','ui','.git']) mkdirSync(path.join(sourceRoot,dir),{recursive:true});
  for(const file of ['bin/agy-metrics.mjs','src/metrics.mjs','ui/widget.js','LICENSE','package.json'])
    writeFileSync(path.join(sourceRoot,file),file==='package.json'?'{}':`fixture ${file}`);
  writeFileSync(path.join(sourceRoot,'.git','config'),'private');
  writeFileSync(path.join(sourceRoot,'conversation.db'),'private');
  let loaded=false,fail=false,partialFailure=false,stopTimeout=false,queryTimeout=false,stopDelay=0,pendingStop=0,waits=0;
  const commands=[];
  const run=args=>{
    commands.push(args);
    if(args[0]==='print') {
      if(queryTimeout)return {status:null,error:new Error('query timed out')};
      const result={status:loaded?0:1,stdout:loaded?'state = running\npid = 123':'',stderr:loaded?'':'Could not find service'};
      if(pendingStop>0&&--pendingStop===0)loaded=false;
      return result;
    }
    if(args[0]==='bootout'){
      pendingStop=stopDelay;loaded=stopDelay>0;
      if(stopTimeout){stopTimeout=false;return {status:null,error:new Error('stop timed out')};}
      return {status:0};
    }
    if(args[0]==='bootstrap'){
      if(loaded)return {status:5,stderr:'Bootstrap failed: 5: job still registered'};
      if(fail){fail=false;loaded=partialFailure;return {status:5,stderr:'fixture launch failure'};}
      loaded=true;return {status:0};
    }
    throw new Error(`Unexpected service operation ${args[0]}`);
  };
  return {root,sourceRoot,home:path.join(root,'用户 & demo'),nodePath:'/opt/Node & Tools/node',uid:501,run,
    wait:()=>{waits++;},waitCount:()=>waits,delayStops:n=>{stopDelay=n;},
    commands,failNextBootstrap:(partial=false)=>{fail=true;partialFailure=partial;},timeoutAfterStop:()=>{stopTimeout=true;},failQueries:()=>{queryTimeout=true;}};
}

test('desktop install produces a background service and copies only runtime files',t=>{
  const f=fixture(t);
  assert.equal(typeof desktop.installDesktop,'function');
  const result=desktop.installDesktop(f);
  assert.equal(result.loaded,true);
  assert.equal(readFileSync(path.join(result.releaseDir,'ui/widget.js'),'utf8'),'fixture ui/widget.js');
  assert.equal(existsSync(path.join(result.releaseDir,'.git')),false);
  assert.equal(existsSync(path.join(result.releaseDir,'conversation.db')),false);
  const plist=readFileSync(result.plistPath,'utf8');
  assert.match(plist,/<string>\/opt\/Node &amp; Tools\/node<\/string>/);
  assert.match(plist,/<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(plist,/<string>start<\/string>/);
  assert.doesNotMatch(plist,/--launch|remote-debugging/);
  assert.equal(f.commands.some(args=>args[0]==='bootstrap'&&args[1]==='gui/501'),true);
});

test('failed upgrade restores the prior service definition and installed code',t=>{
  const f=fixture(t),before=desktop.installDesktop(f);
  const plist=readFileSync(before.plistPath,'utf8');
  f.failNextBootstrap();
  assert.throws(()=>desktop.installDesktop(f),/fixture launch failure/);
  assert.equal(readFileSync(before.plistPath,'utf8'),plist);
  assert.equal(existsSync(before.releaseDir),true);
  assert.equal(desktop.desktopStatus(f).loaded,true);
});

test('uninstall stops only AGY Metrics and keeps local data and prior files',t=>{
  const f=fixture(t),installed=desktop.installDesktop(f);
  const database=path.join(f.home,'.gemini/antigravity/conversations/private.db');
  mkdirSync(path.dirname(database),{recursive:true});writeFileSync(database,'untouched');
  desktop.uninstallDesktop(f);
  assert.equal(existsSync(installed.plistPath),false);
  assert.equal(existsSync(installed.releaseDir),true);
  assert.equal(readFileSync(database,'utf8'),'untouched');
  assert.equal(desktop.desktopStatus(f).loaded,false);
  desktop.uninstallDesktop(f);
});

test('installer refuses to overwrite an unrelated folder or service file',t=>{
  const f=fixture(t);
  const p=desktop.desktopPaths(f.home);
  mkdirSync(p.root,{recursive:true});writeFileSync(path.join(p.root,'unrelated.txt'),'keep');
  assert.throws(()=>desktop.installDesktop(f),/owned|归属/);
  assert.equal(f.commands.some(args=>args[0]==='bootstrap'),false);
  rmSync(p.root,{recursive:true});
  mkdirSync(path.dirname(p.plistPath),{recursive:true});writeFileSync(p.plistPath,'unrelated');
  assert.throws(()=>desktop.installDesktop(f),/owned|归属/);
  assert.equal(readFileSync(p.plistPath,'utf8'),'unrelated');
});

test('a timed-out stop that actually stopped the job still restores the old service',t=>{
  const f=fixture(t),before=desktop.installDesktop(f);
  const old=readFileSync(before.plistPath,'utf8');
  f.timeoutAfterStop();
  assert.throws(()=>desktop.installDesktop(f),/stop timed out/);
  assert.equal(readFileSync(before.plistPath,'utf8'),old);
  assert.equal(desktop.desktopStatus(f).loaded,true);
});

test('uninstall stops an owned loaded service even when its plist was removed',t=>{
  const f=fixture(t),installed=desktop.installDesktop(f);
  rmSync(installed.plistPath);
  assert.equal(desktop.uninstallDesktop(f).removed,true);
  assert.equal(desktop.desktopStatus(f).loaded,false);
});

test('service-query failure is never reported as a successful uninstall',t=>{
  const f=fixture(t),installed=desktop.installDesktop(f);
  f.failQueries();
  assert.throws(()=>desktop.uninstallDesktop(f),/query timed out/);
  assert.equal(existsSync(installed.plistPath),true);
});

test('selected language and bundled runtime survive deletion of the downloaded package',t=>{
  const f=fixture(t);
  mkdirSync(path.join(f.sourceRoot,'runtime'));
  writeFileSync(path.join(f.sourceRoot,'runtime','node'),'fixture runtime',{mode:0o755});
  writeFileSync(path.join(f.sourceRoot,'runtime','LICENSE'),'runtime license');
  const result=desktop.installDesktop({...f,language:'en'});
  const plist=readFileSync(result.plistPath,'utf8');
  assert.match(plist,/<string>--language<\/string><string>en<\/string>/);
  assert.equal(readFileSync(path.join(result.releaseDir,'runtime','node'),'utf8'),'fixture runtime');
  assert.equal(!!(statSync(path.join(result.releaseDir,'runtime','node')).mode&0o111),true);
  assert.doesNotMatch(plist,/\/opt\/Node/);
});

test('unsupported installation language is rejected before creating files',t=>{
  const f=fixture(t);
  assert.throws(()=>desktop.installDesktop({...f,language:'other'}),/Language/);
  assert.equal(existsSync(desktop.desktopPaths(f.home).root),false);
});

test('upgrade waits for asynchronous bootout before registering the new service',t=>{
  const f=fixture(t),old=desktop.installDesktop(f);
  f.delayStops(3);
  const result=desktop.installDesktop(f);
  assert.equal(result.loaded,true);assert.notEqual(result.releaseDir,old.releaseDir);
  assert.ok(f.waitCount()>=3);
  assert.match(readFileSync(result.plistPath,'utf8'),new RegExp(path.basename(result.releaseDir)));
});

test('rollback waits for a partially registered failed service to disappear',t=>{
  const f=fixture(t),old=desktop.installDesktop(f),plist=readFileSync(old.plistPath,'utf8');
  f.delayStops(3);f.failNextBootstrap(true);
  assert.throws(()=>desktop.installDesktop(f),error=>/fixture launch failure/.test(error.message)&&!/无法完成自动回滚/.test(error.message));
  assert.equal(readFileSync(old.plistPath,'utf8'),plist);
  assert.equal(desktop.desktopStatus(f).running,true);
  assert.ok(f.waitCount()>=6);
});

test('uninstall waits for asynchronous service removal and retains version backups',t=>{
  const f=fixture(t),installed=desktop.installDesktop(f);f.delayStops(3);
  assert.equal(desktop.uninstallDesktop(f).removed,true);
  assert.equal(existsSync(installed.plistPath),false);assert.equal(existsSync(installed.releaseDir),true);
  assert.equal(desktop.desktopStatus(f).loaded,false);
});

test('a stuck stop is bounded and never overwrites or bootstraps over the old definition',t=>{
  const f=fixture(t),old=desktop.installDesktop(f),plist=readFileSync(old.plistPath,'utf8');
  f.delayStops(Infinity);
  assert.throws(()=>desktop.installDesktop(f),/停止等待超时/);
  assert.equal(readFileSync(old.plistPath,'utf8'),plist);
  assert.equal(f.commands.filter(c=>c[0]==='bootstrap').length,1);
  assert.ok(f.waitCount()<=200);
});
