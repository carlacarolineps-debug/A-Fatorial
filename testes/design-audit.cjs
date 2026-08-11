/* =====================================================================
   AUDITORIA DE DESIGN
   Mede a interface do jeito que ela chega no aparelho: cada raio, cada
   tamanho de letra, cada alvo de toque e cada contraste, tela por tela.
   Nao opina: conta. A opiniao vem depois, com o numero na mao.

     node design-audit.cjs           # 390px (iPhone comum)
     node design-audit.cjs 430 375   # outras larguras
   ===================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const U = 'http://127.0.0.1:8736/';
const MOCK = fs.readFileSync(__dirname + '/supabase-de-mentira.js', 'utf8');

const VIEWS = ['home','programa','bussola','trilhas','plano','diario','apostila','ano',
               'ferramentas','gestao','pesquisas','conquistas','comunidade','mentora','perfil','menu'];

/* a jornada TEM que estar completa, senao 13 das 16 telas devolvem o
   cadeado e a auditoria mede a tela de cadeado, nao o app */
const E = {name:'Carla Caroline',xp:2400,level:5,createdAt:Date.now()-40*864e5,
  af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},
  diagnostic:{answers:{},em:Date.now()},
  modules:{recrutamento:{completed:true,steps:{0:true,1:true,2:true}}},
  bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'Faturamento',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'Ação',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}};

