/* A tela do perfil: nome, e-mail, foto, avisos, ajuda, documentos,
   conta e a zona de risco. Mais a barra de baixo com sete destinos. */
const {chromium}=require('playwright'); const fs=require('fs');
const U='http://127.0.0.1:8736/';
const MOCK=fs.readFileSync(__dirname+'/supabase-de-mentira.js','utf8');
const erros=[]; let falhas=0;
const ok=(t,c,x)=>{ console.log((c?'  ok  ':'  FALHOU ')+t+(x?'  '+x:'')); if(!c) falhas++; };
const E={name:'Carla',xp:2400,level:5,createdAt:Date.now()-11*864e5,
  af:{metodo:true,welcomed:true},termo:{versao:'1.0',em:Date.now()},diagnostic:{answers:{}},
  bussola:{diag:{f:1},pacto:{q:1},kpis:[{n:'x',v:1}],ritual:[{t:1}]},
  plan:[{id:'p1',title:'x',bnaipe:'direcao'}],unlocks:{jornada_ok:Date.now()}};

(async()=>{
  const b=await chromium.launch();
  const c=await b.newContext({viewport:{width:412,height:900}});
  await c.addInitScript(MOCK);
  await c.addInitScript(`window.__SB.acesso={status:'active',user_id:'u-ana',email:'ana@x.com'};
    window.__SB.sessao={user:{id:'u-ana',email:'ana@x.com',user_metadata:{}}};
    window.__SB.senhas={'ana@x.com':'blindada2026'};
    localStorage.setItem('ob:dono','u-ana');
    localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
  const p=await c.newPage();
  p.on('pageerror',e=>erros.push('PAGEERROR: '+e.message));
  /* a foto de mentira aponta para um endereco que nao existe: o 404 dela
     nao e erro do app */
  p.on('console',m=>{ if(m.type()==='error' && !/Failed to load resource/.test(m.text())) erros.push('CONSOLE: '+m.text().slice(0,140)); });
  await p.goto(U); await p.waitForTimeout(2200);
  await p.evaluate(()=>closeModal()); await p.waitForTimeout(300);

  console.log('\n1. A BARRA DE BAIXO tem os sete destinos');
  const barra=await p.evaluate(()=>[...document.querySelectorAll('#appnav .anav')].map(a=>a.dataset.v));
  ok('sete destinos', barra.length===7, JSON.stringify(barra));
  ['home','programa','trilhas','bussola','plano','diario','menu'].forEach(v=>
    ok('tem '+v, barra.includes(v)));

  console.log('\n2. O PERFIL abre pelo retrato do topo');
  ok('o retrato existe', await p.evaluate(()=>!!document.getElementById('avatar')));
  await p.evaluate(()=>document.getElementById('avatar').click());
  await p.waitForTimeout(700);
  ok('foi para o perfil', await p.evaluate(()=>document.querySelector('#view-perfil.active')!==null));

  const T=()=>p.evaluate(()=>document.getElementById('view-perfil').innerText);
  const t=await T();
  console.log('\n3. TEM TUDO que a Carla pediu');
  ok('o nome', /Carla/.test(t));
  ok('o e-mail', /ana@x\.com/.test(t), t.split('\n').slice(0,6).join(' | '));
  ok('a foto', /foto/i.test(t));
  ok('as notificacoes', /Avisos/i.test(t));
  ok('suporte e ajuda', /Suporte e ajuda/i.test(t));
  ok('politica de privacidade', /privacidade/i.test(t));
  ok('termos de uso', /Termos de uso/i.test(t));
  ok('sair da conta', /Sair da conta/i.test(t));
  ok('trocar a senha', /Trocar a minha senha/i.test(t));
  ok('a patente aparece', /XP/.test(t));

  console.log('\n4. LIMPAR OS DADOS pede confirmacao por escrito');
  await p.evaluate(()=>pfLimpar()); await p.waitForTimeout(400);
  ok('o botao nasce desligado', await p.evaluate(()=>document.getElementById('pfLimpaBt').disabled));
  await p.fill('#pfConf','qualquer'); await p.waitForTimeout(200);
  ok('palavra errada nao liga', await p.evaluate(()=>document.getElementById('pfLimpaBt').disabled));
  await p.fill('#pfConf','LIMPAR'); await p.waitForTimeout(200);
  ok('a palavra certa liga', await p.evaluate(()=>!document.getElementById('pfLimpaBt').disabled));
  await p.evaluate(()=>closeModal()); await p.waitForTimeout(300);

  console.log('\n5. O NOME se edita, e vai para o servidor');
  await p.evaluate(()=>pfEditarNome()); await p.waitForTimeout(400);
  await p.fill('#pfNomeIn','Carla Caroline'); await p.evaluate(()=>pfSalvarNome());
  await p.waitForTimeout(900);
  ok('mudou na tela', /Carla Caroline/.test(await T()));
  ok('subiu para profiles', await p.evaluate(()=>window.__SB.perfis.some(x=>x.display_name==='Carla Caroline')));
  ok('e no topo tambem', (await p.evaluate(()=>document.getElementById('avatar').textContent)).trim().charAt(0)==='C');

  console.log('\n6. A FOTO sobe para o balde certo e vira avatar');
  await p.evaluate(async()=>{
    const bin=new Blob([new Uint8Array([137,80,78,71])],{type:'image/png'});
    const f=new File([bin],'eu.png',{type:'image/png'});
    await pfEnviarFoto(f);
  });
  await p.waitForTimeout(900);
  const up=await p.evaluate(()=>window.__SB.uploads);
  ok('foi para o balde avatares', up.length===1 && up[0].balde==='avatares', JSON.stringify(up));
  ok('na pasta do dono', up.length===1 && up[0].caminho.indexOf('u-ana/')===0, JSON.stringify(up[0]||{}));
  ok('gravou a url no perfil', await p.evaluate(()=>window.__SB.perfis.some(x=>String(x.avatar_url||'').indexOf('avatares')>=0)));
  ok('o retrato do topo virou imagem', await p.evaluate(()=>!!document.querySelector('#avatar img')));

  console.log('\n7. A AJUDA e o suporte abrem');
  await p.evaluate(()=>pfAjuda()); await p.waitForTimeout(400);
  const ta=await p.evaluate(()=>document.querySelector('.modal').innerText);
  ok('tem perguntas comuns', /Perguntas comuns/i.test(ta));
  ok('responde sobre trocar de celular', /celular/i.test(ta));
  await p.evaluate(()=>closeModal()); await p.waitForTimeout(250);
  await p.evaluate(()=>pfSuporte()); await p.waitForTimeout(400);
  ok('o suporte tem o e-mail da mentoria', /gestaogrupoa@gmail\.com/.test(await p.evaluate(()=>document.querySelector('.modal').innerText)));
  await p.evaluate(()=>closeModal()); await p.waitForTimeout(250);

  console.log('\n8. TROCAR A SENHA, de dentro do perfil');
  await p.evaluate(()=>pfTrocarSenha()); await p.waitForTimeout(400);
  await p.fill('#pfS1','1234'); await p.fill('#pfS2','1234');
  await p.evaluate(()=>pfSalvarSenha()); await p.waitForTimeout(300);
  ok('recusa senha curta', /8 caracteres/.test(await p.evaluate(()=>document.getElementById('pfSErr').textContent)));
  await p.fill('#pfS1','senhaNova2026'); await p.fill('#pfS2','senhaNova2026');
  await p.evaluate(()=>pfSalvarSenha()); await p.waitForTimeout(800);
  ok('trocou', (await p.evaluate(()=>window.__SB.senhas['ana@x.com']))==='senhaNova2026');

  console.log('\n9. O PERFIL nunca fica trancado');
  await p.evaluate(()=>{ S.af={}; S.unlocks={}; save(); go('perfil'); });
  await p.waitForTimeout(700);
  ok('abre mesmo sem a jornada', !/cadeado|Comece por aqui/i.test(await T()), (await T()).slice(0,60));
  ok('e o sair da conta continua ali', /Sair da conta/.test(await T()));

  console.log('\n10. A TELA MAIS aponta para o perfil e nao repete a conta');
  await p.evaluate(()=>{ S.af={metodo:true,welcomed:true}; S.unlocks={jornada_ok:Date.now()}; save(); go('menu'); });
  await p.waitForTimeout(700);
  const tm=await p.evaluate(()=>document.getElementById('view-menu').innerText);
  ok('o perfil e o primeiro da lista', /O meu perfil/.test(tm));
  ok('limpar os dados saiu do pe da tela', !/Limpar meus dados e recome/.test(tm), tm.slice(-160).replace(/\n/g,' | '));
  ok('a Bussola saiu da lista (agora esta na barra)', !/A Bússola/.test(tm));

  await p.screenshot({path:__dirname+'/z_perfil.png', fullPage:false});
  console.log('\nERROS DE JAVASCRIPT: '+(erros.length?('\n  '+[...new Set(erros)].join('\n  ')):'nenhum'));
  console.log('FALHAS: '+falhas);
  await b.close(); process.exit(falhas?1:0);
})();
