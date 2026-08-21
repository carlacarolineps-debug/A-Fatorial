/* A AUDITORIA DO TEMA.

   Roda as 16 telas nos dois temas e procura duas famílias de defeito:

   1. TEXTO QUE NÃO SE LÊ. Mede o contraste contra o fundo composto de
      verdade, subindo a pilha de ancestrais até achar cor opaca, e quando
      o fundo é gradiente lê as paradas uma a uma e vale a pior. A conta
      ingênua (background-color do próprio elemento) reprova botão de ouro
      e aprova texto invisível: ela erra dos dois lados.

   2. SUPERFÍCIE QUE FICOU DO TEMA ERRADO. No claro, um bloco mais ESCURO
      que o papel quase sempre é um literal de tema escuro que sobreviveu
      à parametrização. É esse teste que acha a faixa cinza que ninguém
      escreveu de propósito.

   Uso: node tema.cjs claro   |   node tema.cjs escuro   |   node tema.cjs ambos
*/
const {chromium}=require('playwright'); const fs=require('fs');
const {lePNG, corDominante, razao}=require(__dirname+'/pixel.cjs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const VIEWS=['home','programa','bussola','trilhas','plano','diario','apostila','ano',
             'ferramentas','gestao','pesquisas','conquistas','comunidade','mentora','perfil','menu'];
const E={name:'Carla Caroline',xp:2400,level:5,createdAt:Date.now()-40*864e5,
  modules:{recrutamento:{completed:true,steps:{0:true}},posicionamento:{completed:true,steps:{0:true}}},
  af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},
  diagnostic:{answers:{'Estratégia escrita':2,'Processos documentados':3}},
  bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'Faturamento',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'Ação',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}};

const SONDA = () => {
  function nums(c){ return (String(c).match(/[\d.]+/g)||[]).map(Number); }
  function lumRGB(m){
    const f=x=>{x/=255;return x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4);};
    return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]);
  }
  function raz(a,b){ return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05); }
  /* todas as luminâncias possíveis atrás deste elemento */
  function fundos(el){
    let n=el;
    while(n && n!==document.documentElement){
      const cs=getComputedStyle(n), bi=cs.backgroundImage;
      /* So gradiente LINEAR conta como fundo do texto. Radial e conico
         quase sempre desenham anel, medalhao ou aurora: o texto senta no
         meio, onde o que aparece e a camada de baixo, e ler as paradas
         deles reprovava numero de anel que na tela esta perfeito. */
      if(bi && bi!=='none' && /(^|[\s,])(linear-gradient|repeating-linear-gradient)\(/.test(bi)){
        const paradas=(bi.match(/rgba?\([^)]+\)/g)||[])
          .map(nums).filter(m=>m.length<4 || m[3]>0.85);
        if(paradas.length) return paradas.map(lumRGB);
      }
      const m=nums(cs.backgroundColor);
      if(m.length && (m.length<4 || m[3]>0.85)) return [lumRGB(m)];
      n=n.parentElement;
    }
    return [lumRGB(nums(getComputedStyle(document.body).backgroundColor))];
  }
  function nome(el){
    const c=String(el.getAttribute('class')||'').trim().split(/\s+/).slice(0,3).join('.');
    return (el.tagName.toLowerCase()+(c?'.'+c:''));
  }
  /* as telas anteriores continuam no DOM, so escondidas: sem limpar a
     marca, a conferencia no pixel acha o elemento da tela errada, mede uma
     caixa de tamanho zero e desiste calada, deixando passar exatamente o
     que ela existe para conferir */
  document.querySelectorAll('[data-sonda]').forEach(e=>e.removeAttribute('data-sonda'));
  const view=document.querySelector('.view.active')||document.body;
  const fundoPagina=lumRGB(nums(getComputedStyle(document.body).backgroundColor));
  const texto=[], superficie=[];
  const vistos=new Set();
  view.querySelectorAll('*').forEach(el=>{
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return;
    const r=el.getBoundingClientRect(); if(!r.width||!r.height) return;

    /* 1. texto */
    const temTexto=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    if(temTexto){
      const cor=nums(cs.color);
      if(cor.length && (cor.length<4 || cor[3]>0.6)){
        const L=lumRGB(cor), px=parseFloat(cs.fontSize);
        const alvo=(px>=24 || (px>=18.66 && +cs.fontWeight>=700)) ? 3 : 4.5;
        const pior=Math.min(...fundos(el).map(f=>raz(L,f)));
        if(pior<alvo){
          const k=nome(el)+'|'+px;
          if(!vistos.has(k)){ vistos.add(k);
            el.setAttribute('data-sonda', String(texto.length));
            texto.push({el:nome(el), sel:'[data-sonda="'+texto.length+'"]',
                        px:+px.toFixed(1), r:+pior.toFixed(2), precisa:alvo,
                        txt:(el.textContent||'').trim().slice(0,34)}); }
        }
      }
    }
    /* 2. superfície do tema errado: no claro, bloco visivelmente mais
       escuro que o papel; no escuro, bloco visivelmente mais claro */
    const bg=nums(cs.backgroundColor);
    if(bg.length===4 && bg[3]>0.5 && r.width>60 && r.height>18){
      const L=lumRGB(bg);
      const claro=document.documentElement.getAttribute('data-tema')==='claro';
      const errado = claro ? (L < fundoPagina*0.55) : (L > fundoPagina*9 + 0.05);
      if(errado){
        const k='S'+nome(el);
        if(!vistos.has(k)){ vistos.add(k);
          superficie.push({el:nome(el), cor:cs.backgroundColor,
                           txt:(el.textContent||'').trim().slice(0,34)}); }
      }
    }
  });
  return {texto, superficie};
};

