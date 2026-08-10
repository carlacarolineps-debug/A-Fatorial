/* Quanto tempo a pessoa espera para o app aparecer, num celular 4x mais
   lento e com rede de celular. Mede a PRIMEIRA abertura e a SEGUNDA, que
   e a que ela faz todo dia. */
const {chromium}=require('playwright'); const fs=require('fs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const E={"name": "Carla", "xp": 2400, "level": 5, "createdAt": 1, "af": {"metodo": true, "welcomed": true}, "termo": {"versao": "1.0", "em": 1}, "diagnostic": {"answers": {}}, "bussola": {"diag": {"f": 1}, "pacto": {"q": 1}, "kpis": [{"n": "x", "v": 1}], "ritual": [{"t": 1}]}, "plan": [{"id": "p1", "title": "x", "bnaipe": "direcao"}], "unlocks": {"jornada_ok": 1}};
(async()=>{
  const b=await chromium.launch();
  const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await c.addInitScript(MOCK);
  await c.addInitScript(`window.__SB.acesso={status:'active',user_id:'u',email:'a@x.com'};
    window.__SB.sessao={user:{id:'u',email:'a@x.com',user_metadata:{}}};
    localStorage.setItem('ob:dono','u');
    localStorage.setItem('ob:acesso:ok', String(Date.now()));
    localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
  const p=await c.newPage();
  const cdp=await c.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await cdp.send('Network.enable');
  /* 4G comum: 9 Mbps, 85ms de ida e volta */
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:85,
    downloadThroughput:9*1024*1024/8, uploadThroughput:3*1024*1024/8});

  const mede=async(rot)=>{
    await p.goto(U,{waitUntil:'load'});
    await p.waitForTimeout(1200);
    const m=await p.evaluate(()=>{
      const n=performance.getEntriesByType('navigation')[0]||{};
      const fp=performance.getEntriesByName('first-contentful-paint')[0];
      return {baixar:Math.round(n.responseEnd-n.requestStart),
              pintura:Math.round(fp?fp.startTime:0),
              completa:Math.round(n.loadEventEnd||n.duration),
              doSW: !!(n.deliveryType==='cache'||n.transferSize===0)};
    });
    console.log(('  '+rot+'                    ').slice(0,26)
      + 'baixar '+String(m.baixar+'ms').padStart(7)
      + ' | pintura '+String(m.pintura+'ms').padStart(7)
      + ' | completa '+String(m.completa+'ms').padStart(7));
    return m;
  };

  console.log('\nABERTURA (celular 4x mais lento, rede 4G)');
  const a=await mede('1a vez (sem cache)');
  /* espera o service worker assumir */
  await p.evaluate(()=>navigator.serviceWorker.ready.then(()=>{}));
  await p.waitForTimeout(1500);
  const c2=await mede('2a vez (com o SW)');
  const c3=await mede('3a vez');

  console.log('\n  ganho da 2a em diante: '+Math.round((1-(c3.pintura/a.pintura))*100)+'% mais rapido para pintar');

  console.log('\nTROCAR DE SECAO');
  await p.waitForTimeout(2200);
  await p.evaluate(()=>{ try{closeModal()}catch(e){} });
  await p.waitForTimeout(500);
  for(const v of ['programa','trilhas','bussola','plano','diario','menu','home']){
    const t=await p.evaluate(async(x)=>{const t0=performance.now();go(x);
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      return Math.round(performance.now()-t0);},v);
    console.log('  '+(v+'          ').slice(0,12)+String(t+'ms').padStart(7)+(t<100?'  instantaneo':t<250?'  ok':'  LENTO'));
  }
  await b.close();
})();
