import test from 'node:test';
import assert from 'node:assert/strict';
import * as paths from '../src/paths.mjs';

test('launch is a separate command so an installed helper is not started twice',()=>{
  assert.equal(paths.parseOptions(['launch']).command,'launch');
});
test('Windows app discovery resolves per-user and machine installs without shell interpolation',()=>{
  assert.equal(typeof paths.appExecutable,'function');
  const executable='C:\\Users\\User 中文\\AppData\\Local\\Programs\\Antigravity\\Antigravity.exe';
  assert.equal(paths.appExecutable({platform:'win32',env:{LOCALAPPDATA:'C:\\Users\\User 中文\\AppData\\Local'},exists:p=>p===executable}),executable);
  const machine='C:\\Program Files\\Antigravity\\Antigravity.exe';
  assert.equal(paths.appExecutable({platform:'win32',env:{ProgramFiles:'C:\\Program Files'},exists:p=>p===machine}),machine);
});
test('Linux app discovery finds the executable in PATH and reports missing installs',()=>{
  assert.equal(typeof paths.appExecutable,'function');
  assert.equal(paths.appExecutable({platform:'linux',env:{PATH:'/custom/bin:/usr/bin'},exists:p=>p==='/custom/bin/antigravity'}),'/custom/bin/antigravity');
  assert.throws(()=>paths.appExecutable({platform:'linux',env:{},exists:()=>false}),/Antigravity.*--app/);
});
