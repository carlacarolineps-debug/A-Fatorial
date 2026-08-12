/* A mesa da mentoria: quem entra, o que aparece e o que cada botao faz. */
const {chromium}=require('playwright'); const fs=require('fs');
const U='http://127.0.0.1:8737/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const erros=[]; let falhas=0;
const ok=(t,c,x)=>{ console.log((c?'  ok  ':'  FALHOU ')+t+(x?'  '+x:'')); if(!c) falhas++; };
const ESTADO = {name:'Carla',xp:2400,level:5,createdAt:Date.now()-30*864e5,
  af:{metodo:true,welcomed:true}, termo:{versao:'1.0',em:Date.now()},
  diagnostic:{answers:{}}, bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'x',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'x',bnaipe:'direcao'}], unlocks:{jornada_ok:Date.now()}};

async function entrar(b, mentora){
  const pg=await b.newPage({viewport:{width:412,height:900}});
  pg.on('pageerror',e=>erros.push('PAGEERROR: '+e.message));
  pg.on('console',m=>{ if(m.type()==='error') erros.push('CONSOLE: '+m.text().slice(0,140)); });
  await pg.addInitScript(MOCK);
  await pg.addInitScript(`window.__SB.mentora=${!!mentora};
    window.__SB.acesso={status:'active',user_id:'u-carla',email:'gestaogrupoa@gmail.com'};
    window.__SB.sessao={user:{id:'u-carla',email:'gestaogrupoa@gmail.com'}};
    localStorage.setItem('ob:dono','u-carla');
    localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(ESTADO))});`);
  await pg.goto(U); await pg.waitForTimeout(1500);
  await pg.evaluate(()=>{ const m=MODULES[0]; S.modules[m.id]={steps:{[m.steps[0].id]:true}}; save(); Store.set(KEY,JSON.stringify(S)); });
  await pg.waitForTimeout(900); await pg.goto(U); await pg.waitForTimeout(1800);
  await pg.evaluate(()=>closeModal());
  return pg;
}
(async()=>{
  const b=await chromium.launch();

  console.log('\n1. QUEM NAO E MENTORA nao ve a mesa');
  let pg=await entrar(b,false);
  await pg.evaluate(()=>go('menu')); await pg.waitForTimeout(500);
  ok('a mesa nao aparece no Mais', !(await pg.evaluate(()=>document.querySelector('#view-menu').innerText)).includes('A sua mesa'));
  await pg.evaluate(()=>go('admin')); await pg.waitForTimeout(600);
  const t1=await pg.evaluate(()=>document.querySelector('#view-admin').innerText);
  ok('quem digita o caminho ve a explicacao', /de quem conduz/i.test(t1));
  ok('e nao ve nenhum formulario', await pg.evaluate(()=>
    ['adAudU','adVidT','adEvT','adLibE'].every(i=>!document.getElementById(i))));
  await pg.close();

  console.log('\n2. A MENTORA entra pela tela Mais');
  pg=await entrar(b,true);
  await pg.evaluate(()=>go('menu')); await pg.waitForTimeout(500);
  ok('a mesa e o primeiro item', (await pg.evaluate(()=>document.querySelector('#view-menu .menu-row').innerText)).includes('A sua mesa'));

  console.log('\n3. O PAINEL mostra os numeros e a fila');
  await pg.evaluate(()=>go('admin')); await pg.waitForTimeout(900);
  const t3=await pg.evaluate(()=>document.querySelector('#view-admin').innerText);
  ok('numeros vieram', /14/.test(t3) && /Alunas ativas/.test(t3));
  ok('a fila mostra a denuncia', /denúncia esperando/i.test(t3), '');
  ok('e as perguntas', /pergunta.* sem resposta/i.test(t3));
  ok('o sino conta na aba', (await pg.evaluate(()=>document.querySelectorAll('.ad-badge').length))>=2);

  console.log('\n4. PUBLICAR: os tres formularios');
  await pg.evaluate(()=>adGo('publicar')); await pg.waitForTimeout(500);
  const camp=await pg.evaluate(()=>['adAudU','adVidT','adVidU','adEvT','adEvD'].map(i=>!!document.getElementById(i)));
  ok('audio, aula e encontro estao la', camp.every(Boolean), JSON.stringify(camp));
  await pg.evaluate(()=>{ document.getElementById('adAudT').value='O que fazer quando o time trava';
    document.getElementById('adAudU').value='https://exemplo.com/audio.mp3'; adAudioPublicar(); });
  await pg.waitForTimeout(600);
  const pub=await pg.evaluate(()=>JSON.stringify(window.__SB.publicados));
  ok('o audio foi publicado', /audios/.test(pub) && /audio\.mp3/.test(pub), pub.slice(0,80));
  ok('a tela confirma', /Publicado/.test(await pg.evaluate(()=>document.getElementById('adAudMsg').textContent)));

  await pg.evaluate(()=>{ document.getElementById('adVidT').value='Precificação sem achismo';
    document.getElementById('adVidU').value='https://youtu.be/x'; adVideoPublicar(); });
  await pg.waitForTimeout(500);
  ok('a aula foi publicada', /videos/.test(await pg.evaluate(()=>JSON.stringify(window.__SB.publicados))));

  await pg.evaluate(()=>{ document.getElementById('adEvT').value='Encontro da semana';
    document.getElementById('adEvD').value='2026-08-12'; adEventoPublicar(); });
  await pg.waitForTimeout(500);
  ok('o encontro foi publicado', /eventos/.test(await pg.evaluate(()=>JSON.stringify(window.__SB.publicados))));

  console.log('\n5. ALUNAS: lista, liberar e encerrar');
  await pg.evaluate(()=>adGo('alunas')); await pg.waitForTimeout(800);
  const t5=await pg.evaluate(()=>document.querySelector('#view-admin').innerText);
  ok('a lista aparece', /ana@x\.com/.test(t5) && /bia@x\.com/.test(t5));
  ok('mostra quem esta fora', /sem acesso/.test(t5));
  ok('mostra ha quanto tempo mexeu', /mexeu ontem/.test(t5), '');
  await pg.evaluate(()=>{ document.getElementById('adLibE').value='nova@exemplo.com'; adLiberar(); });
  await pg.waitForTimeout(600);
  /* liberar passa pela funcao do servidor, que e quem sorteia a senha
     temporaria e manda o e-mail. A funcao do banco fica de reserva. */
  const r5=await pg.evaluate(()=>JSON.stringify(window.__SB.invocadas));
  ok('liberar chama a funcao que manda a senha', /liberar-aluna/.test(r5) && /nova@exemplo\.com/.test(r5), r5.slice(0,90));
  ok('a conta nasce com senha temporaria', await pg.evaluate(()=>!!window.__SB.temporaria['nova@exemplo.com']));
  ok('a mesa avisa que a senha foi por e-mail', /senha tempor/i.test(await pg.evaluate(()=>document.getElementById('adLibMsg').innerText)));
  /* e quando a funcao nao esta publicada, a reserva entra e a mesa avisa */
  await pg.evaluate(()=>{ window.__SB.erroFuncao=true; document.getElementById('adLibE').value='outra@exemplo.com'; adLiberar(); });
  await pg.waitForTimeout(700);
  ok('sem a funcao, cai na do banco', /liberar_acesso/.test(await pg.evaluate(()=>JSON.stringify(window.__SB.rpcs))));
  ok('e a mesa avisa que o e-mail nao saiu', /n[aã]o foi por e-mail/i.test(await pg.evaluate(()=>document.getElementById('adLibMsg').innerText)));
  await pg.evaluate(()=>{ window.__SB.erroFuncao=false; });
  await pg.evaluate(()=>adEncerrar('ana@x.com')); await pg.waitForTimeout(300);
  ok('encerrar pede confirmacao', /Tirar o acesso/.test(await pg.evaluate(()=>document.getElementById('modalBox').innerText)));
  await pg.evaluate(()=>adEncerrarOk('ana@x.com')); await pg.waitForTimeout(500);
  ok('e so entao chama o banco', /encerrar_acesso/.test(await pg.evaluate(()=>JSON.stringify(window.__SB.rpcs))));

  console.log('\n6. PERGUNTAS e MODERACAO abrem na mesma mesa');
  for(const [t,marca] of [['perguntas','ob-caixinha-list'],['moderacao','dnLista']]){
    await pg.evaluate(x=>adGo(x), t); await pg.waitForTimeout(600);
    ok('a aba '+t+' monta', await pg.evaluate(m=>!!document.getElementById(m), marca));
  }
  ok('a moderacao mostra o compromisso de 24h', /24 horas/.test(await pg.evaluate(()=>document.querySelector('#view-admin').innerText)));

  console.log('\n6b. VENDAS: o que a TMB mandou');
  await pg.evaluate(()=>adGo('vendas')); await pg.waitForTimeout(800);
  const tv = await pg.evaluate(()=>document.getElementById('adVendasLista').innerText);
  ok('a aba Vendas existe na barra', await pg.evaluate(()=>[...document.querySelectorAll('#view-admin .gtab')].some(x=>/Vendas/.test(x.textContent))));
  ok('mostra a venda que deu certo', /acesso liberado e senha enviada/.test(tv), tv.split('\n')[0]);
  ok('mostra o e-mail de quem comprou', /nova@x\.com/.test(tv));
  ok('avisa o status que o app nao conhece', /Em Conferencia/.test(tv));
  ok('avisa quando o e-mail da senha nao saiu', /e-mail com a senha nao saiu/.test(tv));
  /* a cor e o que ela le de longe: verde deu certo, vermelho pede acao */
  const cores = await pg.evaluate(()=>[...document.querySelectorAll('#adVendasLista .linha')]
    .map(x=>getComputedStyle(x).borderLeftColor));
  ok('a primeira linha e verde e as outras vermelhas', cores.length===3 && cores[0]!==cores[1] && cores[1]===cores[2], JSON.stringify(cores));
  /* e o payload cru da compra nunca chega na tela */
  ok('nao mostra o dado cru da compra', !/payload|cpf|documento/i.test(tv));
  /* lista vazia tem que ensinar o que fazer, e nao ficar em branco */
  await pg.evaluate(()=>{ window.__SB.webhooks=[]; adVendasCarregar(); });
  await pg.waitForTimeout(600);
  const tvz = await pg.evaluate(()=>document.getElementById('adVendasLista').innerText);
  ok('lista vazia explica o que fazer', /ainda n[aã]o chamou/i.test(tvz) && /COMECE-POR-AQUI/.test(tvz), tvz.slice(0,70));

  console.log('\n6c. CONFERIR COM A TMB: ver antes, aplicar depois');
  await pg.evaluate(()=>adGo('vendas')); await pg.waitForTimeout(900);
  ok('o painel de conferencia existe', await pg.evaluate(()=>!!document.getElementById('adImpVer')));
  /* o primeiro toque NAO pode escrever nada nem mandar e-mail */
  await pg.evaluate(()=>{ window.__SB.invocadas.length=0; adImportar(false); });
  await pg.waitForTimeout(900);
  const chamou = await pg.evaluate(()=>window.__SB.invocadas.filter(x=>x.nome==='tmb-importar'));
  ok('o primeiro toque chama em modo de ver', chamou.length===1 && chamou[0].body.aplicar===false,
    JSON.stringify(chamou));
  const ti = await pg.evaluate(()=>document.getElementById('adImpLista').innerText);
  ok('mostra quem comprou e nao tem acesso', /antiga1@x\.com/.test(ti), ti.split('\n')[0]);
  ok('e diz quantos pedidos leu', /57/.test(ti));
  ok('o botao de liberar so aparece depois de ver', /Liberar as 3/.test(ti));
  /* aplicar exige um segundo toque, com confirmacao */
  await pg.evaluate(()=>adImportarOk()); await pg.waitForTimeout(500);
  ok('aplicar pede confirmacao', /Liberar 3 pessoas agora/.test(await pg.evaluate(()=>document.getElementById('modalBox').innerText)));
  await pg.evaluate(()=>{ closeModal(); adImportar(true); }); await pg.waitForTimeout(900);
  const ap = await pg.evaluate(()=>window.__SB.invocadas.filter(x=>x.nome==='tmb-importar'));
  ok('so entao ele aplica', ap.length===2 && ap[1].body.aplicar===true, JSON.stringify(ap.map(x=>x.body)));
  ok('e avisa o resultado', /3 pessoa\(s\) liberada/.test(await pg.evaluate(()=>document.getElementById('adImpMsg').innerText)));
  /* palavra desconhecida da TMB tem que aparecer, nao sumir */
  await pg.evaluate(()=>{ window.__SB.impDesconhecidos=['Em Conferencia']; adImportar(false); });
  await pg.waitForTimeout(800);
  ok('palavra desconhecida da TMB fica visivel',
    /Em Conferencia/.test(await pg.evaluate(()=>document.getElementById('adImpLista').innerText)));
  /* falta do token: mensagem que ensina, nao erro cru */
  await pg.evaluate(()=>{ window.__SB.erroImportar='falta o segredo TMB_API_TOKEN'; adImportar(false); });
  await pg.waitForTimeout(800);
  ok('sem o token, a mesa ensina o que fazer',
    /COMECE-POR-AQUI/.test(await pg.evaluate(()=>document.getElementById('adImpMsg').innerText)));
  await pg.evaluate(()=>{ window.__SB.erroImportar=null; window.__SB.impDesconhecidos=[]; });

  console.log('\n7. A mesa nao aparece para aluna nem no mapa da Home');
  await pg.close();
  pg=await entrar(b,false);
  await pg.evaluate(()=>go('home')); await pg.waitForTimeout(700);
  ok('sem mesa na Home', !(await pg.evaluate(()=>document.querySelector('#view-home').innerText)).includes('A sua mesa'));
  await pg.close();

  console.log('\nERROS DE JAVASCRIPT: '+(erros.length?('\n  '+[...new Set(erros)].join('\n  ')):'nenhum'));
  console.log('FALHAS: '+falhas);
  await b.close(); process.exit(falhas?1:0);
})();
