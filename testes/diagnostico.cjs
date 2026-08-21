/* O diagnóstico novo, visto e medido.
   Abre as telas de verdade (abertura, pergunta, eco, pausa, resultado),
   tira retrato de cada uma e confere o que o desenho promete:
   escala de evidência, sem avanço automático, eco em palavras, pausa
   quando a resposta entra no automático, e resultado em barras
   ordenadas com o mais fraco em coral. */
const {chromium}=require('playwright'); const fs=require('fs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const OUT=__dirname+'/z_diag';

const E={name:'Carla Caroline',xp:2400,level:5,createdAt:Date.now()-40*864e5,
  modules:{recrutamento:{completed:true,steps:{0:true}}},
  af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},
  bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'Faturamento',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'Ação',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}};

let ok=0, mau=0;
function T(nome, cond, detalhe){
  if(cond){ ok++; console.log('  ok   '+nome); }
  else { mau++; console.log('  FALHA '+nome+(detalhe?('  -> '+detalhe):'')); }
}

(async()=>{
  const b=await chromium.launch();
  const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await c.addInitScript(MOCK);
  await c.addInitScript(`window.__SB.acesso={status:'active',user_id:'u',email:'a@x.com'};
    window.__SB.sessao={user:{id:'u',email:'carla@afatorial.com',user_metadata:{}}};
    localStorage.setItem('ob:dono','u');
    localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
  const p=await c.newPage();
  const erros=[];
  p.on('pageerror', e=>erros.push(String(e)));
  await p.goto(U); await p.waitForTimeout(2400);
  await p.evaluate(()=>{ try{closeModal();}catch(e){} }); await p.waitForTimeout(400);

  console.log('\n== A ABERTURA ==');
  await p.evaluate(()=>openDiagnostic(false)); await p.waitForTimeout(700);
  await p.screenshot({path:OUT+'-1-abertura.png'});
  T('a abertura aparece', await p.locator('.qz2-abre').count()>0);
  const fatos=await p.locator('.qz2-fatos div').allInnerTexts();
  T('a abertura diz quantas frases e quanto tempo', fatos.length>=2, fatos.join(' | '));

  console.log('\n== A PERGUNTA E A ESCALA ==');
  /* qzComecar cai na capa do primeiro capítulo: segue até a pergunta */
  const naPergunta=async()=>{
    for(let i=0;i<6;i++){
      const t=await p.evaluate(()=>QZ && QZ.telas[QZ.pos] && QZ.telas[QZ.pos].t);
      if(t==='q') return true;
      await p.evaluate(()=>qzProxima()); await p.waitForTimeout(250);
    }
    return false;
  };
  await p.evaluate(()=>qzComecar()); await p.waitForTimeout(500);
  await naPergunta(); await p.waitForTimeout(400);
  await p.screenshot({path:OUT+'-2-pergunta.png'});
  const ops=await p.locator('.qz2-op span').allInnerTexts();
  T('cinco opções na tela', ops.length===5, ops.length+'');
  T('a escala é de evidência, não de concordância',
     ops.join(' ').includes('Faço sempre') && !ops.join(' ').includes('Concordo'),
     ops.join(' | '));

  console.log('\n== O ECO, E O FIM DO AVANÇO AUTOMÁTICO ==');
  const antes=await p.locator('.qz2-q').innerText();
  await p.locator('.qz2-op').nth(2).click(); await p.waitForTimeout(700);
  await p.screenshot({path:OUT+'-3-eco.png'});
  const depois=await p.locator('.qz2-q').innerText();
  T('a tela NÃO pula sozinha depois de responder', antes===depois);
  T('o eco aparece', await p.locator('.qz2-eco').count()>0);
  const eco=(await p.locator('.qz2-eco b').innerText()).trim();
  T('o eco traz a resposta escrita por extenso', eco===ops[2], eco+' vs '+ops[2]);
  T('o botão de seguir está dentro do eco', await p.locator('.qz2-eco .qz2-seguir').count()>0);

  console.log('\n== A PAUSA QUANDO O DEDO ENTRA NO AUTOMÁTICO ==');
  /* cinco iguais seguidas, batendo rápido: é o padrão que o app tem que pegar */
  for(let i=0;i<7;i++){
    await naPergunta();
    await p.evaluate(()=>{ const b=document.querySelectorAll('.qz2-op')[0]; if(b) b.click(); });
    await p.waitForTimeout(90);
    if(await p.locator('.qz2-pausa').count()) break;
    await p.evaluate(()=>{ try{qzProxima();}catch(e){} });
    await p.waitForTimeout(140);
    if(await p.locator('.qz2-pausa').count()) break;
  }
  await p.waitForTimeout(400);
  const pausou = await p.locator('.qz2-pausa').count()>0;
  if(pausou) await p.screenshot({path:OUT+'-4-pausa.png'});
  T('o app interrompe quando a resposta vira automática', pausou);
  if(pausou){
    const bt=await p.locator('.qz2-pausa-bt .btn').allInnerTexts();
    T('as duas saídas existem, sem acusação', bt.length===2, bt.join(' | '));
    await p.locator('.qz2-pausa-bt .btn').nth(1).click(); await p.waitForTimeout(400);
  }

  console.log('\n== O RESULTADO ==');
  /* responde tudo por dentro e manda, para chegar ao resultado de verdade */
  await p.evaluate(()=>{
    QZ.itens.forEach((it,k)=>{ QZ.ans[it.i] = [2,4,3,5,1,4,3,2,5,4,3,1,4,5,2,3,4,2,5][k%19]; });
    QZ.pos = QZ.telas.length-1; qzPinta();
  });
  await p.waitForTimeout(400);
  await p.evaluate(()=>qzConcluir()); await p.waitForTimeout(900);
  /* os avisos de XP cobrem o topo do resultado: somem sozinhos, e o
     retrato tem que mostrar a tela, nao a comemoracao por cima dela */
  await p.evaluate(()=>{ document.querySelectorAll('.toast-zone,.toast').forEach(e=>e.remove()); });
  await p.waitForTimeout(300);
  await p.setViewportSize({width:390,height:2600});
  await p.waitForTimeout(500);
  await p.locator('.dg2').first().screenshot({path:OUT+'-5-resultado.png'});
  await p.setViewportSize({width:390,height:844});
  await p.waitForTimeout(300);

  T('o resultado usa o desenho novo', await p.locator('.dg2').count()>0);
  T('o número herói aparece', await p.locator('.dg2-heroi').count()>0);
  T('o radar saiu do resultado (barra compara melhor que ângulo)',
     await p.locator('.dg2 svg polygon').count()===0);
  const nb=await p.locator('.dg2-b').count();
  T('cinco barras, uma por módulo', nb===5, nb+'');

  const vals=await p.$$eval('.dg2-bv', els=>els.map(e=>parseFloat(e.textContent.replace(',','.'))));
  T('ordenadas da mais fraca para a mais forte',
     vals.every((v,i)=>i===0||v>=vals[i-1]), vals.join(' < '));

  const cores=await p.$$eval('.dg2-fill', els=>els.map(e=>getComputedStyle(e).backgroundColor));
  T('a mais fraca sai da rampa e vira coral (ênfase)',
     cores[0]==='rgb(224, 138, 114)', cores[0]);
  T('as outras quatro são a mesma cor em intensidades diferentes',
     new Set(cores.slice(1)).size>=2 && cores.slice(1).every(c=>{
       const m=c.match(/\d+/g); return +m[0]>+m[1] && +m[1]>+m[2];   // ouro: R>G>B
     }), cores.slice(1).join(' | '));
  T('a mais fraca leva a etiqueta de por onde começar',
     (await p.locator('.dg2-b.foco .dg2-tag').innerText()).toLowerCase().includes('comece'));

  const temConf=await p.locator('.dg2-conf:not(.dg2-treino)').count()>0;
  T('o medidor de confiança aparece', temConf);
  T('a medição chega inteira do questionário para o resultado',
     await p.evaluate(()=>!!(S.diagnostic&&S.diagnostic.medicao&&typeof S.diagnostic.medicao.confianca==='number')));
  if(temConf){
    const conf=await p.locator('.dg2-conf:not(.dg2-treino) .dg2-conf-topo em').first().innerText();
    T('a confiança vem com número e rótulo', /%/.test(conf), conf);
    const larg=await p.$eval('.dg2-conf:not(.dg2-treino) .dg2-medidor i', e=>e.style.width);
    T('o medidor mostra a medida, não um selo fixo', /%/.test(larg), larg);
  }

  console.log('\n== CONTRASTE E ALVOS ==');
  const ruins=await p.evaluate(()=>{
    function lum(c){ const m=c.match(/\d+(\.\d+)?/g).map(Number);
      const f=x=>{x/=255;return x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4);};
      return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]); }
    function raz(a,b){ return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05); }
    /* O fundo de verdade e a pilha de ancestrais ate achar cor opaca. E
       quando o fundo e gradiente, a background-color NAO e a cor atras do
       texto: aqui as paradas do gradiente sao lidas uma a uma e vale a
       PIOR delas, que e mais severo do que amostrar um pixel. */
    function fundos(el){
      const saida=[]; let n=el;
      while(n && n!==document.documentElement){
        const cs=getComputedStyle(n);
        const bi=cs.backgroundImage;
        if(bi && bi!=='none'){
          const paradas=bi.match(/rgba?\([^)]+\)/g)||[];
          paradas.forEach(c=>{ const m=c.match(/[\d.]+/g).map(Number);
            if(m.length<4 || m[3]>0.85) saida.push(lum(c)); });
          if(saida.length) return saida;
        }
        const bg=cs.backgroundColor, m=bg.match(/[\d.]+/g);
        if(m && (m.length<4 || +m[3]>0.85)) return [lum(bg)];
        n=n.parentElement;
      }
      return [lum(getComputedStyle(document.body).backgroundColor)];
    }
    const out=[];
    document.querySelectorAll('.dg2 *').forEach(el=>{
      const temTexto=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
      if(!temTexto) return;
      const cs=getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return;
      const L=lum(cs.color), px=parseFloat(cs.fontSize);
      const alvo=(px>=24 || (px>=18.66 && +cs.fontWeight>=700)) ? 3 : 4.5;
      const pior=Math.min.apply(null, fundos(el).map(f=>raz(L,f)));
      if(pior<alvo) out.push((el.className||el.tagName)+' '+px.toFixed(1)+'px '+pior.toFixed(2)+':1 (precisa '+alvo+')');
    });
    return out;
  });
  T('nenhum texto do resultado abaixo do contraste pedido', ruins.length===0, ruins.join(' ; '));

  const pequenos=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('.dg2 button, .dg2 a').forEach(el=>{
      const r=el.getBoundingClientRect(); if(!r.width) return;
      if(r.width<44||r.height<44) out.push(el.textContent.trim().slice(0,24)+' '+Math.round(r.width)+'x'+Math.round(r.height));
    });
    return out;
  });
  T('nenhum alvo de toque abaixo de 44x44', pequenos.length===0, pequenos.join(' ; '));

  const estoura=await p.evaluate(()=>document.documentElement.scrollWidth>391);
  T('nada estoura a largura do celular', !estoura);

  T('nenhum erro de JavaScript', erros.length===0, erros.join(' | '));

  console.log('\n'+(ok+mau)+' conferências, '+ok+' ok, '+mau+' falhas');
  console.log('retratos em testes/z_diag-*.png');
  await b.close();
  process.exit(mau?1:0);
})();
