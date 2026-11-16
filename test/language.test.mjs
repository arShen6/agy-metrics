import test from 'node:test';
import assert from 'node:assert/strict';
import * as messages from '../src/messages.mjs';
import {parseOptions} from '../src/paths.mjs';
import {summarize} from '../src/metrics.mjs';

const payload={hasData:true,status:'ready',skippedRows:0,
  latest:{mode:'stream',endToEndSpeed:8,output:812,thinking:497,response:315},
  context:{used:231150,limit:256000,percent:90.29296875,source:'metadata'},
  total:{calls:361,output:391708,input:3321423,cached:52617089,cachePercent:94.1}};

test('English tooltip translates explanations while preserving exact metrics',()=>{
  assert.equal(typeof messages.formatTooltip,'function');
  const text=messages.formatTooltip(payload,'en');
  assert.match(text,/Latest model call/);
  assert.match(text,/231,150 \/ 256,000/);
  assert.match(text,/End-to-end speed: 8.0 tok\/s/);
  assert.match(text,/94.1%/);
  assert.doesNotMatch(text,/[\u3400-\u9fff]/);
});
test('Chinese tooltip keeps the approved wording and data-integrity notices',()=>{
  const text=messages.formatTooltip({...payload,skippedRows:2},'zh-CN');
  assert.match(text,/最近一次模型调用/);
  assert.match(text,/已跳过 2 条/);
  assert.match(text,/231,150 \/ 256,000/);
});
test('waiting and unknown metadata are explained in the selected language',()=>{
  assert.match(messages.formatTooltip({status:'missing'},'en'),/No local conversation data/);
  assert.match(messages.formatTooltip({status:'waiting'},'zh-CN'),/等待调用数据/);
  const missing={...payload,context:{used:10,limit:null,source:'unknown'}};
  assert.match(messages.formatTooltip(missing,'en'),/limit unknown/);
});
test('language option is explicit and rejects unsupported values',()=>{
  assert.equal(parseOptions(['start','--language','en']).language,'en');
  assert.equal(parseOptions(['start','--language','zh-CN']).language,'zh-CN');
  assert.throws(()=>parseOptions(['--language','wrong']));
});

// Regression for the user's screenshot: 99 in the strip vs 65.9 in the tooltip.
const screenshot=summarize([{input:19998,cached:221788,output:1971,thinking:1228,response:743,
  waitSeconds:9.937811375,streamSeconds:19.99275825,contextLimit:512000}]);
test('the tooltip repeats the strip speed with the same precision and explains both denominators',()=>{
  assert.equal(typeof messages.formatRate,'function');
  const speed=messages.formatRate(screenshot.latest.speed);
  assert.equal(speed,'98.6');
  const zh=messages.formatTooltip(screenshot,'zh-CN'),en=messages.formatTooltip(screenshot,'en');
  assert.ok(zh.includes(`底部速度：${speed} tok/s`));
  assert.match(zh,/流式输出（不含等待）/);
  assert.match(zh,/端到端速度：65.9 tok\/s（含等待）/);
  assert.match(zh,/等待 9.9s \+ 输出 20.0s = 总计 29.9s/);
  assert.ok(en.includes(`Status bar speed: ${speed} tok/s`));
  assert.match(en,/streaming output \(excludes waiting\)/);
  assert.match(en,/End-to-end speed: 65.9 tok\/s \(includes waiting\)/);
});
test('buffered delivery and missing timings do not imply measured streaming speed',()=>{
  const buffered=summarize([{input:10,cached:0,output:200,thinking:0,response:200,waitSeconds:10,streamSeconds:0.01}]);
  const text=messages.formatTooltip(buffered,'zh-CN');
  assert.match(text,/底部速度：20.0 tok\/s/);assert.match(text,/端到端（含等待，可能为缓冲返回）/);
  assert.doesNotMatch(text,/流式输出（不含等待）/);
  assert.equal(messages.formatRate(null),'—');assert.equal(messages.formatRate(NaN),'—');
});
