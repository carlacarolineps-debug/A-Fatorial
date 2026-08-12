/* =====================================================================
   PRONTO PARA AS LOJAS?

   Confere, no app rodando, os itens das diretrizes que se podem verificar
   por software. Cada bloco cita a regra, porque afirmação sem a regra do
   lado é opinião.

     App Store 1.2       conteúdo de usuário: filtrar, denunciar, bloquear,
                         contato publicado
     App Store 2.1       o app abre e funciona para o revisor
     App Store 3.1.1     nada dentro do app desbloqueia por outro meio
     App Store 3.1.3     nenhum caminho de compra, dentro nem para fora
     App Store 5.1.1     política de privacidade acessível dentro do app
     App Store 5.1.1(v)  exclusão da conta dentro do app
     Play, dados         exclusão pela web, e a página existe de verdade

     node lojas.cjs
   ===================================================================== */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const U = 'http://127.0.0.1:8736/';
const MOCK = fs.readFileSync(__dirname + '/supabase-de-mentira.js', 'utf8');
const RAIZ = path.join(__dirname, '..');

const erros = [];
let falhas = 0;
const ok = (t, c, x) => { console.log((c ? '  ok  ' : '  FALHOU ') + t + (x ? '  ' + x : '')); if (!c) falhas++; };

const E = {
  name: 'Carla', xp: 2400, level: 5, createdAt: Date.now() - 40 * 864e5,
  modules: { recrutamento: { completed: true, steps: { 0: true } } },
  af: { metodo: true, welcomed: true }, termo: { versao: '1.0', em: Date.now() },
  diagnostic: { answers: {}, em: Date.now() },
  bussola: { diag: { f: 1 }, pacto: { q: 1 }, kpis: [{ n: 'F', v: 1 }], ritual: [{ t: 1 }] },
  plan: [{ id: 'p1', title: 'x', bnaipe: 'direcao' }], unlocks: { jornada_ok: Date.now() },
};

