/* =====================================================================
   OPERAÇÃO BLINDADA · service worker
   Só entra em cena na versão hospedada (PWA). Dentro do app empacotado
   pelo Capacitor os arquivos já moram no aparelho e este arquivo nem é
   registrado.

   A estratégia é rede primeiro, cache como rede de segurança:
   quem tem internet recebe sempre a versão nova do app (é um arquivo
   único, então "versão nova" é o arquivo inteiro), e quem está sem rede
   recebe a última que funcionou. O contrário (cache primeiro) deixaria
   a pessoa presa numa versão antiga sem ter como perceber.
   ===================================================================== */
const CACHE = 'operacao-blindada-v1';
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

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* o Supabase nunca passa pelo cache: dado de acesso e progresso tem que
     ser sempre o do servidor, senão o app mostraria um acesso que já caiu */
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r && r.status === 200 && r.type === 'basic') {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return r;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
  );
});
