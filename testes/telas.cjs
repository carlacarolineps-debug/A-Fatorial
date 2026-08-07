const {chromium}=require('playwright');
/* acha o build mais novo sozinho: fixar a versao aqui fazia o teste
   apontar para um arquivo antigo a cada entrega */
const fs=require('fs'), RAIZ='/home/user/A-Fatorial';
const NOVO=fs.readdirSync(RAIZ).filter(f=>/^Opera.+ \d{4}\.\d{2}\.html$/.test(f))
  .map(f=>({f,t:fs.statSync(RAIZ+'/'+f).mtimeMs})).sort((a,b)=>a.t-b.t).pop().f;
const F='file://'+encodeURI(RAIZ+'/'+NOVO);
const VIEWS=['home','programa','bussola','trilhas','plano','apostila','diario','ferramentas','gestao','pesquisas','conquistas','ano','comunidade','mentora','perfil','menu'];
/* palavras que não podem existir num app que não vende o próprio app */
const PROIBIDO=[/indicar a mentoria/i,/indique/i,/desbloquei\w* indicando/i,/instagram/i,/wa\.me/i,/renovaç[ãa]o antecipada/i,/assinatura mensal/i,/assine agora/i,/renove/i,/compre agora/i,/quero comprar/i];
(async()=>{
  const b=await chromium.launch();
  const pg=await b.newPage({viewport:{width:412,height:900}});
  const errs=[];
  pg.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  pg.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLE: '+m.text().slice(0,160)); });

  await pg.goto(F); await pg.waitForTimeout(900);
  // estado adiantado: jornada fechada, para nenhuma tela cair no cadeado
  await pg.evaluate(()=>{
    localStorage.setItem('operacaoblindada:state:v1', JSON.stringify({
      name:'Carla', company:'A! Fatorial', xp:2400, level:5, createdAt:Date.now()-90*864e5,
      termo:{versao:'1.0',em:Date.now()}, af:{metodo:true,welcomed:true},
      diagnostic:{answers:{}},
      bussola:{diag:{feito:1}, pacto:{quando:Date.now()}, kpis:[{n:'Faturamento',v:10}],
               ritual:[{t:Date.now()}], metodo:1},
      plan:[{id:'p1', title:'Ação da carta', bnaipe:'direcao', due:Date.now()+7*864e5}],
      modules:{},
      unlocks:{jornada_ok:Date.now()}
    }));
  });
  await pg.goto(F); await pg.waitForTimeout(1200);
  // fecha o passo da primeira aula e o método pela porta de dentro
  await pg.evaluate(()=>{
    S.af={metodo:true,welcomed:true};
    const m=MODULES[0]; S.modules[m.id]={steps:{[m.steps[0].id]:true}, quiz:null};
    save(); if(typeof Store!=='undefined') Store.set(KEY, JSON.stringify(S));
  });
  await pg.waitForTimeout(1200);
  await pg.goto(F); await pg.waitForTimeout(1800);
  await pg.evaluate(()=>{ closeModal(); });
  console.log('jornada completa:', await pg.evaluate(()=>afCompleta()+' ('+afSeq()+'/8)'));

  let achados=[];
  for(const v of VIEWS){
    const antes=errs.length;
    await pg.evaluate(x=>go(x), v);
    await pg.waitForTimeout(500);
    const r=await pg.evaluate(x=>{
      const el=document.querySelector('#view-'+x);
      return {h:el?el.scrollHeight:0, txt:el?el.innerText:'', larg:document.documentElement.scrollWidth};
    }, v);
    const novos=errs.length-antes;
    const mal=PROIBIDO.filter(re=>re.test(r.txt)).map(re=>String(re));
    if(mal.length) achados.push(v+': '+mal.join(', '));
    console.log((v+'          ').slice(0,13), 'altura', String(r.h).padStart(6),
      '| largura', r.larg, r.larg>412?' ESTOURA':'', novos?(' ERROS:'+novos):'');
  }
  console.log('\ncomércio encontrado:', achados.length?achados:'nenhum');

  // as abas internas
  const abas=[['plano','planTab',['alvo','acoes','pdca','agenda','resultados']],
              ['apostila','apTab',['manuais','ferramentas','desafios','ciclo','ficha']],
              ['programa','pgTab',['hoje','semana','caminho','emc','provas']],
              ['gestao','gTab',['visao','kpis','rsg','ptm','pessoas','processos','padroes']]];
  for(const [view,varName,lista] of abas){
    for(const t of lista){
      const antes=errs.length;
      await pg.evaluate(([v,n,x])=>{ window[n]=x; go(v); }, [view,varName,t]);
      await pg.waitForTimeout(320);
      const novos=errs.length-antes;
      if(novos) console.log('ABA COM ERRO:', view+'/'+t);
    }
  }
  console.log('\nERROS:', errs.length?('\n  '+[...new Set(errs)].join('\n  ')):'nenhum');
  await b.close();
})();
