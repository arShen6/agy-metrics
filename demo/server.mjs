import http from 'node:http';
import { readFileSync } from 'node:fs';
const files=new Map([
 ['/demo/index.html',new URL('./index.html',import.meta.url)],
 ['/demo/demo.js',new URL('./demo.js',import.meta.url)],
 ['/ui/widget.js',new URL('../ui/widget.js',import.meta.url)]
]);
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=files.get(pathname==='/'?'/demo/index.html':pathname);
 if(!file){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',file.pathname.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
 res.setHeader('Cache-Control','no-store');res.end(readFileSync(file));
});
server.listen(19091,'127.0.0.1',()=>console.log('Demo: http://127.0.0.1:19091/demo/index.html'));
