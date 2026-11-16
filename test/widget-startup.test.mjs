import test from 'node:test';
import assert from 'node:assert/strict';
import {widgetSource} from '../src/widget-source.mjs';
import vm from 'node:vm';
test('document-start injection safely waits for a later daemon tick when the DOM has no root',()=>{
  const context={window:{},document:{documentElement:null},MutationObserver:class {
    observe(target){if(!target)throw new TypeError('observe target is not a Node');}
  }};
  for(const language of ['zh-CN','en']) assert.doesNotThrow(()=>vm.runInNewContext(widgetSource(language),context));
  assert.equal(context.window.__agyMetrics,undefined);
});
