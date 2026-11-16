import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeGeneration, summarize } from '../src/metrics.mjs';
import { generation, msg, num } from './fixtures.mjs';

test('decodes token usage, nanosecond timing and context capacity', () => {
  const x = decodeGeneration({ idx: 7, data: generation({ wait: 1.25 }) });
  assert.equal(x.index, 7); assert.equal(x.input, 1000); assert.equal(x.cached, 3000);
  assert.equal(x.output, 200); assert.equal(x.waitSeconds, 1.25); assert.equal(x.streamSeconds, 4);
  assert.equal(x.contextLimit, 200000); assert.equal(x.thinking, 50);
});
test('malformed protobuf lengths, overflow and truncation are rejected', () => {
  for (const data of [Buffer.from([10, 99, 1]), Buffer.from([8, 128]), Buffer.alloc(20, 255), Buffer.from([0])]) {
    assert.throws(() => decodeGeneration({ idx: 0, data }), /protobuf/i);
  }
});
test('unknown uint64 metadata does not discard valid metrics', () => {
  const data = Buffer.concat([generation(),num(77,18446744073709551615n)]);
  assert.equal(decodeGeneration({idx:0,data}).output,200);
});
test('invalid known counters and duration fields never become fabricated zero values', () => {
  const invalid = [
    msg(1,msg(4,num(2,10),num(3,18446744073709551615n))),
    msg(1,msg(4,num(2,10),msg(3,num(1,20)))),
    msg(1,msg(4,num(3,200)),msg(11,num(1,18446744073709551615n))),
    msg(1,msg(4,num(3,200)),msg(11,num(2,18446744073709551615n))),
    msg(1,msg(4,num(3,200)),num(11,2)),
    msg(1,msg(4,num(3,200)),Buffer.from([89,8,1,16,0,24,0,32,0]),msg(12,num(1,4))),
    msg(1,msg(4,num(3,200)),Buffer.from([93,8,1,16,0]),msg(12,num(1,4)))
  ];
  for (const data of invalid) assert.throws(()=>decodeGeneration({idx:0,data}),/protobuf/i);
});
test('missing timing stays unknown, and unrecognized records do not become zero data', () => {
  const row = decodeGeneration({ idx: 0, data: msg(1, msg(4, num(2, 10), num(3, 20))) });
  const x = summarize([row]);
  assert.equal(x.latest.speed, null); assert.equal(x.latest.waitSeconds, null);
  assert.equal(x.context.limit, null); assert.equal(x.context.percent, null);
  assert.equal(summarize([decodeGeneration({idx:1,data:msg(99,num(1,7))})]).hasData, false);
});
test('streaming and end-to-end rates are separate and buffering is labeled', () => {
  const x = summarize([decodeGeneration({idx:0,data:generation()})]);
  assert.equal(x.latest.speed, 50); assert.equal(x.latest.mode, 'stream');
  assert.equal(x.latest.endToEndSpeed, 200 / 6);
  const buffered = summarize([decodeGeneration({idx:0,data:generation({wait:10,stream:0.01})})]);
  assert.equal(buffered.latest.mode, 'end-to-end'); assert.ok(buffered.latest.speed < 21);
});
test('context counts cached input, session totals include all calls, override is explicit', () => {
  const x = summarize([0,1].map(idx=>decodeGeneration({idx,data:generation()})), {contextLimit:10000});
  assert.deepEqual(x.context, {used:4000,limit:10000,percent:40,source:'override'});
  assert.equal(x.total.output,400); assert.equal(x.total.input,2000); assert.equal(x.total.cachePercent,75);
});
