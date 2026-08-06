/* O login inteiro, com o Supabase simulado. Roda em http://, entao a trava
   de acesso esta LIGADA: e o mesmo caminho da aluna de verdade. */
const {chromium}=require('playwright');
const fs=require('fs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/mock-sb.js','utf8');
const erros=[];
let falhas=0;
const ok=(t,c,extra)=>{ console.log((c?'  ok  ':'  FALHOU ')+t+(extra?'  '+extra:'')); if(!c) falhas++; };

async function nova(b, cfg){
  const pg=await b.newPage({viewport:{width:412,height:900}});
  pg.on('pageerror',e=>erros.push('PAGEERROR: '+e.message));
  pg.on('console',m=>{ if(m.type()==='error') erros.push('CONSOLE: '+m.text().slice(0,140)); });
  await pg.addInitScript(MOCK);
  if(cfg) await pg.addInitScript(cfg);
  return pg;
}
const txt=pg=>pg.evaluate(()=>{ const g=document.getElementById('ob-gate'); return g&&g.style.display!=='none'?g.innerText.replace(/\n+/g,' | '):null; });

(async()=>{
  const b=await chromium.launch();

  console.log('\n(a entrada com senha, o primeiro acesso e a recuperacao estao no t32)');

  console.log('\n6. LINHA SO COM E-MAIL: casa o user_id pela funcao, nao por update');
  let pg2=await nova(b, `window.__SBPRE=1`);
  await pg2.addInitScript(`    window.__SB.acesso={status:'active',user_id:null,email:'carla@exemplo.com'};
    window.__SB.sessao={user:{id:'u-ana',email:'carla@exemplo.com'}};
  `);
  await pg2.goto(U); await pg2.waitForTimeout(1500);
  const rpcs=await pg2.evaluate(()=>window.__SB.rpcs.map(r=>r[0]));
  ok('chamou casar_meu_acesso', rpcs.indexOf('casar_meu_acesso')>=0, JSON.stringify(rpcs));
  ok('nao escreveu direto em access', await pg2.evaluate(()=>window.__SB.enviados.every(e=>!e.status)));
  await pg2.close();

  console.log('\n7. TROCA DE CONTA no mesmo celular: o progresso NAO vaza');
  // as duas paginas no MESMO contexto, para dividirem o mesmo localStorage,
  // que e exatamente o que acontece num celular emprestado
  const ctx=await b.newContext({viewport:{width:412,height:900}});
  await ctx.addInitScript(MOCK);
  const pgA=await ctx.newPage();
  await pgA.addInitScript(`window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};
    window.__SB.sessao={user:{id:'u-ana',email:'ana@x.com'}};`);
  await pgA.goto(U); await pgA.waitForTimeout(1600);
  await pgA.evaluate(()=>{ localStorage.setItem('operacaoblindada:state:v1', JSON.stringify({name:'Ana', xp:9999, segredo:'faturamento da Ana'})); });
  const donoAna=await pgA.evaluate(()=>localStorage.getItem('ob:dono'));
  ok('o aparelho ficou marcado como da Ana', donoAna==='u-ana', String(donoAna));
  await pgA.close();

  const pgB=await ctx.newPage();
  await pgB.addInitScript(`window.__SB.progresso=null; window.__SB.enviados=[];
    window.__SB.acesso={status:'active',user_id:'u-bia',email:'bia@x.com'};
    window.__SB.sessao={user:{id:'u-bia',email:'bia@x.com'}};`);
  pgB.on('pageerror',e=>erros.push('PAGEERROR: '+e.message));
  await pgB.goto(U); await pgB.waitForTimeout(2000);
  const vazou=await pgB.evaluate(()=>JSON.stringify(window.__SB.enviados));
  ok('nao mandou o dado da Ana para a conta da Bia', !/Ana|9999|segredo/.test(vazou), vazou.slice(0,90));
  ok('o estado local da Ana foi apagado', await pgB.evaluate(()=>{
    const l=localStorage.getItem('operacaoblindada:state:v1'); return !l || !/Ana|9999/.test(l); }));
  ok('o aparelho passou a ser da Bia', (await pgB.evaluate(()=>localStorage.getItem('ob:dono')))==='u-bia');
  await ctx.close();

  console.log('\n8. SEM REDE: abre dentro dos 7 dias, para depois deles');
  let pg4=await nova(b);
  await pg4.addInitScript(`    window.__SB.sessao={user:{id:'u-ana',email:'ana@x.com'}};
    window.__SB.falharRede=true;
    localStorage.setItem('ob:acesso:ok', String(Date.now()-2*86400000));  // 2 dias
  `);
  await pg4.goto(U); await pg4.waitForTimeout(1500);
  ok('com 2 dias sem rede, o app ABRE de verdade', await pg4.evaluate(()=>
    (!document.getElementById('ob-gate')||document.getElementById('ob-gate').style.display==='none')
    && !!(document.querySelector('.view.active')||document.querySelector('#view-onboard.active'))));
  await pg4.close();
  let pg4b=await nova(b);
  await pg4b.addInitScript(`window.__SB.sessao={user:{id:'u-ana',email:'ana@x.com'}};
    window.__SB.falharRede=true;
    localStorage.setItem('ob:acesso:ok', String(Date.now()-9*86400000));`);
  await pg4b.goto(U); await pg4b.waitForTimeout(1600);
  const t8=await txt(pg4b)||'';
  ok('com 9 dias sem rede, pede conexao', /internet uma vez|7 dias/i.test(t8), JSON.stringify(t8.slice(0,70)));
  await pg4b.close();

  console.log('\n9. TRABALHO OFFLINE nao e atropelado pelo servidor');
  let pg5=await nova(b);
  await pg5.addInitScript(`    window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};
    window.__SB.sessao={user:{id:'u-ana',email:'ana@x.com'}};
    localStorage.setItem('ob:dono','u-ana');
    localStorage.setItem('operacaoblindada:state:v1', JSON.stringify({name:'Ana', xp:500, trabalhoNovo:true}));
    localStorage.setItem('ob:mudou', String(Date.now()));       // fez coisa
    localStorage.setItem('ob:enviado', String(Date.now()-90000)); // e nao subiu
    window.__SB.progresso={state:{name:'Ana', xp:10}, atualizado_em:new Date(Date.now()-3600000).toISOString()};
  `);
  await pg5.goto(U); await pg5.waitForTimeout(1800);
  const local9=await pg5.evaluate(()=>localStorage.getItem('operacaoblindada:state:v1'));
  ok('manteve o que foi feito offline', /trabalhoNovo/.test(local9||''), (local9||'').slice(0,60));
  ok('subiu para o servidor', /trabalhoNovo/.test(await pg5.evaluate(()=>JSON.stringify(window.__SB.enviados))));
  await pg5.close();

  console.log('\n10. ACESSO CORTADO durante o uso');
  let pg6=await nova(b);
  await pg6.addInitScript(`    window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};
    window.__SB.sessao={user:{id:'u-ana',email:'ana@x.com'}};
  `);
  await pg6.goto(U); await pg6.waitForTimeout(1600);
  ok('entrou', await pg6.evaluate(()=>{ const g=document.getElementById('ob-gate'); return !g||g.style.display==='none'; }));
  await pg6.evaluate(()=>{ window.__SB.acesso={status:'inactive',user_id:'u-ana',email:'ana@x.com'}; OB.reconferir(); });
  await pg6.waitForTimeout(800);
  const t10=await txt(pg6)||'';
  ok('a tela avisa na hora', /n.o liberado|suspenso/i.test(t10), JSON.stringify(t10.slice(0,70)));
  ok('sem oferta de compra', !/compr|assin|renov/i.test(t10));
  await pg6.close();

  console.log('\n11. ERRO DO SERVIDOR sai em portugues');
  let pg7=await nova(b);
  await pg7.goto(U); await pg7.waitForTimeout(1100);
  await pg7.evaluate(()=>{ window.__SB.erroOtp='Email rate limit exceeded'; });
  await pg7.click('#ob-primeiro'); await pg7.waitForTimeout(300);
  await pg7.fill('#ob-email','a@b.com'); await pg7.click('#ob-send'); await pg7.waitForTimeout(400);
  const e11=await pg7.evaluate(()=>document.getElementById('ob-erro').textContent);
  ok('limite explicado em portugues', /minutos/i.test(e11), JSON.stringify(e11));
  ok('nada em ingles', !/rate limit|exceeded/i.test(e11));
  await pg7.close();

  console.log('\nERROS DE JAVASCRIPT: '+(erros.length?('\n  '+[...new Set(erros)].join('\n  ')):'nenhum'));
  console.log('FALHAS: '+falhas);
  await b.close();
  process.exit(falhas?1:0);
})();
