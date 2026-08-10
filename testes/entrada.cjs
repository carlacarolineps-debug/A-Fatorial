/* A entrada nova: senha temporaria no primeiro acesso, senha propria
   depois, e o link de recuperacao. Dez blocos, do jeito que a aluna faz. */
const {chromium}=require('playwright'); const fs=require('fs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const erros=[]; let falhas=0;
const ok=(t,c,x)=>{ console.log((c?'  ok  ':'  FALHOU ')+t+(x?'  '+x:'')); if(!c) falhas++; };
const txt=pg=>pg.evaluate(()=>{const g=document.getElementById('ob-gate');return g&&g.style.display!=='none'?g.innerText.replace(/\n+/g,' | '):null;});
const aberto=pg=>pg.evaluate(()=>{const g=document.getElementById('ob-gate');return (!g||g.style.display==='none');});
async function nova(b, init){
  const pg=await b.newPage({viewport:{width:412,height:900}});
  pg.on('pageerror',e=>erros.push('PAGEERROR: '+e.message));
  pg.on('console',m=>{ if(m.type()==='error') erros.push('CONSOLE: '+m.text().slice(0,140)); });
  await pg.addInitScript(MOCK);
  if(init) await pg.addInitScript(init);
  return pg;
}
(async()=>{
  const b=await chromium.launch();

  console.log('\n1. A TELA DE ENTRADA pede e-mail e senha');
  let pg=await nova(b);
  await pg.goto(U); await pg.waitForTimeout(1300);
  ok('tem campo de senha', await pg.evaluate(()=>!!document.getElementById('ob-senha')));
  ok('tem primeiro acesso', await pg.evaluate(()=>!!document.getElementById('ob-primeiro')));
  ok('tem esqueci a senha', await pg.evaluate(()=>!!document.getElementById('ob-esqueci')));
  ok('nao existe mais campo de codigo', await pg.evaluate(()=>!document.getElementById('ob-code')));

  console.log('\n2. SENHA ERRADA nao diz se a conta existe');
  await pg.fill('#ob-email','ana@x.com'); await pg.fill('#ob-senha','chutando123');
  await pg.click('#ob-entrar'); await pg.waitForTimeout(500);
  const e2=await pg.evaluate(()=>document.getElementById('ob-erro').innerText);
  ok('mensagem unica para os dois casos', /não conferem/i.test(e2), JSON.stringify(e2.slice(0,60)));
  ok('nao entrega que a conta nao existe', !/não existe|nao existe|cadastr/i.test(e2));
  ok('e ensina o caminho do primeiro acesso', /primeiro acesso/i.test(e2));

  console.log('\n3. PRIMEIRO ACESSO explica de onde vem a senha');
  await pg.click('#ob-primeiro'); await pg.waitForTimeout(400);
  const t3=await txt(pg)||'';
  ok('fala de senha temporaria', /tempor/i.test(t3), t3.slice(0,80));
  ok('avisa que o app cobra a senha propria em seguida', /criar a sua pr/i.test(t3));
  ok('cobra o mesmo e-mail da inscricao', /mesmo que voc|inscri/i.test(t3));
  ok('nao pede codigo nenhum', !/6 d[ií]gitos/i.test(t3), t3.slice(0,80));

  console.log('\n4. A SENHA TEMPORARIA entra, mas o app NAO abre');
  await pg.close();
  pg=await nova(b, `window.__SB.senhas={'ana@x.com':'temp7788ab'};
    window.__SB.temporaria={'ana@x.com':true};
    window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};`);
  await pg.goto(U); await pg.waitForTimeout(1300);
  await pg.fill('#ob-email','ana@x.com'); await pg.fill('#ob-senha','temp7788ab');
  await pg.click('#ob-entrar'); await pg.waitForTimeout(1800);
  ok('pediu a senha nova', await pg.evaluate(()=>!!document.getElementById('ob-s1')), (await txt(pg)||'').slice(0,60));
  ok('o app ainda NAO abriu', !(await aberto(pg)));
  ok('diz que a do e-mail era temporaria', /tempor/i.test(await txt(pg)||''));

  console.log('\n5. A SENHA tem regra');
  await pg.fill('#ob-s1','1234'); await pg.fill('#ob-s2','1234');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(300);
  ok('recusa senha curta', /8 caracteres/.test(await pg.evaluate(()=>document.getElementById('ob-erro').textContent)));
  await pg.fill('#ob-s1','12345678'); await pg.fill('#ob-s2','12345678');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(300);
  ok('recusa so numeros', /números/i.test(await pg.evaluate(()=>document.getElementById('ob-erro').textContent)));
  await pg.fill('#ob-s1','blindada2026'); await pg.fill('#ob-s2','outracoisa9');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(300);
  ok('recusa quando as duas nao batem', /não são iguais/i.test(await pg.evaluate(()=>document.getElementById('ob-erro').textContent)));

  console.log('\n6. SALVAR a senha apaga a marca e abre o app');
  await pg.fill('#ob-s1','blindada2026'); await pg.fill('#ob-s2','blindada2026');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(2000);
  ok('a senha foi guardada', (await pg.evaluate(()=>window.__SB.senhaDefinida))==='blindada2026');
  ok('a marca de temporaria caiu', await pg.evaluate(()=>!window.__SB.temporaria['ana@x.com']));
  ok('e o app abriu', await aberto(pg));

  console.log('\n7. DA PROXIMA VEZ entra direto, sem e-mail nenhum');
  await pg.close();
  pg=await nova(b, `window.__SB.senhas={'ana@x.com':'blindada2026'};
    window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};`);
  await pg.goto(U); await pg.waitForTimeout(1300);
  await pg.fill('#ob-email','ana@x.com'); await pg.fill('#ob-senha','blindada2026');
  await pg.click('#ob-entrar'); await pg.waitForTimeout(1800);
  ok('entrou direto', await aberto(pg));
  ok('sem pedir senha nova', await pg.evaluate(()=>!document.getElementById('ob-s1')));
  ok('sem mandar e-mail nenhum', (await pg.evaluate(()=>window.__SB.recuperacoes.length))===0);

  console.log('\n8. ESQUECI A SENHA manda o link, e nao entrega quem tem conta');
  await pg.close();
  pg=await nova(b, `window.__SB.senhas={'ana@x.com':'blindada2026'};
    window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};`);
  await pg.goto(U); await pg.waitForTimeout(1300);
  await pg.click('#ob-esqueci'); await pg.waitForTimeout(400);
  ok('a tela fala de recuperar', /Recuperar a senha/.test(await txt(pg)||''));
  await pg.fill('#ob-email','ninguem@x.com'); await pg.click('#ob-send'); await pg.waitForTimeout(700);
  const t8=await txt(pg)||'';
  ok('pediu o link', (await pg.evaluate(()=>window.__SB.recuperacoes.length))===1);
  ok('a mensagem nao diz se a conta existe', /Se existe uma conta/i.test(t8), t8.slice(0,70));
  ok('tem reenviar com espera', /Reenviar em \d+s/.test(t8), t8.slice(0,120));

  console.log('\n9. VOLTANDO DO LINK: a tela e a da senha nova, nao o app');
  await pg.close();
  pg=await nova(b, `window.__SB.senhas={'ana@x.com':'blindada2026'};
    window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};
    window.__SB.sessao={user:{id:'u-ana',email:'ana@x.com',user_metadata:{}}};`);
  await pg.goto(U+'#access_token=abc&type=recovery'); await pg.waitForTimeout(1800);
  ok('caiu na senha nova', await pg.evaluate(()=>!!document.getElementById('ob-s1')), (await txt(pg)||'').slice(0,60));
  ok('o app NAO abriu com a sessao do link', !(await aberto(pg)));
  await pg.fill('#ob-s1','outraSenha77'); await pg.fill('#ob-s2','outraSenha77');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(2000);
  ok('trocou a senha', (await pg.evaluate(()=>window.__SB.senhas['ana@x.com']))==='outraSenha77');
  ok('e entrou', await aberto(pg));
  ok('o token saiu da barra de endereco', !(await pg.evaluate(()=>location.hash)).includes('access_token'));

  console.log('\n10. APERTAR NAO BASTA: se o servidor recusar, o app NAO abre');
  await pg.close();
  pg=await nova(b, `window.__SB.senhas={'ana@x.com':'temp7788ab'};
    window.__SB.temporaria={'ana@x.com':true};
    window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};`);
  await pg.goto(U); await pg.waitForTimeout(1300);
  await pg.fill('#ob-email','ana@x.com'); await pg.fill('#ob-senha','temp7788ab');
  await pg.click('#ob-entrar'); await pg.waitForTimeout(1800);
  ok('pediu a senha nova', await pg.evaluate(()=>!!document.getElementById('ob-s1')));
  await pg.evaluate(()=>{ window.__SB.erroUpdate='Auth session missing'; });
  await pg.fill('#ob-s1','blindada2026'); await pg.fill('#ob-s2','blindada2026');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(1500);
  ok('o app NAO abriu', !(await aberto(pg)));
  ok('continua pedindo a senha', await pg.evaluate(()=>!!document.getElementById('ob-s1')));
  ok('e explicou o que houve', (await pg.evaluate(()=>document.getElementById('ob-erro').textContent)).length>5,
     JSON.stringify(await pg.evaluate(()=>document.getElementById('ob-erro').textContent)));
  ok('a marca de temporaria NAO caiu', await pg.evaluate(()=>!!window.__SB.temporaria['ana@x.com']));
  ok('a senha NAO mudou', (await pg.evaluate(()=>window.__SB.senhas['ana@x.com']))==='temp7788ab');
  await pg.evaluate(()=>{ window.__SB.erroUpdate=null; });
  await pg.click('#ob-salvar'); await pg.waitForTimeout(2000);
  ok('e quando o servidor aceita, aí sim abre', await aberto(pg));

  console.log('\n11. O E-MAIL DIGITADO nao se perde ao ver o primeiro acesso');
  await pg.close();
  pg=await nova(b);
  await pg.goto(U); await pg.waitForTimeout(1300);
  await pg.fill('#ob-email','carla@exemplo.com');
  await pg.click('#ob-primeiro'); await pg.waitForTimeout(500);
  const t11=await txt(pg)||'';
  ok('a tela diz que NAO cria conta aqui', /n.o existe criar conta/i.test(t11), t11.slice(0,80));
  ok('e o botao diz para onde leva', /Voltar para a entrada/.test(t11));
  await pg.click('#ob-volta'); await pg.waitForTimeout(500);
  ok('voltou para a entrada', await pg.evaluate(()=>!!document.getElementById('ob-senha')));
  ok('com o e-mail ainda escrito', (await pg.evaluate(()=>document.getElementById('ob-email').value))==='carla@exemplo.com',
     JSON.stringify(await pg.evaluate(()=>document.getElementById('ob-email').value)));

  console.log('\n12. SEM ACESSO: a tela cobra o e-mail da inscricao');
  await pg.close();
  pg=await nova(b, `window.__SB.senhas={'x@x.com':'blindada2026'}; window.__SB.acesso=null;`);
  await pg.goto(U); await pg.waitForTimeout(1300);
  await pg.fill('#ob-email','x@x.com'); await pg.fill('#ob-senha','blindada2026');
  await pg.click('#ob-entrar'); await pg.waitForTimeout(1800);
  const t10=await txt(pg)||'';
  ok('diz que precisa ser o mesmo e-mail da inscricao', /mesmo e-mail|mesmo que voc/i.test(t10), t10.slice(0,90));
  ok('sem caminho de compra', !/compr|assin|pag(ar|amento)|R\$/i.test(t10));

  console.log('\nERROS DE JAVASCRIPT: '+(erros.length?('\n  '+[...new Set(erros)].join('\n  ')):'nenhum'));
  console.log('FALHAS: '+falhas);
  await b.close(); process.exit(falhas?1:0);
})();