/* o medidor roda dentro da pagina */
const MEDIR = `(() => {
  /* ---- contraste: WCAG 2.x, que e a conta que a Apple cita ---- */
  function canal(c){ c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
  function lum(rgb){ return 0.2126*canal(rgb[0]) + 0.7152*canal(rgb[1]) + 0.0722*canal(rgb[2]); }
  function parse(s){
    const m=String(s||'').match(/rgba?\\(([^)]+)\\)/); if(!m) return null;
    const p=m[1].split(',').map(x=>parseFloat(x.trim()));
    return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
  }
  function mistura(frente, fundo){
    const a=frente.a;
    return [Math.round(frente.r*a+fundo[0]*(1-a)),
            Math.round(frente.g*a+fundo[1]*(1-a)),
            Math.round(frente.b*a+fundo[2]*(1-a))];
  }
  /* o fundo efetivo: sobe na arvore ate achar cor opaca, empilhando as
     translucidas. Fundo com imagem ou gradiente e marcado, porque ai a
     conta nao vale */
  function fundoDe(el){
    let fundo=[10,8,6], pilha=[], n=el, gradiente=false;
    while(n && n!==document.documentElement){
      const cs=getComputedStyle(n);
      if(cs.backgroundImage && cs.backgroundImage!=='none') gradiente=true;
      const c=parse(cs.backgroundColor);
      if(c && c.a>0){ pilha.push(c); if(c.a>=0.999) break; }
      n=n.parentElement;
    }
    for(let i=pilha.length-1;i>=0;i--) fundo=mistura(pilha[i],fundo);
    return {rgb:fundo, gradiente};
  }
  function razao(a,b){
    const l1=lum(a), l2=lum(b);
    return ((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05));
  }

  const view=document.querySelector('.view.active');
  if(!view) return null;
  const raios={}, fontes={}, alvos=[], contrastes=[], gaps={};
  const visivel=(el,r)=>{
    const cs=getComputedStyle(el);
    return cs.display!=='none' && cs.visibility!=='hidden' && cs.opacity!=='0' && r.width>0 && r.height>0;
  };

  view.querySelectorAll('*').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(!visivel(el,r)) return;
    const cs=getComputedStyle(el);

    /* raios: so de quem tem fundo ou borda, senao conta caixa invisivel */
    const temCaixa=(parse(cs.backgroundColor)||{a:0}).a>0.02 ||
                   (cs.borderTopWidth!=='0px' && cs.borderTopStyle!=='none');
    const raio=parseFloat(cs.borderTopLeftRadius)||0;
    if(temCaixa && raio>0 && raio<400 && r.width>24 && r.height>16){
      const k=Math.round(raio)+'px';
      raios[k]=(raios[k]||0)+1;
    }

    /* espacamento vertical entre irmaos: o gap declarado */
    const g=parseFloat(cs.rowGap||cs.gap);
    if(g>0 && g<200 && (cs.display==='flex'||cs.display==='grid')){
      const k=Math.round(g)+'px'; gaps[k]=(gaps[k]||0)+1;
    }

    /* tipografia: so onde ha texto proprio */
    const proprio=[...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim().length>1);
    if(proprio){
      const fs=Math.round(parseFloat(cs.fontSize)*10)/10;
      const k=fs+'px'; fontes[k]=(fontes[k]||0)+1;

      const cor=parse(cs.color);
      const f=fundoDe(el);
      if(cor && cor.a>0.05){
        const frente=cor.a>=0.999 ? [cor.r,cor.g,cor.b] : mistura(cor,f.rgb);
        const rz=razao(frente,f.rgb);
        const peso=parseInt(cs.fontWeight)||400;
        /* "texto grande" na WCAG: 18.66px negrito, ou 24px */
        const grande = fs>=24 || (fs>=18.66 && peso>=700);
        const alvoRz = grande ? 3 : 4.5;
        if(rz < alvoRz){
          contrastes.push({txt:(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,44),
            cls:String(el.className||el.tagName).slice(0,34),
            fs, peso, razao:Math.round(rz*100)/100, precisa:alvoRz, gradiente:f.gradiente});
        }
      }
    }
  });

  /* alvos de toque: qualquer coisa que responde a toque.
     O que a Apple pede e REGIAO de toque, nao tamanho desenhado, e uma
     regiao pode ser maior que a caixa do elemento: um ::before absoluto
     e transparente entrega o clique ao dono. Medir so o
     getBoundingClientRect reprovaria alvo que ja esta certo, entao aqui
     entra tambem o que os dois pseudo-elementos ocupam.
     Um rotulo que envolve o controle tambem conta: e nele que o dedo
     acerta. */
  const cliqueis='button,a[href],[onclick],input:not([type=hidden]),select,textarea,summary,[role=button],[role=switch]';
  function regiao(el, r){
    let w=r.width, h=r.height;
    for(const q of ['::before','::after']){
      const cs=getComputedStyle(el,q);
      if(!cs || cs.content==='none' || cs.display==='none') continue;
      /* so conta pseudo que recebe toque: pointer-events:none nao conta */
      if(cs.pointerEvents==='none') continue;
      const pw=parseFloat(cs.width), ph=parseFloat(cs.height);
      if(pw>w) w=pw;
      if(ph>h) h=ph;
    }
    /* o rotulo que embrulha a caixa de marcar e o alvo de verdade */
    const lab=el.closest('label');
    if(lab && lab!==el){
      const lr=lab.getBoundingClientRect();
      if(lr.height>h) h=lr.height;
      if(lr.width>w) w=lr.width;
    }
    return {w, h};
  }
  document.querySelectorAll(cliqueis).forEach(el=>{
    const r=el.getBoundingClientRect();
    if(!visivel(el,r)) return;
    if(r.bottom<0 || r.top>document.documentElement.scrollHeight) return;
    /* dentro de outro clicavel: o alvo e o de fora */
    if(el.parentElement && el.parentElement.closest(cliqueis)) return;
    const g=regiao(el, r);
    alvos.push({w:Math.round(g.w), h:Math.round(g.h),
      dw:Math.round(r.width), dh:Math.round(r.height),
      cls:String(el.className||el.tagName).slice(0,34),
      txt:(el.textContent||el.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,30)});
  });

  return {raios, fontes, gaps, alvos, contrastes};
})()`;

