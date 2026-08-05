/* Quanto o app demora, de verdade, num celular comum. O celular de teste e
   4x mais lento que este computador (e o que o Google usa como referencia
   para "aparelho mediano"). */
const {chromium}=require('playwright');
const fs=require('fs');
const MOCK=fs.readFileSync(__dirname+'/mock-sb.js','utf8');
const U='http://127.0.0.1:8733/';
const ESTADO={name:'Carla',xp:2400,level:5,createdAt:Date.now()-30*864e5,
  af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},diagnostic:{answers:{}},
  bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'x',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'x',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}};
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:412,height:900}});
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(`window.__SB.acesso={status:'active',user_id:'u-ana',email:'a@x.com'};
    window.__SB.sessao={user:{id:'u-ana',email:'a@x.com'}};
    localStorage.setItem('ob:dono','u-ana');`);
  const pg=await ctx.newPage();
  const cdp=await ctx.newCDPSession(pg);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});   // celular mediano

  // primeira abertura, do zero
  const t0=Date.now();
  await pg.goto(U,{waitUntil:'load'});
  const carga=Date.now()-t0;
  const m=await pg.evaluate(()=>{
    const n=performance.getEntriesByType('navigation')[0]||{};
    const p=performance.getEntriesByType('paint');
    return {
      html: Math.round(n.responseEnd-n.requestStart),
      parse: Math.round(n.domContentLoadedEventEnd-n.responseEnd),
      fcp: Math.round((p.find(x=>x.name==='first-contentful-paint')||{}).startTime||0),
      dom: document.querySelectorAll('*').length
    };
  });
  console.log('PRIMEIRA ABERTURA (celular 4x mais lento)');
  console.log('  baixar o arquivo:      ', m.html+'ms');
  console.log('  ler e executar:        ', m.parse+'ms');
  console.log('  primeira pintura:      ', m.fcp+'ms');
  console.log('  carga completa:        ', carga+'ms');
  console.log('  elementos na pagina:   ', m.dom);

  // com estado, medindo a navegacao
  await pg.evaluate(e=>localStorage.setItem('operacaoblindada:state:v1',JSON.stringify(e)),ESTADO);
  await pg.goto(U); await pg.waitForTimeout(1500);
  await pg.evaluate(()=>{ const x=MODULES[0]; S.modules[x.id]={steps:{[x.steps[0].id]:true}}; save(); Store.set(KEY,JSON.stringify(S)); });
  await pg.waitForTimeout(800);
  await pg.goto(U); await pg.waitForTimeout(2000);
  await pg.evaluate(()=>closeModal());

  console.log('\nTROCAR DE TELA (o que a pessoa faz o dia inteiro)');
  const telas=['home','programa','trilhas','plano','bussola','apostila','gestao','conquistas','menu'];
  const tempos={};
  for(const v of telas){
    const t=await pg.evaluate(x=>{ const a=performance.now(); go(x); return Math.round(performance.now()-a); }, v);
    await pg.waitForTimeout(260);
    tempos[v]=t;
    const marca = t>300?'  LENTO':t>150?'  ok':'  rapido';
    console.log('  '+(v+'            ').slice(0,13)+String(t).padStart(5)+'ms'+marca);
  }

  console.log('\nROLAGEM (quadros perdidos ao rolar as trilhas)');
  await pg.evaluate(()=>go('trilhas')); await pg.waitForTimeout(500);
  const rolagem=await pg.evaluate(async()=>{
    const alvo=document.scrollingElement;
    let quadros=0, ini=performance.now();
    const conta=()=>{ quadros++; if(performance.now()-ini<1000) requestAnimationFrame(conta); };
    requestAnimationFrame(conta);
    for(let i=0;i<40;i++){ alvo.scrollTop += 120; await new Promise(r=>setTimeout(r,25)); }
    await new Promise(r=>setTimeout(r,1050));
    return quadros;
  });
  console.log('  quadros em 1 segundo:  ', rolagem, rolagem>=45?'(liso)':rolagem>=30?'(aceitavel)':'(travando)');

  console.log('\nTAMANHO');
  const tam=await pg.evaluate(()=>{
    const n=performance.getEntriesByType('navigation')[0]||{};
    return {rede: Math.round((n.transferSize||0)/1024), total: Math.round((n.decodedBodySize||0)/1024)};
  });
  console.log('  pela rede:             ', tam.rede+'KB');
  console.log('  descompactado:         ', tam.total+'KB');
  await b.close();
})();
