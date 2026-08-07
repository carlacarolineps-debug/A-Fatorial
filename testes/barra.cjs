const {chromium}=require('playwright'); const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const E={name:'Carla',xp:2400,level:5,createdAt:Date.now()-11*864e5,
  af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},diagnostic:{answers:{}},
  bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'x',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'x',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}};
(async()=>{
  const b=await chromium.launch();
  const c=await b.newContext({viewport:{width:412,height:900},deviceScaleFactor:2});
  await c.addInitScript(MOCK);
  await c.addInitScript(`window.__SB.acesso={status:'active',user_id:'u',email:'a@x.com'};
    window.__SB.sessao={user:{id:'u',email:'a@x.com'}};
    localStorage.setItem('ob:dono','u');
    localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
  const p=await c.newPage();
  p.on('pageerror',e=>console.log('ERRO JS:',e.message.slice(0,90)));
  await p.goto('http://127.0.0.1:8736/'); await p.waitForTimeout(2200);
  await p.evaluate(()=>{ closeModal(); const bn=document.getElementById('afBanner'); if(bn) bn.style.display='none'; });
  await p.waitForTimeout(400);
  const m=async()=>p.evaluate(()=>{
    const bar=document.getElementById('appnav'), pil=bar.querySelector('.anav-pil');
    const on=bar.querySelector('.anav.active');
    if(!pil||!on) return {erro:'sem pilula ou sem ativo'};
    const bb=bar.getBoundingClientRect(), pb=pil.getBoundingClientRect(), ab=on.getBoundingClientRect();
    return {ativo:on.dataset.v,
      pilulaNoAtivo: Math.abs(pb.left-ab.left)<3 && Math.abs(pb.width-ab.width)<3,
      flutuaPx: Math.round(window.innerHeight-bb.bottom),
      raio: getComputedStyle(bar).borderRadius.split(' ')[0],
      naoEstoura: bb.width<=412 && bb.left>=0};
  });
  console.log('inicio :', JSON.stringify(await m()));
  await p.screenshot({path:'z_nav1.png'});
  for(const v of ['trilhas','plano','menu','home']){
    await p.evaluate(x=>go(x), v); await p.waitForTimeout(650);
    console.log((v+'       ').slice(0,8)+':', JSON.stringify(await m()));
  }
  await p.evaluate(()=>go('trilhas')); await p.waitForTimeout(750);
  await p.screenshot({path:'z_nav2.png'});
  await p.setViewportSize({width:340,height:800}); await p.waitForTimeout(700);
  console.log('340px   :', JSON.stringify(await p.evaluate(()=>({
    rotuloSai: getComputedStyle(document.querySelector('.anav-lb')).display==='none',
    naoEstoura: document.getElementById('appnav').getBoundingClientRect().width<=340}))));
  await b.close();
})();