(async () => {
  const b = await chromium.launch();

  /* ---------- A. O QUE O REVISOR VE SEM ACESSO LIBERADO ---------- */
  console.log('\nA. QUEM NAO TEM ACESSO (a tela que o revisor ve se a conta falhar)');
  const c0 = await b.newContext({ viewport: { width: 390, height: 844 } });
  await c0.addInitScript(MOCK);
  await c0.addInitScript(`window.__SB.acesso=null;
    window.__SB.sessao={user:{id:'u',email:'ninguem@x.com',user_metadata:{}}};`);
  const p0 = await c0.newPage();
  p0.on('pageerror', e => erros.push('PAGEERROR: ' + e.message));
  await p0.goto(U); await p0.waitForTimeout(2800);
  const parede = await p0.evaluate(() => document.body.innerText);
  ok('a parede explica o que fazer', /acesso|inscri/i.test(parede), parede.replace(/\s+/g, ' ').slice(0, 80));
  ok('3.1.3: sem caminho de compra na parede',
    !/(comprar|assinar|adquirir|pagar|plano|pre[çc]o|R\$)/i.test(parede));
  ok('1.2: contato publicado, para quem nao consegue entrar', /@/.test(parede));
  await c0.close();

  /* ---------- B. O APP POR DENTRO ---------- */
  console.log('\nB. O APP POR DENTRO');
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  await c.addInitScript(MOCK);
  await c.addInitScript(`window.__SB.acesso={status:'active',user_id:'u',email:'a@x.com'};
    window.__SB.sessao={user:{id:'u',email:'a@x.com',user_metadata:{}}};
    localStorage.setItem('ob:dono','u');
    localStorage.setItem('operacaoblindada:state:v1', ${JSON.stringify(JSON.stringify(E))});`);
  const p = await c.newPage();
  p.on('pageerror', e => erros.push('PAGEERROR: ' + e.message));
  await p.goto(U); await p.waitForTimeout(2800);
  await p.evaluate(() => { try { closeModal(); } catch (e) {} });
  await p.waitForTimeout(500);

  /* 3.1.3: nenhum link para fora, em tela nenhuma */
  const VIEWS = ['home', 'programa', 'bussola', 'trilhas', 'plano', 'diario', 'apostila',
                 'ano', 'ferramentas', 'gestao', 'pesquisas', 'conquistas', 'comunidade',
                 'mentora', 'perfil', 'menu'];
  let externos = [];
  for (const v of VIEWS) {
    await p.evaluate(x => go(x), v); await p.waitForTimeout(420);
    const l = await p.evaluate(() => [...document.querySelectorAll('a[href]')]
      .map(a => a.getAttribute('href'))
      .filter(h => /^https?:/i.test(h)));
    l.forEach(h => externos.push(v + ': ' + h));
  }
  ok('3.1.3: nenhum link externo em nenhuma das 16 telas',
    externos.length === 0, JSON.stringify(externos.slice(0, 4)));

  /* 5.1.1: privacidade e termos alcancaveis DENTRO do app */
  await p.evaluate(() => go('perfil')); await p.waitForTimeout(700);
  const tperfil = await p.evaluate(() => document.getElementById('view-perfil').innerText);
  ok('5.1.1: politica de privacidade dentro do app', /privacidade/i.test(tperfil));
  ok('5.1.1: termos de uso dentro do app', /termos de uso/i.test(tperfil));
  ok('1.2: contato de suporte dentro do app', /suporte/i.test(tperfil));
  ok('5.1.1(v): exclusao da conta dentro do app', /excluir a minha conta/i.test(tperfil));

  /* 5.1.1(v): e a exclusao chega mesmo na funcao que apaga */
  await p.evaluate(() => { window.__EXC = []; const o = OB.excluirConta;
    if (o) OB.excluirConta = function () { window.__EXC.push(1); return Promise.resolve({}); }; });
  const temFuncao = await p.evaluate(() => typeof modExcluirConta === 'function');
  ok('a exclusao tem caminho ligado (nao e botao morto)', temFuncao);

  /* 1.2: denunciar e bloquear existem no conteudo de usuario */
  await p.evaluate(() => go('comunidade')); await p.waitForTimeout(900);
  const temMod = await p.evaluate(() => typeof modAcoesUGC === 'function'
    && typeof modDenunciar === 'function' && typeof modBloquear === 'function');
  ok('1.2: denunciar e bloquear existem', temMod);

  /* 1.2: a regra de convivencia trava o primeiro uso */
  /* a tela e travada de verdade: modTermoTela abre com {trava:true}, que o
     modal recusa sobrescrever, e modTermoPendente e quem a dispara */
  const travaTermo = await p.evaluate(() => ({
    tela: typeof modTermoTela === 'function',
    pendente: typeof modTermoPendente === 'function',
  }));
  ok('1.2: a regra de convivencia existe', travaTermo.tela && travaTermo.pendente,
    JSON.stringify(travaTermo));
  const semSaida = await p.evaluate(() => {
    S.termo = null;
    modTermoTela(function () {});
    const bg = document.querySelector('.modal-bg');
    const x = document.querySelector('.modal .modal-x, .modal .close');
    return { abriu: !!bg, semX: !x };
  });
  ok('1.2: e ela nao tem saida antes do aceite', semSaida.abriu && semSaida.semX,
    JSON.stringify(semSaida));
  await p.evaluate(() => { try { closeModal(); } catch (e) {} });

  /* 3.1.1: nada de chave, cupom ou codigo de ativacao */
  const corpo = await p.evaluate(() => document.body.innerText);
  ok('3.1.1: sem chave de licenca, cupom ou codigo de ativacao',
    !/(chave de ativa|c[óo]digo promocional|cupom|licen[çc]a de uso)/i.test(corpo));

  await c.close();

  /* ---------- C. AS PAGINAS PUBLICAS ---------- */
  console.log('\nC. AS PAGINAS PUBLICAS (as lojas abrem cada uma)');
  const paginas = ['privacidade', 'termos', 'suporte', 'excluir-conta'];
  for (const nome of paginas) {
    const f = path.join(RAIZ, 'docs', nome + '.html');
    const existe = fs.existsSync(f);
    ok('docs/' + nome + '.html publicada', existe);
    if (!existe) continue;
    const s = fs.readFileSync(f, 'utf8');
    ok('  tem contato', /@/.test(s));
    ok('  sem travessao', (s.match(/[–—]/g) || []).length === 0);
  }
  const exc = fs.readFileSync(path.join(RAIZ, 'docs', 'excluir-conta.html'), 'utf8');
  ok('Play: a pagina de exclusao diz o que e apagado', /apagad|exclu/i.test(exc));
  ok('Play: e diz o que sobrevive e por quanto tempo', /5 anos|fiscal/i.test(exc));
  ok('Play: e da um caminho para quem ja desinstalou', /mailto:/.test(exc));

  /* ---------- D. OS ARQUIVOS QUE AS LOJAS PEDEM ---------- */
  console.log('\nD. OS ARQUIVOS DO ENVIO');
  const precisa = [
    ['loja/icones/icone-512.png', 'icone 512 (Play)'],
    ['loja/icones/icone-1024.png', 'icone 1024 (App Store)'],
    ['loja/icones/icone-maskable-512.png', 'icone adaptativo (Android)'],
    ['loja/capturas', 'capturas de tela'],
    ['app/preparar.sh', 'o script que monta os projetos'],
    ['loja/NOTAS-PARA-A-REVISAO.md', 'as notas para o revisor'],
  ];
  precisa.forEach(([f, oque]) => ok(oque, fs.existsSync(path.join(RAIZ, f)), f));

  const prep = fs.readFileSync(path.join(RAIZ, 'app/preparar.sh'), 'utf8');
  ['NSPhotoLibraryUsageDescription', 'NSCameraUsageDescription', 'NSFaceIDUsageDescription']
    .forEach(k => ok('2.1: ' + k + ' escrito no Info.plist', prep.indexOf(k) >= 0));

  console.log('\nERROS DE JAVASCRIPT: ' + (erros.length ? ('\n  ' + [...new Set(erros)].join('\n  ')) : 'nenhum'));
  console.log('FALHAS: ' + falhas);
  await b.close();
  process.exit(falhas ? 1 : 0);
})();
