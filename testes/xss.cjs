/* =====================================================================
   ATAQUE POR TEXTO DE OUTRA PESSOA

   Três lugares do app montavam um onclick concatenando texto que vem de
   fora: o alvo da denúncia, o contato do cartão de membro e o e-mail da
   compra. Escapar não resolve nenhum dos três, e é isso que este arquivo
   prova: dentro de um atributo de evento o navegador DESFAZ as entidades
   antes de o JavaScript ler a linha, então um &#39; volta a ser apóstrofo
   e fecha a string do mesmo jeito.

   O teste não confere se o texto "parece escapado". Ele dispara o clique
   e vê se o código do atacante rodou, que é a única pergunta que importa.

     node xss.cjs
   ===================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const U = 'http://127.0.0.1:8737/';
const MOCK = fs.readFileSync(__dirname + '/supabase-de-mentira.js', 'utf8');

const erros = [];
let falhas = 0;
const ok = (t, c, x) => { console.log((c ? '  ok  ' : '  FALHOU ') + t + (x ? '  ' + x : '')); if (!c) falhas++; };

/* a carga: se ela rodar, empurra uma marca em window.PWNED */
const CARGA = (marca) => `x');window.PWNED.push('${marca}');('`;

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 412, height: 900 } });
  await c.addInitScript(MOCK);
  await c.addInitScript(`window.PWNED = [];
    window.__SB.acesso={status:'active',user_id:'u-carla',email:'carla@afatorial.com'};
    window.__SB.sessao={user:{id:'u-carla',email:'carla@afatorial.com',user_metadata:{}}};
    window.__SB.mentora=true;
    localStorage.setItem('ob:dono','u-carla');`);
  const p = await c.newPage();
  p.on('pageerror', e => erros.push('PAGEERROR: ' + e.message));
  await p.goto(U); await p.waitForTimeout(2600);
  await p.evaluate(() => { try { closeModal(); } catch (e) {} });
  await p.waitForTimeout(400);

  /* CONTROLE NEGATIVO. Antes de afirmar que o app defende, é preciso
     provar que a carga funciona. Aqui ela é montada do jeito ANTIGO, com
     o texto colado dentro do onclick e passando por escape de entidade,
     que era exatamente o que o app fazia. Se isto NÃO executar, o teste
     inteiro não vale nada: ele estaria passando por a carga ser inócua,
     e não por o app se defender. */
  console.log('\n0. CONTROLE: a carga executa no padrao antigo?');
  await p.evaluate((carga) => {
    const esc = String(carga).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/'/g,'&#39;');
    const d = document.createElement('div');
    d.innerHTML = '<button id="ctrlXss" onclick="ctrlAlvo(\'' + esc + '\')">x</button>';
    document.body.appendChild(d);
    window.ctrlAlvo = function(){};
  }, CARGA('controle'));
  await p.evaluate(() => document.getElementById('ctrlXss').click());
  await p.waitForTimeout(300);
  ok('a carga EXECUTA no padrao antigo (se falhar, o teste nao prova nada)',
    (await p.evaluate(() => window.PWNED)).indexOf('controle') >= 0,
    JSON.stringify(await p.evaluate(() => window.PWNED)));
  await p.evaluate(() => { window.PWNED.length = 0; document.getElementById('ctrlXss').parentNode.remove(); });

  console.log('\n1. DENUNCIA: alvo_id entra no painel da mentora');
  await p.evaluate((carga) => {
    window.__SB.tabelas.denuncias = [{
      id: 'd1', motivo: 'Conteúdo impróprio', detalhe: 'teste',
      alvo_tipo: 'galeria', alvo_id: carga, alvo_user_id: 'u-outro',
      status: 'pendente', created_at: new Date().toISOString(),
    }];
  }, CARGA('denuncia'));
  await p.evaluate(() => { go('admin'); adGo('moderacao'); });
  await p.waitForTimeout(1200);
  const temBotao = await p.evaluate(() => !!document.querySelector('#dnLista .btn.primary.xs'));
  ok('o painel montou com a denuncia', temBotao);
  if (temBotao) {
    await p.evaluate(() => document.querySelector('#dnLista .btn.primary.xs').click());
    await p.waitForTimeout(500);
  }
  ok('o clique NAO executou o codigo do atacante',
    (await p.evaluate(() => window.PWNED)).indexOf('denuncia') < 0,
    JSON.stringify(await p.evaluate(() => window.PWNED)));

  console.log('\n2. CARTAO DE MEMBRO: o contato que a aluna escreve');
  await p.evaluate((carga) => {
    window.PWNED.length = 0;
    window.__SB.tabelas.membros = [{
      user_id: 'u-x', nome: 'Fulana', negocio: 'Loja', cidade: 'Curitiba', uf: 'PR',
      area: 'Varejo', contato: carga, visivel: true,
    }];
  }, CARGA('membro'));
  await p.evaluate(() => { go('comunidade'); if (typeof cmGo === 'function') cmGo('membros'); });
  await p.waitForTimeout(1400);
  const btContato = await p.evaluate(() =>
    [...document.querySelectorAll('#view-comunidade button')].filter(x => /Contato/.test(x.textContent)).length);
  ok('o cartao de membro montou', btContato > 0, btContato + ' botao(oes)');
  if (btContato) {
    await p.evaluate(() =>
      [...document.querySelectorAll('#view-comunidade button')].filter(x => /Contato/.test(x.textContent))[0].click());
    await p.waitForTimeout(500);
  }
  ok('o clique NAO executou o codigo do atacante',
    (await p.evaluate(() => window.PWNED)).indexOf('membro') < 0,
    JSON.stringify(await p.evaluate(() => window.PWNED)));

  console.log('\n3. REENVIAR A SENHA: o e-mail da compra');
  /* apostrofo e caractere valido na parte local de um e-mail, e a TMB
     manda o endereco cru para o webhook, que grava em access.email */
  await p.evaluate((carga) => {
    window.PWNED.length = 0;
    window.__SB.lista = [{
      email: carga, nome: 'Fulana', status: 'active', user_id: 'u-y',
      xp: 10, nivel: 1, entrou: new Date().toISOString(), mexeu: new Date().toISOString(),
    }];
  }, CARGA('reenviar'));
  await p.evaluate(() => { go('admin'); adGo('alunas'); });
  await p.waitForTimeout(1400);
  const btRe = await p.evaluate(() =>
    [...document.querySelectorAll('#adLista button')].filter(x => /Reenviar/.test(x.textContent)).length);
  ok('a lista de alunas montou', btRe > 0, btRe + ' botao(oes)');
  if (btRe) {
    await p.evaluate(() =>
      [...document.querySelectorAll('#adLista button')].filter(x => /Reenviar/.test(x.textContent))[0].click());
    await p.waitForTimeout(600);
    const bt2 = await p.evaluate(() =>
      [...document.querySelectorAll('#modalBox button')].filter(x => /Mandar a senha/.test(x.textContent)).length);
    ok('a confirmacao abriu', bt2 > 0);
    if (bt2) {
      await p.evaluate(() =>
        [...document.querySelectorAll('#modalBox button')].filter(x => /Mandar a senha/.test(x.textContent))[0].click());
      await p.waitForTimeout(600);
    }
  }
  ok('o clique NAO executou o codigo do atacante',
    (await p.evaluate(() => window.PWNED)).indexOf('reenviar') < 0,
    JSON.stringify(await p.evaluate(() => window.PWNED)));

  console.log('\n4. NENHUM onclick do app carrega texto de fora');
  const suspeitos = await p.evaluate(() => {
    const fora = [];
    document.querySelectorAll('[onclick]').forEach(el => {
      const s = el.getAttribute('onclick') || '';
      /* despacho por indice e por nome de funcao e o padrao seguro:
         qualquer aspas com conteudo longo dentro do atributo e suspeita */
      const m = s.match(/'([^']{25,})'/);
      if (m) fora.push(s.slice(0, 70));
    });
    return fora;
  });
  ok('nenhum onclick com texto longo colado dentro', suspeitos.length === 0, JSON.stringify(suspeitos).slice(0, 200));

  console.log('\nERROS DE JAVASCRIPT: ' + (erros.length ? ('\n  ' + [...new Set(erros)].join('\n  ')) : 'nenhum'));
  console.log('FALHAS: ' + falhas);
  await b.close();
  process.exit(falhas ? 1 : 0);
})();
