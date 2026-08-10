/* A tela nao pode cair sozinha. Com a turma inteira dentro do app na
   mesma hora, o servidor devolve resposta ruim de vez em quando: isso
   nao pode virar "voce nao tem acesso" para quem pagou. */
const {chromium}=require('playwright'); const fs=require('fs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const erros=[]; let falhas=0;
const ok=(t,c,x)=>{ console.log((c?'  ok  ':'  FALHOU ')+t+(x?'  '+x:'')); if(!c) falhas++; };
const E={name:'Ana',xp:2400,level:5,createdAt:Date.now()-11*864e5,
  af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},diagnostic:{answers:{}},
  bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'x',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'x',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}};

async function nova(b){
  const c=await b.newContext({viewport:{width:412,height:900}});
  await c.addInitScript(MOCK);
  await c.addInitScript(`window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};
    window.__SB.sessao={user:{id:'u-ana',email:'ana@x.com',user_metadata:{}}};
    localStorage.setItem('ob:dono','u-ana');
    localStorage.setItem('ob:acesso:ok', String(Date.now()));
    localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
  const p=await c.newPage();
  p.on('pageerror',e=>erros.push('PAGEERROR: '+e.message));
  await p.goto(U); await p.waitForTimeout(2200);
  await p.evaluate(()=>closeModal()); await p.waitForTimeout(300);
  return p;
}
const dentro = p=>p.evaluate(()=>{const g=document.getElementById('ob-gate');return (!g||g.style.display==='none');});
const parede = async p=>{
  const g=await p.evaluate(()=>{const e=document.getElementById('ob-gate');return e&&e.style.display!=='none'?e.innerText:'';});
  return g;
};

(async()=>{
  const b=await chromium.launch();
  const p=await nova(b);
  ok('entrou', await dentro(p));

  console.log('\n1. HORARIO DE PICO: o servidor responde 429');
  await p.evaluate(()=>{ window.__SB.statusAcesso=429; OB.reconferir(); });
  await p.waitForTimeout(900);
  ok('continua dentro do app', await dentro(p), (await parede(p)).slice(0,60));
  await p.evaluate(()=>{ OB.reconferir(); }); await p.waitForTimeout(900);
  ok('e continua dentro depois de duas seguidas', await dentro(p));

  console.log('\n2. SERVIDOR FORA DO AR: 503');
  await p.evaluate(()=>{ window.__SB.statusAcesso=503; OB.reconferir(); });
  await p.waitForTimeout(900);
  ok('continua dentro', await dentro(p));

  console.log('\n3. TEMPO ESGOTADO: 408');
  await p.evaluate(()=>{ window.__SB.statusAcesso=408; OB.reconferir(); });
  await p.waitForTimeout(900);
  ok('continua dentro', await dentro(p));

  console.log('\n4. UMA NEGATIVA ISOLADA nao derruba (podia ser engano)');
  await p.evaluate(()=>{ window.__SB.statusAcesso=null; window.__SB.acesso=null; OB.reconferir(); });
  await p.waitForTimeout(900);
  ok('a primeira negativa so conta', await dentro(p), (await parede(p)).slice(0,60));

  console.log('\n5. MAS DUAS NEGATIVAS SEGUIDAS derrubam mesmo');
  await p.evaluate(()=>OB.reconferir()); await p.waitForTimeout(900);
  ok('agora sim a parede aparece', !(await dentro(p)), (await parede(p)).replace(/\n+/g,' | ').slice(0,80));

  console.log('\n6. O ACESSO VOLTA: o app volta junto');
  const p2=await nova(b);
  await p2.evaluate(()=>{ window.__SB.acesso={status:'inactive',user_id:'u-ana',email:'ana@x.com'}; OB.reconferir(); });
  await p2.waitForTimeout(700);
  await p2.evaluate(()=>OB.reconferir()); await p2.waitForTimeout(900);
  ok('caiu na parede', !(await dentro(p2)));
  await p2.evaluate(()=>{ window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'}; OB.reconferir(); });
  await p2.waitForTimeout(2500);
  ok('e voltou sozinho quando o acesso voltou', await dentro(p2), (await parede(p2)).slice(0,60));
  await p2.close();

  console.log('\n7. OS OUVINTES nao se empilham a cada volta');
  const p3=await nova(b);
  await p3.evaluate(()=>{ window.__SB.lidasAcesso=0; });
  await p3.evaluate(()=>{ OB.reconferir(); });   // liga a vigia varias vezes
  await p3.waitForTimeout(400);
  await p3.evaluate(()=>{ document.dispatchEvent(new Event('visibilitychange')); });
  await p3.waitForTimeout(900);
  const lidas=await p3.evaluate(()=>window.__SB.lidasAcesso);
  ok('uma volta para a frente pergunta poucas vezes', lidas<=3, 'perguntou '+lidas+' vez(es)');
  await p3.close();

  console.log('\nERROS DE JAVASCRIPT: '+(erros.length?('\n  '+[...new Set(erros)].join('\n  ')):'nenhum'));
  console.log('FALHAS: '+falhas);
  await b.close(); process.exit(falhas?1:0);
})();