(async () => {
  const larguras = (process.argv.slice(2).map(Number).filter(Boolean));
  const LARG = larguras.length ? larguras : [390];
  const b = await chromium.launch();

  for (const W of LARG) {
    const c = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await c.addInitScript(MOCK);
    await c.addInitScript(`window.__SB.acesso={status:'active',user_id:'u',email:'a@x.com'};
      window.__SB.sessao={user:{id:'u',email:'carla@afatorial.com',user_metadata:{}}};
      localStorage.setItem('ob:dono','u');
      localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
    const p = await c.newPage();
    await p.goto(U); await p.waitForTimeout(2600);
    await p.evaluate(() => { try { closeModal(); } catch (e) {} });
    await p.waitForTimeout(500);

    const raios = {}, fontes = {}, gaps = {};
    let alvosPeq = [], contrastes = [], totalAlvos = 0;

    for (const v of VIEWS) {
      await p.evaluate(x => go(x), v); await p.waitForTimeout(620);
      const r = await p.evaluate(MEDIR);
      if (!r) continue;
      for (const k in r.raios) raios[k] = (raios[k] || 0) + r.raios[k];
      for (const k in r.fontes) fontes[k] = (fontes[k] || 0) + r.fontes[k];
      for (const k in r.gaps) gaps[k] = (gaps[k] || 0) + r.gaps[k];
      totalAlvos += r.alvos.length;
      r.alvos.filter(a => a.h < 44 || a.w < 44).forEach(a => alvosPeq.push({ ...a, view: v }));
      r.contrastes.forEach(x => contrastes.push({ ...x, view: v }));
    }

    const ordena = o => Object.entries(o).sort((a, b2) => b2[1] - a[1]);
    console.log('\n############ ' + W + 'px ############');

    console.log('\n== RAIO DE BORDA (valor: quantas vezes)');
    ordena(raios).forEach(([k, n]) => console.log('   ' + k.padStart(6) + '  ' + n));
    console.log('   distintos: ' + Object.keys(raios).length);

    console.log('\n== TAMANHO DE LETRA');
    Object.entries(fontes).sort((a, b2) => parseFloat(a[0]) - parseFloat(b2[0]))
      .forEach(([k, n]) => console.log('   ' + k.padStart(7) + '  ' + n + (parseFloat(k) < 11 ? '   << abaixo de 11px' : '')));
    console.log('   distintos: ' + Object.keys(fontes).length);

    console.log('\n== GAP declarado');
    ordena(gaps).slice(0, 14).forEach(([k, n]) => console.log('   ' + k.padStart(6) + '  ' + n));
    console.log('   distintos: ' + Object.keys(gaps).length);

    console.log('\n== ALVOS DE TOQUE com regiao menor que 44x44  (' + alvosPeq.length + ' de ' + totalAlvos + ')');
    const porTipo = {};
    alvosPeq.forEach(a => {
      const k = a.cls + ' regiao ' + a.w + 'x' + a.h + ' (desenho ' + a.dw + 'x' + a.dh + ')';
      (porTipo[k] = porTipo[k] || { n: 0, ex: a }).n++;
    });
    Object.entries(porTipo).sort((a, b2) => b2[1].n - a[1].n).slice(0, 26)
      .forEach(([k, v2]) => console.log('   x' + String(v2.n).padStart(3) + '  ' + k + '   "' + v2.ex.txt + '"'));
    const abaixoDoMinimo = alvosPeq.filter(a => a.dw < 28 || a.dh < 28);
    console.log('   desenhados abaixo do minimo publicado de 28x28: ' + abaixoDoMinimo.length);

    /* fundo com gradiente derruba a conta: a cor efetiva atras do texto nao
       e a background-color, e sim um pixel do degrade. Esses vao para uma
       lista separada, para conferir a olho, e nao inflam o numero real */
    const agrupa = lista => {
      const o = {};
      lista.forEach(x => {
        const k = x.cls + ' ' + x.fs + 'px r=' + x.razao;
        (o[k] = o[k] || { n: 0, ex: x }).n++;
      });
      return Object.entries(o).sort((a, b2) => a[1].ex.razao - b2[1].ex.razao);
    };
    const firmes = contrastes.filter(x => !x.gradiente);
    const aprox = contrastes.filter(x => x.gradiente);

    console.log('\n== CONTRASTE abaixo do minimo, fundo solido  (' + firmes.length + ' ocorrencias)');
    agrupa(firmes).slice(0, 22).forEach(([k, v2]) =>
      console.log('   x' + String(v2.n).padStart(3) + '  ' + k + ' (precisa ' + v2.ex.precisa + ')  "' + v2.ex.txt + '"'));
    if (!firmes.length) console.log('   nenhuma');

    console.log('\n== a conferir a olho, fundo com gradiente  (' + aprox.length + ' ocorrencias)');
    agrupa(aprox).slice(0, 14).forEach(([k, v2]) =>
      console.log('   x' + String(v2.n).padStart(3) + '  ' + k + '  "' + v2.ex.txt + '"'));

    await c.close();
  }
  await b.close();
})();
