'use strict';
import {mountWidget} from '../ui/widget.js';
const language=new URLSearchParams(location.search).get('language')==='en'?'en':'zh-CN';
const DEMO_ID='12345678-1234-1234-1234-123456789abc';
const OTHER_ID='87654321-1234-1234-1234-123456789abc';
const demoPath=location.pathname;
const sample={conversationId:DEMO_ID,hasData:true,status:'ready',skippedRows:0,
  latest:{speed:50,mode:'stream',waitSeconds:1.25,streamSeconds:4,totalSeconds:5.25,output:200,endToEndSpeed:200/5.25,thinking:50,response:150},
  context:{used:4000,limit:200000,percent:2,source:'metadata'},
  total:{calls:3,input:3000,cached:9000,output:600,cachePercent:75}};
history.replaceState({},'',`?cascadeId=${DEMO_ID}`);
const card=document.getElementById('antigravity.agentSidePanelInputBox');
const result=document.getElementById('results');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const inject=async()=>mountWidget(language);
document.getElementById('sample').onclick=async()=>{if(!window.__agyMetrics)await inject();history.replaceState({},'',`?cascadeId=${DEMO_ID}`);window.__agyMetrics.update(sample);};
document.getElementById('next').onclick=()=>history.replaceState({},'',`?cascadeId=${OTHER_ID}`);
document.getElementById('narrow').onclick=()=>{card.style.width=card.style.width?'':'300px';};
document.getElementById('dark').onclick=()=>document.body.classList.toggle('dark');
document.getElementById('dispose').onclick=()=>window.__agyMetrics?.dispose();
document.getElementById('tests').onclick=async()=>{
  result.textContent='';let passed=0;
  const check=(condition,name)=>{if(!condition)throw new Error(name);passed++;result.textContent+=`PASS ${name}\n`;};
  try{
    if(!window.__agyMetrics)await inject();
    card.style.width='';history.replaceState({},'',`?cascadeId=${DEMO_ID}`);window.__agyMetrics.update(sample);await wait(100);
    const host=document.getElementById('agy-metrics-widget'),root=host.shadowRoot,button=root.querySelector('button');
    check(button.textContent.includes('50.0 tok/s'),'token 速度显示');
    check(button.textContent.includes('TTFT 1.3s'),'首字时间显示');
    check(document.querySelector('[contenteditable]').textContent==='Ask Antigravity…','输入内容保持原样');
    await inject();check(document.querySelectorAll('#agy-metrics-widget').length===1,'重复加载不产生重复组件');
    button.focus();check(!root.querySelector('[role=tooltip]').hidden,'键盘聚焦显示详情');
    check(root.querySelector('[role=tooltip]').textContent.includes('75.0%'),'缓存命中率显示');
    button.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));check(root.querySelector('[role=tooltip]').hidden,'Escape 关闭详情');
    card.style.width='300px';await wait(150);check(host.dataset.layout==='stacked','窄窗口自动换行');
    check(host.getBoundingClientRect().right<=card.getBoundingClientRect().right,'窄窗口不溢出');
    history.replaceState({},'',`?cascadeId=${OTHER_ID}`);await wait(850);
    check(!button.textContent.includes('50.0 tok/s'),'切换会话清除旧指标');
    check(window.__agyMetrics.update(sample)===false,'拒绝旧会话延迟数据');
    history.replaceState({},'',demoPath);await wait(850);check(host.style.display==='none','新建会话隐藏旧指标');
    window.__agyMetrics.dispose();check(!document.getElementById('agy-metrics-widget'),'停止后移除组件');
    result.textContent+=`\n全部通过：${passed} 项`;
    history.replaceState({},'',demoPath+'?cascadeId='+DEMO_ID);card.style.width='';await inject();window.__agyMetrics.update(sample);
  }catch(error){result.textContent+=`FAIL ${error.message}`;}
};
mountWidget(language);
window.__agyMetrics?.update(sample);
