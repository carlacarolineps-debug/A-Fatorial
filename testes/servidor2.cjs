const http=require('http'), fs=require('fs'), path=require('path');
const RAIZ='/home/user/A-Fatorial';
const s=http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/'){ const fs2=require('fs');
    const cand=fs2.readdirSync(RAIZ).filter(f=>/^Opera.+ \d{4}\.\d{2}\.html$/.test(f))
      /* Escolher por DATA de arquivo e fragil: restaurar uma versao antiga do
       git da a ela data nova, e o teste passa a medir o arquivo errado sem
       avisar. E o nome tambem nao ordena sozinho: ele e DDMM, entao 2407
       parece maior que 2108 quando julho vem ANTES de agosto. Aqui o mes
       vem primeiro, depois o dia, depois a versao do dia. */
      .map(f=>{ const m=f.match(/(\d{2})(\d{2})\.(\d{2})/)||[0,'0','0','0'];
                return {f, v:[+m[2], +m[1], +m[3]]}; })          // mes, dia, versao
      .sort((a,b)=> (a.v[0]-b.v[0]) || (a.v[1]-b.v[1]) || (a.v[2]-b.v[2])).map(x=>x.f);
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
s.listen(8737,'127.0.0.1',()=>console.log('servindo em http://127.0.0.1:8732/'));
