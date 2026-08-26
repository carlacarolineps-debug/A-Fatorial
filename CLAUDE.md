# Ideia Que Vende / A! Fatorial

Dois sites num projeto só, publicados como um Worker da Cloudflare.

    public/index.html          landing pública       (~310 KB, gerado)
    public/sistema/index.html  sistema de gestão     (~720 KB, escrito à mão)
    src/                       rotas do servidor
    fonte/                     de onde a landing é gerada

**Estado da publicação: leia o `DEPLOY.md`.** Ele começa com um bloco
"Onde estamos" com o que já funciona, o que falta e em que ordem.

Branch de trabalho: `claude/animated-shader-hero-thcafz`

## Regras que valem sempre

**Não altere nada no Supabase.** Existe outro projeto sendo feito lá, de
outra pessoa. As ferramentas do Supabase podem estar disponíveis nesta
sessão; não é permissão. Só mexa se a Carla pedir explicitamente.

**Nada de travessão no site.** A Carla pediu que o caractere `—` não
apareça em texto nenhum da landing. Use vírgula, dois-pontos ou ponto.

**Escreva em português.** Comentários no código, mensagens de commit e
documentação. O código deste repositório é lido por quem toca o negócio,
não só por quem programa.

## A landing não se edita direto

`public/index.html` é **gerado**. As duas fontes, o logotipo e o favicon
entram embutidos em base64, e é por isso que o arquivo tem 300 KB e não
faz nenhuma requisição a terceiros.

Para mudar a landing, edite `fonte/page.tpl.html` e rode:

```sh
cd fonte && python3 build.py
```

Editar o `public/index.html` na mão funciona uma vez e se perde no build
seguinte.

O `fonte/mklogo.py` reconstrói o logotipo horizontal a partir da arte
original. Só é necessário se a marca mudar.

## O sistema é diferente

`public/sistema/index.html` é um arquivo único de verdade, escrito à mão,
sem build. Toda a informação vive em `localStorage` (`af_fin`,
`af_usuarios`, `af_permissoes`, `af_plano`, `af_brand`…) e não há nenhuma
chamada de rede. Consequência prática: **os dados são por navegador**.
Duas pessoas abrindo o sistema veem coisas diferentes.

É por isso que o Typeform não entrega direto nele. As respostas caem no
banco D1, pela rota `/typeform`, e a rota `/leads` devolve para quem
estiver autenticado. A tela que lê `/leads` dentro do sistema ainda não
existe.

## Testes

```sh
npm test
```

Sobe o wrangler local, bate nas rotas por HTTP e derruba o servidor. São
28 verificações, entre elas que corpo adulterado depois de assinar é
recusado e que reenvio do Typeform atualiza o lead em vez de duplicar.
Roda no banco local; não encosta em produção.

Antes de qualquer push que mexa em `src/` ou `wrangler.toml`, rode.

## Cuidados no que já está de pé

- O nome em `wrangler.toml` (`a-fatorial`) tem que continuar igual ao do
  Worker no painel. Diferente, o build falha ou nasce um segundo Worker
  sem domínio.
- `TYPEFORM_WEBHOOK_SECRET` é secret do painel, nunca do repositório.
- `TEAM_DOMAIN` e `ACCESS_AUD` vazios fazem `/leads` responder 503 de
  propósito. Não "conserte" isso deixando passar.
