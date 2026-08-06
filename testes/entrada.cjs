/* A entrada nova: senha, primeiro acesso com codigo e recuperacao. */
const {chromium}=require('playwright'); const fs=require('fs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/mock-sb.js','utf8');
const erros=[]; let falhas=0;
const ok=(t,c,x)=>{ console.log((c?'  ok  ':'  FALHOU ')+t+(x?'  '+x:'')); if(!c) falhas++; };
const txt=pg=>pg.evaluate(()=>{const g=document.getElementById('ob-gate');return g&&g.style.display!=='none'?g.innerText.replace(/\n+/g,' | '):null;});
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

  console.log('\n2. SENHA ERRADA nao diz se a conta existe');
  await pg.fill('#ob-email','ana@x.com'); await pg.fill('#ob-senha','chutando123');
  await pg.click('#ob-entrar'); await pg.waitForTimeout(500);
  const e2=await pg.evaluate(()=>document.getElementById('ob-erro').innerText);
  ok('mensagem unica para os dois casos', /não conferem/i.test(e2), JSON.stringify(e2.slice(0,60)));
  ok('nao entrega que a conta nao existe', !/não existe|nao existe|cadastr/i.test(e2));
  ok('e ensina o caminho do primeiro acesso', /primeiro acesso/i.test(e2));

  console.log('\n3. PRIMEIRO ACESSO: codigo, senha, e entra');
  await pg.click('#ob-primeiro'); await pg.waitForTimeout(400);
  ok('a tela explica o primeiro acesso', /Primeiro acesso/.test(await txt(pg)||''));
  await pg.fill('#ob-email','ana@x.com'); await pg.click('#ob-send'); await pg.waitForTimeout(500);
  ok('foi para o codigo', await pg.evaluate(()=>!!document.getElementById('ob-code')));
  await pg.fill('#ob-code','999999'); await pg.waitForTimeout(500);
  ok('codigo errado nao passa', /inválido|vencido/i.test(await pg.evaluate(()=>document.getElementById('ob-erro').textContent)));
  await pg.fill('#ob-code','123456'); await pg.waitForTimeout(700);
  ok('agora pede para criar a senha', await pg.evaluate(()=>!!document.getElementById('ob-s1')), (await txt(pg)||'').slice(0,50));
  ok('o app ainda NAO abriu', await pg.evaluate(()=>!document.querySelector('.view.active')&&!document.querySelector('#view-onboard.active')));

  console.log('\n4. A SENHA tem regra');
  await pg.fill('#ob-s1','1234'); await pg.fill('#ob-s2','1234');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(300);
  ok('recusa senha curta', /8 caracteres/.test(await pg.evaluate(()=>document.getElementById('ob-erro').textContent)));
  await pg.fill('#ob-s1','12345678'); await pg.fill('#ob-s2','12345678');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(300);
  ok('recusa so numeros', /números/i.test(await pg.evaluate(()=>document.getElementById('ob-erro').textContent)));
  await pg.fill('#ob-s1','blindada2026'); await pg.fill('#ob-s2','outracoisa9');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(300);
  ok('recusa quando as duas nao batem', /não são iguais/i.test(await pg.evaluate(()=>document.getElementById('ob-erro').textContent)));

  console.log('\n5. SALVAR a senha abre o app');
  await pg.evaluate(()=>{ window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'}; });
  await pg.fill('#ob-s1','blindada2026'); await pg.fill('#ob-s2','blindada2026');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(1500);
  ok('a senha foi guardada', (await pg.evaluate(()=>window.__SB.senhaDefinida))==='blindada2026');
  ok('e o app abriu', await pg.evaluate(()=>{const g=document.getElementById('ob-gate');return (!g||g.style.display==='none');}));

  console.log('\n6. DA PROXIMA VEZ entra so com a senha, sem e-mail nenhum');
  const senhas=await pg.evaluate(()=>JSON.stringify(window.__SB.senhas));
  await pg.close();
  pg=await nova(b, `window.__SB.senhas=${senhas};
    window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};`);
  await pg.goto(U); await pg.waitForTimeout(1300);
  const antes=await pg.evaluate(()=>window.__SB.otps.length);
  await pg.fill('#ob-email','ana@x.com'); await pg.fill('#ob-senha','blindada2026');
  await pg.click('#ob-entrar'); await pg.waitForTimeout(1600);
  ok('entrou direto', await pg.evaluate(()=>{const g=document.getElementById('ob-gate');return (!g||g.style.display==='none');}));
  ok('sem mandar e-mail nenhum', (await pg.evaluate(()=>window.__SB.otps.length))===antes);
  await pg.close();

  console.log('\n7. ESQUECI A SENHA: mesmo caminho, senha nova');
  pg=await nova(b, `window.__SB.senhas={'ana@x.com':'blindada2026'};
    window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};`);
  await pg.goto(U); await pg.waitForTimeout(1300);
  await pg.click('#ob-esqueci'); await pg.waitForTimeout(400);
  ok('a tela fala de recuperar', /Recuperar a senha/.test(await txt(pg)||''));
  await pg.fill('#ob-email','ana@x.com'); await pg.click('#ob-send'); await pg.waitForTimeout(500);
  await pg.fill('#ob-code','123456'); await pg.waitForTimeout(700);
  ok('pede a senha nova', /senha nova/i.test(await txt(pg)||''), (await txt(pg)||'').slice(0,60));
  await pg.fill('#ob-s1','outraSenha77'); await pg.fill('#ob-s2','outraSenha77');
  await pg.click('#ob-salvar'); await pg.waitForTimeout(1500);
  ok('trocou a senha', (await pg.evaluate(()=>window.__SB.senhas['ana@x.com']))==='outraSenha77');
  ok('e entrou', await pg.evaluate(()=>{const g=document.getElementById('ob-gate');return (!g||g.style.display==='none');}));

  console.log('\n8. SEM ACESSO: a tela cobra o e-mail da inscricao');
  await pg.close();
  pg=await nova(b, `window.__SB.senhas={'x@x.com':'blindada2026'}; window.__SB.acesso=null;`);
  await pg.goto(U); await pg.waitForTimeout(1300);
  await pg.fill('#ob-email','x@x.com'); await pg.fill('#ob-senha','blindada2026');
  await pg.click('#ob-entrar'); await pg.waitForTimeout(1600);
  const t8=await txt(pg)||'';
  ok('diz que precisa ser o mesmo e-mail da inscricao', /mesmo e-mail|mesmo que voc/i.test(t8), t8.slice(0,90));
  ok('sem caminho de compra', !/compr|assin|pag(ar|amento)|R\$/i.test(t8));

  console.log('\n9. TROCAR A SENHA dentro do app');
  await pg.close();
  pg=await nova(b, `window.__SB.senhas={'ana@x.com':'blindada2026'};
    window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};
    window.__SB.sessao={user:{id:'u-ana',email:'ana@x.com'}};
    localStorage.setItem('ob:dono','u-ana');
    localStorage.setItem('operacaoblindada:state:v1', JSON.stringify({name:'Ana',af:{metodo:true,welcomed:true},unlocks:{jornada_ok:1},createdAt:Date.now(),termo:{versao:'1.0',em:Date.now()}}));`);
  await pg.goto(U); await pg.waitForTimeout(1800);
  await pg.evaluate(()=>{ closeModal(); go('menu'); }); await pg.waitForTimeout(600);
  ok('o botao existe na tela Mais', (await pg.evaluate(()=>document.querySelector('#view-menu').innerText)).includes('Trocar a minha senha'));
  await pg.evaluate(()=>nvTrocarSenha()); await pg.waitForTimeout(300);
  await pg.evaluate(()=>{ $('#nvS1').value='senhaNova2026'; $('#nvS2').value='senhaNova2026'; nvSenhaSalvar(); });
  await pg.waitForTimeout(600);
  ok('trocou de dentro do app', (await pg.evaluate(()=>window.__SB.senhas['ana@x.com']))==='senhaNova2026');

  console.log('\nERROS DE JAVASCRIPT: '+(erros.length?('\n  '+[...new Set(erros)].join('\n  ')):'nenhum'));
  console.log('FALHAS: '+falhas);
  await b.close(); process.exit(falhas?1:0);
})();
