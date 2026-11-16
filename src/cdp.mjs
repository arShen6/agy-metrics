const loopback = hostname => ['127.0.0.1','localhost','[::1]'].includes(hostname);
export function isLocalSocket(address, port) {
  try { const u=new URL(address); return u.protocol==='ws:'&&loopback(u.hostname)&&Number(u.port)===port&&!u.username&&!u.password; }
  catch { return false; }
}
export function isAppTarget(target) {
  if (target?.type!=='page') return false;
  try { const u=new URL(target.url); return (['http:','https:'].includes(u.protocol)&&loopback(u.hostname))||u.protocol==='vscode-file:'; }
  catch { return false; }
}
export async function discover(port) {
  const response=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(1200),redirect:'error'});
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}`);
  const data=await response.json();
  if (!Array.isArray(data)) throw new Error('Invalid CDP discovery response');
  return data.filter(t=>isAppTarget(t)&&isLocalSocket(t.webSocketDebuggerUrl,port));
}
export class CdpClient {
  constructor(socket) {
    this.socket=socket; this.pending=new Map(); this.nextId=0; this.scriptId=null;
    socket.addEventListener('message',event=>{
      let message; try { message=JSON.parse(event.data); } catch { return; }
      const entry=this.pending.get(message.id); if (!entry) return;
      this.pending.delete(message.id); clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
    });
    socket.addEventListener('close',()=>{
      for(const entry of this.pending.values()) {clearTimeout(entry.timer);entry.reject(new Error('CDP connection closed'));}
      this.pending.clear();
    });
  }
  static async connect(address,port) {
    if (!isLocalSocket(address,port)) throw new Error('CDP endpoint must be localhost on the discovered port');
    const socket=new WebSocket(address); const client=new CdpClient(socket);
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{socket.close();reject(new Error('CDP connection timeout'));},2000);
      socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
      socket.addEventListener('error',()=>{clearTimeout(timer);socket.close();reject(new Error('CDP connection failed'));},{once:true});
    });
    return client;
  }
  get open() {return this.socket.readyState===WebSocket.OPEN;}
  send(method,params={}) {
    if (!this.open) return Promise.reject(new Error('CDP is disconnected'));
    const id=++this.nextId;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},2500);
      this.pending.set(id,{resolve,reject,timer});
      try {this.socket.send(JSON.stringify({id,method,params}));}
      catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}
    });
  }
  async evaluate(expression) {
    const result=await this.send('Runtime.evaluate',{expression,returnByValue:true});
    if (result.exceptionDetails) throw new Error('Renderer evaluation failed');
    return result.result?.value;
  }
  async install(source) {
    // Verify the application-owned composer before writing to a renderer.
    const valid=await this.evaluate('!!document.getElementById("antigravity.agentSidePanelInputBox")');
    if (!valid) return false;
    await this.send('Page.enable');
    const script=await this.send('Page.addScriptToEvaluateOnNewDocument',{source});
    this.scriptId=script.identifier;
    await this.evaluate(source);
    return true;
  }
  async dispose() {
    if(this.open){
      await this.evaluate('window.__agyMetrics?.dispose()').catch(()=>{});
      if(this.scriptId) await this.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:this.scriptId}).catch(()=>{});
    }
    this.socket.close();
  }
}
