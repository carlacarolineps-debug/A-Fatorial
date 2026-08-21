/* Retrato das telas nos dois temas, lado a lado. */
const {chromium}=require('playwright'); const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const E={name:'Carla Caroline',xp:2400,level:5,createdAt:Date.now()-40*864e5,
  modules:{recrutamento:{completed:true,steps:{0:true}},posicionamento:{completed:true,steps:{0:true}}},
  af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},
  diagnostic:{answers:{'Estratégia escrita':2,'Processos documentados':3}},
  bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'Faturamento',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'Ação',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}};
const VIEWS=(process.argv[3]||'home,trilhas,programa,plano,bussola,menu').split(',');
(async()=>{
  const b=await chromium.launch();
  const tema=process.argv[2]||'claro';
  const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await c.addInitScript(MOCK);
  await c.addInitScript(`window.__SB.acesso={status:'active',user_id:'u',email:'a@x.com'};
    window.__SB.sessao={user:{id:'u',email:'carla@afatorial.com',user_metadata:{}}};
    localStorage.setItem('ob:dono','u');
    localStorage.setItem('ob:tema', ${JSON.stringify(tema)});
    localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
  const p=await c.newPage();
  const erros=[]; p.on('pageerror',e=>erros.push(String(e)));
  await p.goto('http://127.0.0.1:8736/'); await p.waitForTimeout(2600);
  await p.evaluate(()=>{try{closeModal()}catch(e){}}); await p.waitForTimeout(400);
  console.log('tema aplicado:', await p.evaluate(()=>document.documentElement.getAttribute('data-tema')));
  for(const v of VIEWS){
    await p.evaluate(x=>go(x), v); await p.waitForTimeout(700);
    await p.evaluate(()=>{document.querySelectorAll('.toast-zone,.toast').forEach(e=>e.remove())});
    await p.screenshot({path:`${__dirname}/z_t-${tema}-${v}.png`});
  }
  console.log('erros JS:', erros.length?erros.join(' | '):'nenhum');
  await b.close();
})();