/* Fotografa a regiao do elemento com os glifos apagados e devolve o
   contraste contra a cor que realmente foi pintada atras dele. */
async function noPixel(p, sel){
  if(!sel) return null;
  try{
    const cx=await p.evaluate(s=>{
      const e=document.querySelector('.view.active '+s); if(!e) return null;
      e.scrollIntoView({block:'center'});
      const r=e.getBoundingClientRect();
      if(r.width<3||r.height<3) return null;
      const cs=getComputedStyle(e);
      let cor;
      if(/^color\(/.test(cs.color)){
        cor=(cs.color.match(/[\d.]+/g)||[]).slice(0,3).map(x=>Math.round(+x*255));
      } else cor=(cs.color.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
      e.dataset.__c=e.style.color;
      e.style.setProperty('color','transparent','important');
      return {cor, x:Math.max(0,Math.round(r.x)), y:Math.max(0,Math.round(r.y)),
              w:Math.round(r.width), h:Math.round(r.height)};
    }, sel);
    if(!cx) return null;
    await p.waitForTimeout(90);
    const buf=await p.screenshot({clip:{x:cx.x,y:cx.y,width:cx.w,height:cx.h}});
    await p.evaluate(s=>{const e=document.querySelector('.view.active '+s); if(e) e.style.color=e.dataset.__c||'';}, sel);
    const fundo=corDominante(lePNG(buf));
    return {r:razao(cx.cor, fundo), fundo, cor:cx.cor};
  }catch(e){ return null; }
}

(async()=>{
  const alvo=(process.argv[2]||'ambos');
  const temas = alvo==='ambos' ? ['claro','escuro'] : [alvo];
  const b=await chromium.launch();
  let total=0;
  for(const tema of temas){
    const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await c.addInitScript(MOCK);
    await c.addInitScript(`window.__SB.acesso={status:'active',user_id:'u',email:'a@x.com'};
      window.__SB.sessao={user:{id:'u',email:'carla@afatorial.com',user_metadata:{}}};
      localStorage.setItem('ob:dono','u');
      localStorage.setItem('ob:tema', ${JSON.stringify(tema)});
      localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
    const p=await c.newPage();
    const erros=[]; p.on('pageerror',e=>erros.push(String(e)));
    await p.goto(U); await p.waitForTimeout(2500);
    await p.evaluate(()=>{try{closeModal()}catch(e){}}); await p.waitForTimeout(400);
    const aplicado=await p.evaluate(()=>document.documentElement.getAttribute('data-tema'));
    console.log('\n############ TEMA '+tema.toUpperCase()+'  (aplicado: '+aplicado+') ############');
    if(aplicado!==tema){ console.log('  FALHA: o tema pedido nao foi aplicado'); total++; }
    const txtAcc=new Map(), supAcc=new Map();
    for(const v of VIEWS){
      await p.evaluate(x=>go(x), v); await p.waitForTimeout(620);
      const r=await p.evaluate(SONDA);
      /* A CONFERENCIA NO PIXEL.
         A sonda le CSS, e CSS mente sobre fundo com gradiente: ela reprova
         botao de ouro (background-color transparente) e reprova numero
         dentro de anel (le a parada mais escura do degrade). Entao toda
         reprovacao passa por uma segunda leitura, dessa vez fotografando a
         regiao com os glifos apagados e medindo a cor que de fato foi
         pintada. So sobrevive o que falha nas duas. */
      for(const x of r.texto){
        const real=await noPixel(p, x.sel);
        if(real && real.r>=x.precisa) continue;      // era mentira do CSS
        if(real) x.r=+real.r.toFixed(2);
        const k=x.el+' '+x.px+'px';
        if(!txtAcc.has(k)||txtAcc.get(k).r>x.r) txtAcc.set(k,{...x,view:v});
      }
      r.superficie.forEach(x=>{ if(!supAcc.has(x.el)) supAcc.set(x.el,{...x,view:v}); });
    }
    console.log('\n== TEXTO abaixo do contraste  ('+txtAcc.size+' padroes)');
    [...txtAcc.values()].sort((a,b)=>a.r-b.r).slice(0,30).forEach(x=>
      console.log(`   ${String(x.r).padStart(5)}:1 precisa ${x.precisa}  ${x.px}px  ${x.el}  [${x.view}]  "${x.txt}"`));
    if(!txtAcc.size) console.log('   nenhum');
    console.log('\n== SUPERFICIE do tema errado  ('+supAcc.size+')');
    [...supAcc.values()].slice(0,20).forEach(x=>
      console.log(`   ${x.el}  ${x.cor}  [${x.view}]  "${x.txt}"`));
    if(!supAcc.size) console.log('   nenhuma');
    console.log('\n== ERROS DE JAVASCRIPT: '+(erros.length?erros.join(' | '):'nenhum'));
    total += txtAcc.size + supAcc.size + erros.length;
    await c.close();
  }
  console.log('\n>>> total de problemas: '+total);
  await b.close();
  process.exit(total?1:0);
})();
