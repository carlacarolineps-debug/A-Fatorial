/* Ataque real na interface: texto de usuario que tenta virar codigo.
   Cada caso e uma coisa que alguem poderia gravar no banco de proposito. */
const {chromium}=require('playwright'); const fs=require('fs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const erros=[]; let falhas=0;
const ok=(t,c,x)=>{ console.log((c?'  ok  ':'  FALHOU ')+t+(x?'  '+x:'')); if(!c) falhas++; };
const E={name:'Carla',xp:2400,level:5,createdAt:Date.now()-11*864e5,
  af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},diagnostic:{answers:{}},
  bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'x',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'x',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}};

(async()=>{
  const b=await chromium.launch();
  const c=await b.newContext({viewport:{width:412,height:900}});
  await c.addInitScript(MOCK);
  await c.addInitScript(`window.__INVADIU=0;
    window.__SB.mentora=true;
    window.__SB.acesso={status:'active',user_id:'u-carla',email:'gestaogrupoa@gmail.com'};
    window.__SB.sessao={user:{id:'u-carla',email:'gestaogrupoa@gmail.com',user_metadata:{}}};
    localStorage.setItem('ob:dono','u-carla');
    localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
  const p=await c.newPage();
  p.on('pageerror',e=>erros.push('PAGEERROR: '+e.message));
  await p.goto(U); await p.waitForTimeout(2200);
  await p.evaluate(()=>closeModal()); await p.waitForTimeout(300);

  const PAYLOAD = 'x" onerror="window.__INVADIU=1" data-y="';
  const invadiu = ()=>p.evaluate(()=>window.__INVADIU);

  console.log('\n1. A RAIZ: escapeHtml fecha as aspas');
  const esc = await p.evaluate(()=>escapeHtml('a"b\'c<d>e&f'));
  ok('aspa dupla vira entidade', esc.includes('&quot;'), esc);
  ok('aspa simples vira entidade', esc.includes('&#39;'), esc);
  ok('e o resto continua escapado', esc.includes('&lt;')&&esc.includes('&gt;')&&esc.includes('&amp;'));

  console.log('\n2. urlSegura recusa o que nao e endereco');
  const casos = await p.evaluate(()=>({
    js: urlSegura('javascript:window.__INVADIU=1'),
    dados: urlSegura('data:text/html,<script>window.__INVADIU=1</script>'),
    aspas: urlSegura('x" onerror="window.__INVADIU=1'),
    http: urlSegura('https://exemplo.com/a.png'),
    vazio: urlSegura(null)
  }));
  ok('recusa javascript:', casos.js==='', JSON.stringify(casos.js));
  ok('recusa data:', casos.dados==='', JSON.stringify(casos.dados));
  ok('recusa texto com aspas', casos.aspas==='', JSON.stringify(casos.aspas));
  ok('deixa passar https', casos.http==='https://exemplo.com/a.png');
  ok('vazio vira vazio', casos.vazio==='');

  console.log('\n3. A FOTO DE PERFIL com endereco envenenado');
  await p.evaluate(x=>{ window.__SB.perfil={avatar_url:x, display_name:'Ana'}; }, PAYLOAD);
  await p.evaluate(()=>{ _pfCarregou=false; _pfRemoto=null; go('perfil'); });
  await p.waitForTimeout(1200);
  ok('nao executou nada', (await invadiu())===0);
  ok('e nao sobrou src envenenado', await p.evaluate(()=>{
    const i=document.querySelector('#view-perfil img'); return !i || !i.getAttribute('onerror'); }));

  console.log('\n4. A FOTO DENUNCIADA, que roda na sessao de quem modera');
  await p.evaluate(x=>{
    window.__modUGC = [];
    const lista=[{id:'g1', url:x, legenda:'foto', user_id:'u-outra'}];
    const den=[{id:'d1', alvo_tipo:'galeria', alvo_id:'g1', motivo:'spam', detalhe:'', status:'pendente', created_at:new Date().toISOString()}];
    window.OB.denunciasList = ()=>Promise.resolve(den);
    window.OB.galeriaList  = ()=>Promise.resolve(lista);
  }, PAYLOAD);
  await p.evaluate(()=>{ if(typeof modPainel==='function') modPainel(); });
  await p.waitForTimeout(1400);
  const mod = await p.evaluate(()=>{
    const m=document.getElementById('modalBox')||document.body; return m.innerHTML; });
  ok('o painel REALMENTE montou a denuncia', /spam|denunciad/i.test(mod), mod.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,80));
  ok('a denuncia nao executou nada', (await invadiu())===0);
  ok('e a foto nao trouxe atributo estranho', !/onerror=/i.test(mod));

  console.log('\n5. O LINK DO ENCONTRO com javascript:');
  await p.evaluate(()=>{
    const ev = [{id:'e1', titulo:'Encontro envenenado', quando:new Date(Date.now()+86400000).toISOString(),
      online:true, link:'javascript:window.__INVADIU=1', pauta:'x'}];
    S.comunidade = S.comunidade || {};
    S.comunidade.eventos = ev; save();
    /* o servidor tambem devolve o mesmo, senao a tela usa a lista vazia */
    window.OB.eventosList = ()=>Promise.resolve(ev);
    go('ano'); if(typeof anGo==='function') anGo('encontros');
  });
  await p.waitForTimeout(1400);
  const tela = await p.evaluate(()=>document.getElementById('view-ano').innerText);
  ok('o encontro REALMENTE apareceu na tela', /Encontro envenenado/.test(tela), tela.slice(0,70).replace(/\n/g,' | '));
  const hrefs = await p.evaluate(()=>[...document.querySelectorAll('#view-ano a')].map(a=>a.getAttribute('href')||''));
  ok('nenhum href com javascript:', !hrefs.some(h=>/javascript:/i.test(h)), JSON.stringify(hrefs).slice(0,140));
  ok('e o botao morto nem foi desenhado', !hrefs.some(h=>h===''), JSON.stringify(hrefs).slice(0,140));
  ok('nada executou', (await invadiu())===0);

  console.log('\n6. ENCERRAR com e-mail que tenta virar codigo');
  await p.evaluate(()=>{ window.__SB.mentora=true; go('admin'); adGo('alunas'); });
  await p.waitForTimeout(900);
  await p.evaluate(()=>adEncerrar("a'+(window.__INVADIU=1)+'@x.com"));
  await p.waitForTimeout(600);
  ok('o modal abriu sem executar', (await invadiu())===0);
  const btn = await p.evaluate(()=>{ const b=[...document.querySelectorAll('#modalBox button')].find(x=>/Encerrar/.test(x.textContent)); return b?b.getAttribute('onclick'):''; });
  ok('o botao nao carrega o e-mail', btn==='adEncerrarOk()', JSON.stringify(btn));

  console.log('\nERROS DE JAVASCRIPT: '+(erros.length?('\n  '+[...new Set(erros)].join('\n  ')):'nenhum'));
  console.log('FALHAS: '+falhas);
  await b.close(); process.exit(falhas?1:0);
})();
