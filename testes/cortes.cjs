/* O que fica cortado no celular. Roda em larguras reais de iPhone e
   Android e aponta o elemento exato, com o texto que some. */
const {chromium}=require('playwright'); const fs=require('fs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const VIEWS=['home','programa','bussola','trilhas','plano','diario','apostila','ano',
             'ferramentas','gestao','pesquisas','conquistas','comunidade','mentora','perfil','menu'];
const E={name:'Carla Caroline',xp:2400,level:5,createdAt:Date.now()-40*864e5,
  modules:{recrutamento:{completed:true,steps:{0:true}}},
  af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},diagnostic:{answers:{}},
  bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'Faturamento',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'Ação',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}};

(async()=>{
  const b=await chromium.launch();
  const larguras=[Number(process.argv[2]||390)];
  for(const W of larguras){
    const c=await b.newContext({viewport:{width:W,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await c.addInitScript(MOCK);
    await c.addInitScript(`window.__SB.acesso={status:'active',user_id:'u',email:'a@x.com'};
      window.__SB.sessao={user:{id:'u',email:'carla@afatorial.com',user_metadata:{}}};
      localStorage.setItem('ob:dono','u');
      localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
    const p=await c.newPage();
    await p.goto(U); await p.waitForTimeout(2400);
    await p.evaluate(()=>closeModal()); await p.waitForTimeout(400);
    console.log('\n===== '+W+'px =====');
    for(const v of VIEWS){
      await p.evaluate(x=>go(x), v); await p.waitForTimeout(650);
      const r=await p.evaluate((larg)=>{
        const view=document.querySelector('.view.active'); if(!view) return null;
        const out={estoura:document.documentElement.scrollWidth>larg+1, itens:[]};
        const vistos=new Set();
        view.querySelectorAll('*').forEach(el=>{
          const cs=getComputedStyle(el);
          if(cs.display==='none'||cs.visibility==='hidden') return;
          const r=el.getBoundingClientRect();
          if(!r.width||!r.height) return;
          /* texto cortado por overflow escondido, numa caixa que nao rola */
          const rolavel = /auto|scroll/.test(cs.overflowX);
          const cortado = el.scrollWidth > el.clientWidth+1 && !rolavel && cs.overflow!=='visible';
          /* passar da tela dentro de uma faixa que rola na horizontal nao e
             defeito: e o proprio desenho das abas, que deslizam de proposito.
             Sem esta checagem o relatorio enche de aba e esconde o que
             realmente estoura a pagina */
          let emRolagem = false;
          for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            if (/auto|scroll/.test(getComputedStyle(a).overflowX)) { emRolagem = true; break; }
          }
          const passou  = !emRolagem && (r.right > larg+1 || r.left < -1);
          if(!cortado && !passou) return;
          const t=(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,42);
          const chave=el.className+'|'+t;
          if(vistos.has(chave)) return; vistos.add(chave);
          if(el.querySelector('*') && cortado && !passou) return;   // so o mais interno
          out.itens.push({q: cortado?'texto cortado':'passa da tela',
            cls:String(el.className||el.tagName).slice(0,40), t});
        });
        return out;
      }, W);
      if(!r){ console.log('  '+v+': nao montou'); continue; }
      const n=r.itens.length;
      if(r.estoura || n) console.log('  '+(v+'          ').slice(0,12)+ (r.estoura?' ESTOURA':'') + (n?(' '+n+' problema(s)'):''));
      r.itens.slice(0,6).forEach(i=>console.log('      ['+i.q+'] '+i.cls+' :: '+i.t));
    }
    await c.close();
  }
  await b.close();
})();
