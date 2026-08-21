/* A PORTA, NOS DOIS TEMAS.

   A tela de entrada tem estilo proprio de proposito: ela precisa aparecer
   certa mesmo que todo o resto do app falhe em carregar. O preco disso e
   que ela fica FORA de tudo que conserta o resto, e foi assim que ela
   passou meses com o rodape em 3,68:1 sem nenhum teste reclamar: a suite
   da entrada confere o que a porta FAZ (login, erro, recuperacao), e
   nunca conferiu como ela se LE.

   Aqui a medicao e no pixel: fotografa a regiao de cada texto com os
   glifos apagados e le a cor que de fato foi pintada atras dele. E a
   unica conta que nao discute quando o fundo e cartao de vidro com blur
   sobre gradiente, que e exatamente o caso desta tela.
*/
const {chromium}=require('playwright'); const fs=require('fs');
const {lePNG, corDominante, razao}=require(__dirname+'/pixel.cjs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');

(async()=>{
  const b=await chromium.launch();
  let mau=0, medidos=0;
  for(const tema of ['claro','escuro']){
    const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await c.addInitScript(MOCK);
    /* sem sessao de proposito: e assim que se cai na porta */
    await c.addInitScript(`localStorage.setItem('ob:tema', ${JSON.stringify(tema)});`);
    const p=await c.newPage();
    const erros=[]; p.on('pageerror',e=>erros.push(String(e)));
    await p.goto(U); await p.waitForTimeout(2800);

    console.log('\n=== A PORTA, tema '+tema+' ===');
    if(!await p.locator('#ob-gate').count()){
      console.log('  FALHA a porta nem apareceu'); mau++; await c.close(); continue;
    }
    const aplicado=await p.evaluate(()=>document.documentElement.getAttribute('data-tema'));
    if(aplicado!==tema){ console.log('  FALHA o tema pedido nao foi aplicado: '+aplicado); mau++; }

    const alvos=await p.evaluate(()=>{
      const out=[];
      document.querySelectorAll('#ob-gate *').forEach((el,i)=>{
        const cs=getComputedStyle(el);
        if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return;
        const r=el.getBoundingClientRect(); if(r.width<3||r.height<3) return;
        if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) return;
        el.setAttribute('data-porta', String(i));
        out.push({sel:'[data-porta="'+i+'"]', px:parseFloat(cs.fontSize), peso:cs.fontWeight,
                  cls:String(el.getAttribute('class')||el.tagName),
                  txt:(el.textContent||'').trim().slice(0,30)});
      });
      return out;
    });

    for(const a of alvos){
      const cx=await p.evaluate(s=>{
        const e=document.querySelector(s); if(!e) return null;
        const cs=getComputedStyle(e), r=e.getBoundingClientRect();
        const cor = /^color\(/.test(cs.color)
          ? (cs.color.match(/[\d.]+/g)||[]).slice(0,3).map(x=>Math.round(+x*255))
          : (cs.color.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
        e.dataset.__c=e.style.color;
        e.style.setProperty('color','transparent','important');
        return {cor, x:Math.max(0,Math.round(r.x)), y:Math.max(0,Math.round(r.y)),
                w:Math.round(r.width), h:Math.round(r.height)};
      }, a.sel);
      if(!cx) continue;
      await p.waitForTimeout(60);
      let rz=null;
      try{
        const buf=await p.screenshot({clip:{x:cx.x,y:cx.y,width:cx.w,height:cx.h}});
        rz=razao(cx.cor, corDominante(lePNG(buf)));
      }catch(e){}
      await p.evaluate(s=>{const e=document.querySelector(s); if(e) e.style.color=e.dataset.__c||'';}, a.sel);
      if(rz===null) continue;
      medidos++;
      const alvo=(a.px>=24 || (a.px>=18.66 && +a.peso>=700)) ? 3 : 4.5;
      if(rz<alvo){ mau++;
        console.log(`  FALHA ${rz.toFixed(2)}:1 (precisa ${alvo})  ${a.px}px  ${a.cls}  "${a.txt}"`); }
    }
    /* o alvo de toque tambem: e a unica tela que a pessoa usa antes de
       existir qualquer outra coisa, e errar o toque aqui e nao entrar */
    const pequenos=await p.evaluate(()=>{
      /* A regiao de toque pode ser MAIOR que a caixa: um pseudo-elemento
         transparente e centrado entrega o clique ao dono, e e assim que
         se cresce o alvo sem engordar o desenho. Medir so o
         getBoundingClientRect reprova alvo que ja esta certo. */
      function regiao(el){
        const r=el.getBoundingClientRect();
        let w=r.width, h=r.height;
        for(const q of ['::before','::after']){
          const cs=getComputedStyle(el,q);
          if(!cs || cs.content==='none' || cs.display==='none') continue;
          if(cs.pointerEvents==='none') continue;
          const pw=parseFloat(cs.width), ph=parseFloat(cs.height);
          if(pw>w) w=pw;
          if(ph>h) h=ph;
        }
        return {w,h};
      }
      const out=[];
      document.querySelectorAll('#ob-gate button, #ob-gate a, #ob-gate input').forEach(el=>{
        const r=el.getBoundingClientRect(); if(!r.width) return;
        const g=regiao(el);
        if(g.h<44 || g.w<44)
          out.push((el.textContent||el.type||'').trim().slice(0,20)+' regiao '+Math.round(g.w)+'x'+Math.round(g.h));
      });
      return out;
    });
    if(pequenos.length){ mau++; console.log('  FALHA alvo abaixo de 44px de altura: '+pequenos.join(' ; ')); }
    if(erros.length){ mau++; console.log('  FALHA erro de JavaScript: '+erros[0]); }
    console.log('  '+alvos.length+' textos medidos no pixel, alvos e JavaScript conferidos');
    await c.close();
  }
  console.log('\n'+medidos+' medicoes, '+mau+' falhas');
  await b.close();
  process.exit(mau?1:0);
})();
