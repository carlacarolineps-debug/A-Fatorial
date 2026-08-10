/* =====================================================================
   OPERAÇÃO BLINDADA · service worker
   Só entra em cena na versão hospedada (PWA). Dentro do app empacotado
   pelo Capacitor os arquivos já moram no aparelho e este arquivo nem é
   registrado.

   ESTRATÉGIA: guardado primeiro, e confere por trás.

   A versão anterior era rede primeiro, e o raciocínio parecia certo: quem
   tem internet recebe sempre a versão nova. O custo, porém, caía todo dia
   em cima de quem usa: o app é UM arquivo de mais de 2 MB, então toda
   abertura esperava esse arquivo descer antes de pintar qualquer coisa.
   Num celular com sinal ruim isso é a diferença entre abrir na hora e
   olhar para uma tela branca.

   Agora o arquivo guardado responde na hora, e a conferência acontece por
   trás. Quando chega versão nova, o app é avisado (mensagem 'nova-versao')
   e oferece atualizar. Ninguém fica preso numa versão antiga sem saber:
   essa era a única razão de ser da estratégia anterior, e ela continua
   atendida, só que sem cobrar a espera de quem abre.
   ===================================================================== */
const CACHE = 'operacao-blindada-v2';
const ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  './icones/icone-192.png',
  './icones/icone-512.png',
  './icones/favicon-64.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      /* addAll falha inteiro se um item falhar: aqui cada um por si */
      .then((c) => Promise.all(ESSENCIAIS.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* a marca que diz se o arquivo mudou. ETag quando o servidor manda (o
   GitHub Pages manda), tamanho como reserva */
function marca(r) {
  if (!r) return '';
  return r.headers.get('etag') || r.headers.get('content-length') || '';
}

async function avisarNovaVersao() {
  const cs = await self.clients.matchAll({ type: 'window' });
  cs.forEach((c) => c.postMessage({ tipo: 'nova-versao' }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* o Supabase nunca passa pelo cache: dado de acesso e progresso tem que
     ser sempre o do servidor, senão o app mostraria um acesso que já caiu */
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(req, { ignoreSearch: true });

    /* a busca por trás: atualiza o guardado e avisa se mudou de verdade */
    const porTras = fetch(req).then((r) => {
      if (r && r.status === 200 && r.type === 'basic') {
        const mudou = guardado && marca(guardado) && marca(r) && marca(guardado) !== marca(r);
        cache.put(req, r.clone()).catch(() => {});
        if (mudou) avisarNovaVersao();
      }
      return r;
    }).catch(() => null);

    /* tem guardado: responde na hora e deixa a conferência correr sozinha */
    if (guardado) { e.waitUntil(porTras); return guardado; }

    /* primeira vez neste aparelho: aí sim espera a rede */
    const daRede = await porTras;
    return daRede || (await cache.match('./index.html')) ||
      new Response('sem conexao', { status: 503, headers: { 'content-type': 'text/plain' } });
  })());
});
