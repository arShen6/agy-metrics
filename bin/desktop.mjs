#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import {readFileSync} from 'node:fs';
import { installDesktop, uninstallDesktop, desktopStatus } from '../src/desktop-install.mjs';

const metadata=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const language=process.env.TOKEN_TIPS_LANGUAGE||metadata.tokenTips?.language||'zh-CN';
const en=language==='en';
try {
  if(process.platform!=='darwin') throw new Error(en?'The one-click installer currently supports macOS.':'双击安装器目前适用于 macOS。');
  const command=process.argv[2];
  if(process.argv.length!==3) throw new Error('用法：bash start.sh install|uninstall|status');
  if(command==='install') {
    // This only registers the metrics helper. It neither launches nor restarts Desktop.
    const state=installDesktop({sourceRoot:fileURLToPath(new URL('..',import.meta.url)),language});
    console.log(en?'AGY Token Tips background service registered. You can close this Terminal window.':'AGY Token Tips 后台服务已注册，现在可以关闭这个终端窗口。');
    console.log(en?'Open an existing conversation in Antigravity Desktop to see the metrics.':'打开 Antigravity Desktop 的已有对话，在输入框底部查看指标。');
    console.log(en?'The helper starts automatically when you sign in.':'以后登录自动运行，无需再次启动脚本。');
    console.log(`${en?'Logs':'运行日志'}: ${state.root}/logs/metrics.log`);
    console.log(en?'If metrics are missing, double-click status.command.':'若没有出现指标，双击 status.command 检查连接。');
  } else if(command==='uninstall') {
    uninstallDesktop();
    console.log(en?'AGY Token Tips background service and login startup removed.':'AGY Token Tips 后台服务及登录启动已移除。');
    console.log(en?'Conversation data is unchanged; version backups and logs are retained.':'会话数据保持原样；源码备份和日志予以保留。');
  } else if(command==='status') {
    const state=desktopStatus();
    console.log(en?`Background service: ${state.running?'running':state.loaded?'registered, starting':'not running'}`:`后台服务：${state.running?'运行中':state.loaded?'已注册，正在启动':'未运行'}`);
  } else throw new Error('未知命令。请使用 install、uninstall 或 status。');
} catch(error) {
  console.error(`AGY Token Tips: ${error.message}`);process.exitCode=1;
}
