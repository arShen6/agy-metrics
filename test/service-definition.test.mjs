import test from 'node:test';
import assert from 'node:assert/strict';
import {systemdDefinition,windowsInvocation} from '../src/platform-services.mjs';

test('systemd disables environment expansion and preserves literal executable and working directory paths',()=>{
  const unit=systemdDefinition({node:'/usr/$HOME/bin/node',script:'/tmp/$HOME space/helper.mjs',releaseDir:'/tmp/$HOME space',log:'/tmp/$HOME space/metrics.log',language:'en'});
  assert.ok(unit.includes('ExecStart=:"/usr/$HOME/bin/node" "/tmp/$HOME space/helper.mjs"'));
  assert.ok(unit.includes('WorkingDirectory=/tmp/$HOME space\n'));
});
test('Windows launcher preserves quotes and Unicode as literal PowerShell arguments',()=>{
  const command=windowsInvocation({node:'C:\\Node Tools\\node.exe',script:"C:\\User's 中文\\helper.mjs",log:"C:\\User's 中文\\metrics.log",language:'en'});
  const script=Buffer.from(command.split(' ').at(-1),'base64').toString('utf16le');
  assert.ok(script.includes("'C:\\User''s 中文\\helper.mjs'"));
  assert.ok(script.includes("'--language' 'en'"));
});
