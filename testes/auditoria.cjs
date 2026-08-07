/* Abre o arquivo como a Carla abre: duplo clique, file://, sem banco.
   A mesa da mentoria nao existe aqui, de proposito: quem decide se ela
   aparece e a regra dentro do banco, e sem login nao ha banco. Ela e
   conferida no fim, servida com o Supabase de mentira e a conta da
   mentora, que e a unica situacao em que ela deve existir. */
const {chromium}=require('playwright');
/* acha o build mais novo sozinho: fixar a versao aqui fazia o teste
   apontar para um arquivo antigo a cada entrega */
const fs=require('fs'), RAIZ='/home/user/A-Fatorial';
const NOVO=fs.readdirSync(RAIZ).filter(f=>/^Opera.+ \d{4}\.\d{2}\.html$/.test(f))
  .map(f=>({f,t:fs.statSync(RAIZ+'/'+f).mtimeMs})).sort((a,b)=>a.t-b.t).pop().f;
const F='file://'+encodeURI(RAIZ+'/'+NOVO);
const SERVIDA='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const erros=[];
const linhas=[];
const R=(area,item,estado,nota)=>linhas.push({area,item,estado,nota:nota||''});
(async()=>{
  const b=await chromium.launch();
  const pg=await b.newPage({viewport:{width:412,height:900}});
  pg.on('pageerror',e=>erros.push('PAGEERROR: '+e.message.slice(0,120)));
  pg.on('console',m=>{ if(m.type()==='error') erros.push('CONSOLE: '+m.text().slice(0,110)); });

  await pg.goto(F); await pg.waitForTimeout(1600);
  R('Abertura','abre sem login (arquivo local)', await pg.evaluate(()=>!document.getElementById('ob-gate')||document.getElementById('ob-gate').style.display==='none')?'OK':'FALHA');
  R('Abertura','onboarding aparece na 1a vez', await pg.evaluate(()=>!!document.querySelector('#view-onboard.active'))?'OK':'FALHA');

  // estado adiantado
  await pg.evaluate(()=>localStorage.setItem('operacaoblindada:state:v1',JSON.stringify({
    name:'Carla',company:'A! Fatorial',xp:2400,level:5,createdAt:Date.now()-40*864e5,
    af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},
    diagnostic:{answers:{}},bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'Faturamento',v:1}],ritual:[{t:1}]},
    plan:[{id:'p1',title:'Ação',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}})));
  await pg.goto(F); await pg.waitForTimeout(1500);
  await pg.evaluate(()=>{ const m=MODULES[0]; S.modules[m.id]={steps:{[m.steps[0].id]:true}}; save(); Store.set(KEY,JSON.stringify(S)); });
  await pg.waitForTimeout(900); await pg.goto(F); await pg.waitForTimeout(1800);
  await pg.evaluate(()=>closeModal());

  // 1. as telas
  const telas=[['home','Início'],['programa','Meu Treino'],['trilhas','Trilhas'],['plano','Plano'],
    ['bussola','A Bússola'],['apostila','A Apostila'],['diario','Diário'],['ferramentas','Ferramentas'],
    ['gestao','Padrão de Gestão'],['pesquisas','Pesquisas'],['conquistas','Conquistas'],['ano','O Ano'],
    ['comunidade','Comunidade'],['mentora','A Mentora'],['perfil','O meu perfil'],['menu','Mais']];
  for(const [v,nome] of telas){
    const antes=erros.length;
    await pg.evaluate(x=>go(x),v); await pg.waitForTimeout(420);
    const h=await pg.evaluate(x=>{const e=document.querySelector('#view-'+x);return e?e.scrollHeight:0;},v);
    R('Telas',nome,(h>300&&erros.length===antes)?'OK':'FALHA', h+'px');
  }

  // 2. sem login a mesa NAO existe: e a regra, nao um efeito colateral
  await pg.evaluate(()=>go('admin')); await pg.waitForTimeout(700);
  const semLogin=await pg.evaluate(()=>document.querySelector('#view-admin').innerText);
  R('Mesa','nao aparece sem a conta da mentoria', /de quem conduz/i.test(semLogin)?'OK':'FALHA');
  R('Mesa','e nenhum formulario dela existe',
    await pg.evaluate(()=>['adAudU','adVidT','adEvT','adLibE'].every(i=>!document.getElementById(i)))?'OK':'FALHA');

  // 3. funcoes de conta
  for(const [fn,nome] of [['nvTrocarSenha','Trocar a senha'],['modPrivacidade','Política de privacidade'],
      ['modTermos','Termos de uso'],['modBloqueados','Pessoas bloqueadas'],['modExcluirConta','Excluir a conta'],
      ['modPainel','Painel de denúncias'],['modDenunciar','Denunciar conteúdo'],['modBloquear','Bloquear pessoa']]){
    R('Conta e moderação',nome, await pg.evaluate(f=>typeof window[f]==='function',fn)?'OK':'FALHA');
  }

  // 4. a barra e o visual
  R('Visual','barra com 7 destinos', (await pg.evaluate(()=>document.querySelectorAll('#appnav .anav').length))===7?'OK':'FALHA');
  R('Visual','pílula deslizante', await pg.evaluate(()=>!!document.querySelector('.anav-pil'))?'OK':'FALHA');
  R('Visual','fontes embutidas', await pg.evaluate(async()=>{await document.fonts.ready;return document.fonts.check('600 16px Fraunces');})?'OK':'FALHA');
  R('Visual','nenhuma tela estoura a largura', await pg.evaluate(()=>document.documentElement.scrollWidth<=412)?'OK':'FALHA');

  // 5. conteudo
  const c=await pg.evaluate(()=>({trilhas:MODULES.length, aulas:MODULES.reduce((a,m)=>a+m.steps.length,0),
    cartas:(typeof BCARDS!=='undefined'?BCARDS.length:0), ferramentas:(typeof AP_FERRS!=='undefined'?AP_FERRS.length:0)+(typeof TOOLS!=='undefined'?TOOLS.length:0),
    pesquisas:(typeof SURVEYS!=='undefined'?SURVEYS.length:0)}));
  R('Conteúdo','trilhas','OK',c.trilhas+' trilhas, '+c.aulas+' aulas');
  R('Conteúdo','cartas da Bússola','OK',c.cartas+' cartas');
  R('Conteúdo','ferramentas','OK',c.ferramentas+' ferramentas');
  R('Conteúdo','pesquisas e testes','OK',c.pesquisas+' instrumentos');

  // 6. a mesa, agora com a conta da mentoria: e a unica situacao em que
  //    ela deve existir, e e assim que a Carla usa todo dia
  const pm=await b.newPage({viewport:{width:412,height:900}});
  pm.on('pageerror',e=>erros.push('PAGEERROR(mesa): '+e.message.slice(0,120)));
  await pm.addInitScript(MOCK);
  await pm.addInitScript(`window.__SB.mentora=true;
    window.__SB.acesso={status:'active',user_id:'u-carla',email:'gestaogrupoa@gmail.com'};
    window.__SB.sessao={user:{id:'u-carla',email:'gestaogrupoa@gmail.com',user_metadata:{}}};
    localStorage.setItem('ob:dono','u-carla');
    localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify({
      name:'Carla',company:'A! Fatorial',xp:2400,level:5,createdAt:Date.now()-40*864e5,
      af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},
      diagnostic:{answers:{}},bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'Faturamento',v:1}],ritual:[{t:1}]},
      plan:[{id:'p1',title:'Ação',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}}))});`);
  await pm.goto(SERVIDA); await pm.waitForTimeout(2200);
  await pm.evaluate(()=>closeModal()); await pm.waitForTimeout(300);
  await pm.evaluate(()=>go('menu')); await pm.waitForTimeout(500);
  R('Mesa','aparece no Mais para a mentoria',
    (await pm.evaluate(()=>document.querySelector('#view-menu').innerText)).includes('A sua mesa')?'OK':'FALHA');
  await pm.evaluate(()=>go('admin')); await pm.waitForTimeout(800);
  for(const [t,nome,marca] of [['publicar','Publicar áudio, aula e encontro','adAudU'],
      ['alunas','Lista de alunas','adLibE'],['perguntas','Caixinha','ob-caixinha-list'],
      ['moderacao','Denúncias','dnLista'],['painel','Painel de números',null]]){
    const antes=erros.length;
    await pm.evaluate(x=>adGo(x),t); await pm.waitForTimeout(500);
    const bom = marca ? await pm.evaluate(m=>!!document.getElementById(m),marca)
                      : await pm.evaluate(()=>document.querySelectorAll('.ad-num').length===4);
    R('Mesa',nome,(bom&&erros.length===antes)?'OK':'FALHA');
  }
  await pm.evaluate(()=>adGo('publicar')); await pm.waitForTimeout(500);
  for(const [id,nome] of [['adAudF','Áudio: enviar arquivo'],['adAudU','Áudio: colar link'],
      ['adAudX','Áudio: transcrição'],['adVidU','Aula: link do vídeo'],
      ['adEvD','Encontro: data'],['adEvL','Encontro: link ou local']]){
    R('Publicar',nome, await pm.evaluate(x=>!!document.getElementById(x),id)?'OK':'FALHA');
  }
  // liberar manda a senha temporaria pela funcao do servidor
  await pm.evaluate(()=>adGo('alunas')); await pm.waitForTimeout(500);
  await pm.fill('#adLibE','nova@x.com'); await pm.evaluate(()=>adLiberar()); await pm.waitForTimeout(900);
  R('Publicar','Liberar chama a função que manda a senha',
    await pm.evaluate(()=>window.__SB.invocadas.some(x=>x.nome==='liberar-aluna'))?'OK':'FALHA');
  R('Publicar','e a conta nasce com senha temporária',
    await pm.evaluate(()=>!!window.__SB.temporaria['nova@x.com'])?'OK':'FALHA');

  // saida
  const grupos={};
  linhas.forEach(l=>{ (grupos[l.area]=grupos[l.area]||[]).push(l); });
  let falhas=0;
  for(const g in grupos){
    console.log('\n== '+g);
    grupos[g].forEach(l=>{ if(l.estado!=='OK') falhas++;
      console.log('   '+(l.estado==='OK'?'ok  ':'FALHA ')+l.item+(l.nota?('   ('+l.nota+')'):'')); });
  }
  console.log('\nERROS DE JAVASCRIPT: '+(erros.length?('\n  '+[...new Set(erros)].join('\n  ')):'nenhum'));
  console.log('TOTAL: '+linhas.length+' conferências, '+falhas+' falhas');
  await b.close();
})();
