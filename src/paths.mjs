import os from 'node:os';
import path from 'node:path';
import { readFileSync } from 'node:fs';

export function parseOptions(args) {
  const options = {command:'start',interval:1500,channel:'stable'};
  const names = new Set(['port','interval','channel','data-dir','port-file','context-limit','app','language']);
  let commandSeen = false;
  for (let i=0; i<args.length; i++) {
    const arg=args[i];
    if (['start','doctor','help'].includes(arg) && !commandSeen) { options.command=arg; commandSeen=true; continue; }
    if (arg==='--help' || arg==='-h') { options.command='help'; continue; }
    if (arg==='--launch') { options.launch=true; continue; }
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const equal=arg.indexOf('=');
    const name=arg.slice(2,equal<0?undefined:equal);
    if (!names.has(name)) throw new Error(`Unknown option: --${name}`);
    const value=equal<0 ? args[++i] : arg.slice(equal+1);
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${name}`);
    const key=name.replace(/-([a-z])/g,(_,s)=>s.toUpperCase());
    if (['port','interval','context-limit'].includes(name)) {
      const number=Number(value);
      if (!Number.isSafeInteger(number) || number<=0 || (name==='port'&&number>65535) || (name==='interval'&&(number<500||number>60000)))
        throw new Error(`Invalid --${name}: ${value}`);
      options[key]=number;
    } else options[key]=value;
  }
  if (!['stable','insiders'].includes(options.channel)) throw new Error('Channel must be stable or insiders');
  if (options.language&&!['zh-CN','en'].includes(options.language)) throw new Error('Language must be zh-CN or en');
  return options;
}

export function resolvePaths({home=os.homedir(),platform=process.platform,env=process.env,channel='stable',dataDir,portFile}={}) {
  const p=platform==='win32'?path.win32:path.posix;
  const appName=channel==='insiders'?'Antigravity - Insiders':'Antigravity';
  const directory=channel==='insiders'?'antigravity-insiders':'antigravity';
  const config=platform==='darwin'?p.join(home,'Library','Application Support'):
    platform==='win32'?(env.APPDATA||p.join(home,'AppData','Roaming')):(env.XDG_CONFIG_HOME||p.join(home,'.config'));
  return {
    dataDir:dataDir||p.join(home,'.gemini',directory,'conversations'),
    portFile:portFile||p.join(config,appName,'DevToolsActivePort'),
    fallbackPort:channel==='insiders'?9223:9222,
    appName
  };
}
export function candidatePorts(paths, explicitPort) {
  if (explicitPort) return [explicitPort];
  let dynamic;
  try { dynamic=Number(readFileSync(paths.portFile,'utf8').split(/\r?\n/)[0]); } catch {}
  return [...new Set([dynamic,paths.fallbackPort].filter(n=>Number.isInteger(n)&&n>0&&n<=65535))];
}
