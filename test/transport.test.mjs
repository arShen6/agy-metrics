import test from 'node:test';
import assert from 'node:assert/strict';
import { CdpClient } from '../src/cdp.mjs';

class Wire extends EventTarget {
  readyState=1;
  sent=[];
  send(raw){this.sent.push(JSON.parse(raw));}
  reply(id,result,error){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({id,result,error})}));}
  close(){this.readyState=3;this.dispatchEvent(new Event('close'));}
}
test('CDP replies are matched by request ID, including out-of-order replies',async()=>{
  const wire=new Wire(),client=new CdpClient(wire);
  const first=client.send('first'),second=client.send('second');
  wire.reply(2,{value:'second'});wire.reply(1,{value:'first'});
  assert.deepEqual(await first,{value:'first'});assert.deepEqual(await second,{value:'second'});
  assert.equal(client.pending.size,0);wire.close();
});
test('disconnect rejects pending requests; protocol and renderer errors propagate',async()=>{
  const wire=new Wire(),client=new CdpClient(wire);
  const first=assert.rejects(client.send('blocked'),/not allowed/);
  wire.reply(1,undefined,{message:'not allowed'});await first;
  const second=assert.rejects(client.evaluate('test'),/Renderer evaluation failed/);
  wire.reply(2,{exceptionDetails:{text:'failure'}});await second;
  const third=assert.rejects(client.send('pending'),/closed/);wire.close();await third;
  assert.equal(client.pending.size,0);await assert.rejects(client.send('after-close'),/disconnected/);
});
test('an unrelated page is not injected',async()=>{
  const wire=new Wire(),client=new CdpClient(wire);
  const installed=client.install('SOURCE');wire.reply(1,{result:{value:false}});
  assert.equal(await installed,false);assert.equal(wire.sent.length,1);wire.close();
});
