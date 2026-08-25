// robots.txt e sitemap.xml montados na hora, a partir do domínio que o
// visitante pediu.
//
// Por que não são arquivo estático: os dois precisam de URL absoluta. Em
// arquivo, o domínio fica escrito na mão e vira dívida no dia em que ele
// mudar. Aqui o endereço certo é sempre o que o navegador acabou de usar.
//
// Endereço de teste (workers.dev) é barrado por completo: se o Google
// indexar a URL de teste, ela vira conteúdo duplicado competindo com o
// domínio de verdade.
const teste = (host) => host.endsWith(".workers.dev") || host.endsWith(".pages.dev");

const texto = (corpo, tipo) =>
  new Response(corpo, {
    headers: {
      "content-type": `${tipo}; charset=utf-8`,
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });

export function robots(url) {
  if (teste(url.hostname)) return texto("User-agent: *\nDisallow: /\n", "text/plain");

  return texto(
    `User-agent: *
Allow: /
Disallow: /sistema/

Sitemap: ${url.origin}/sitemap.xml
`,
    "text/plain",
  );
}

export function sitemap(url) {
  return texto(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url.origin}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
    "application/xml",
  );
}
