const http=require('http'), fs=require('fs'), path=require('path');
const RAIZ='/home/user/A-Fatorial';
const s=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/'){ const fs2=require('fs');
    const cand=fs2.readdirSync(RAIZ).filter(f=>/^Opera.+ \d{4}\.\d{2}\.html$/.test(f))
      .map(f=>({f, t:fs2.statSync(require('path').join(RAIZ,f)).mtimeMs}))
      .sort((a,b)=>a.t-b.t).map(x=>x.f);
    p='/'+cand[cand.length-1]; }
  /* manifest, icones e service worker moram em loja/ */
  if(/^\/(manifest\.json|sw\.js|icones\/)/.test(p)) p='/loja'+p;
  const f=path.join(RAIZ,p);
  fs.readFile(f,(e,d)=>{
    if(e){ res.writeHead(404); res.end('nao achei'); return; }
    res.writeHead(200,{'content-type': f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'image/png'});
    res.end(d);
  });
});
s.listen(8733,'127.0.0.1',()=>console.log('servindo em http://127.0.0.1:8732/'));
