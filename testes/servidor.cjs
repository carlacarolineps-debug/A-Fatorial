const http=require('http'), fs=require('fs'), path=require('path');
const RAIZ='/home/user/A-Fatorial';
const s=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/') p='/Operação Blindada 0508.03.html';
  /* manifest, icones e service worker moram em loja/ */
  if(/^\/(manifest\.json|sw\.js|icones\/)/.test(p)) p='/loja'+p;
  const f=path.join(RAIZ,p);
  fs.readFile(f,(e,d)=>{
    if(e){ res.writeHead(404); res.end('nao achei'); return; }
    res.writeHead(200,{'content-type': f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'image/png'});
    res.end(d);
  });
});
s.listen(8731,'127.0.0.1',()=>console.log('servindo em http://127.0.0.1:8731/'));
