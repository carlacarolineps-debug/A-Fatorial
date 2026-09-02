// Peças usadas pelas duas rotas.

// Resposta do Worker nao passa pelo _headers (que so vale para arquivo
// estatico), entao os cabecalhos de seguranca vao na mao aqui.
export const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
  });
