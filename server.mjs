import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
http.createServer(async (req,res)=>{
 try {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(`${root}/`) && file!==root) {res.writeHead(403);res.end();return;}
  if ((await stat(file)).isDirectory()) file=path.join(file,'index.html');
  const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
 } catch {res.writeHead(404);res.end('Not found');}
}).listen(4317,'0.0.0.0',()=>console.log('Local: http://localhost:4317'));
