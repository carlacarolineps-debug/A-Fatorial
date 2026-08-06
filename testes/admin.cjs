/* A mesa da mentoria: quem entra, o que aparece e o que cada botao faz. */
const {chromium}=require('playwright'); const fs=require('fs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/mock-sb.js','utf8');
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
  const r5=await pg.evaluate(()=>JSON.stringify(window.__SB.rpcs));
  ok('liberar chama a funcao do banco', /liberar_acesso/.test(r5) && /nova@exemplo\.com/.test(r5));
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
