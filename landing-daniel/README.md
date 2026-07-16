# EEEEEEEITA Protagonista, Daniel

Landing page de página única (one-page) para o Daniel, treinador de **comunicação e vendas**,
marca **EEEEEEEITA Protagonista**. Rolagem contínua, navegação por âncoras e conversão via WhatsApp.

Direção visual: **pôster editorial ousado** (hero escuro dramático, tipografia gigante,
marquee, imagens em duotone) com acabamento **sexy e moderno**: degradês magenta/violeta
extraídos da logo, botões pill com brilho, cantos arredondados e tipografia display pesada
(Archivo + Manrope), sem serifa.

Entregue como **um único arquivo HTML autossuficiente**: todo o CSS, o JavaScript e a logo
estão embutidos no próprio `index.html`. Não há build, dependências locais nem pasta de assets.

## Como rodar

Abra o `index.html` no navegador (clique duas vezes). Só isso.

Para uma prévia igual à de produção, você pode subir um servidor estático na pasta:

~~~bash
python3 -m http.server 8080     # ou: npx serve .
~~~

E acessar `http://localhost:8080`.

> Observação: a página usa recursos externos apenas para as **fontes** (Google Fonts:
> Archivo e Manrope). Com internet, elas carregam automaticamente. Sem internet, o navegador
> cai em fontes do sistema e o layout continua funcionando.

## Estrutura

~~~
landing-daniel/
├── index.html     # a página inteira (HTML + CSS + JS + logo, tudo embutido)
└── README.md      # este arquivo
~~~

### Seções (na ordem da rolagem)

1. Header fixo com logo, menu de âncoras e botão de WhatsApp (com scrollspy da seção ativa).
2. Hero escuro em formato pôster, com a headline "Comunicar melhor para vender mais".
3. Ticker (marquee) reforçando as mensagens da marca.
4. O que eu ensino: índice editorial com as seis frentes (efeito de destaque ao passar o mouse).
5. Método **Venda Mais Agora**, faixa escura com os pilares clareza, conexão e resultado.
6. Sobre o Daniel: storytelling em primeira pessoa, com retrato em duotone.
7. Resultados: número +1000 (com contagem animada), depoimentos e turmas, selo verificado.
8. Feed do Instagram: galeria em duotone com link para @daniel.eita.
9. Contato: WhatsApp, Instagram e atuação no ABC e São Paulo.
10. CTA final com captura de e-mail (newsletter) e o rodapé.

Há ainda um botão flutuante de WhatsApp fixo durante toda a rolagem e um indicador lateral
de seção que acompanha o scroll.

## Como personalizar

Tudo fica no `index.html`, dividido em blocos comentados. Procure pelo comentário da seção
que quer mexer (por exemplo, `<!-- ===== 04 SOBRE ===== -->`).

### 1. Logo e favicon

> **Importante:** a logo foi **recriada fielmente em SVG** a partir da imagem oficial
> (nuvem-cérebro com lóbulos em degradê rosa, laranja, amarelo, roxo e teal, com a cauda,
> e o wordmark itálico pesado), porque o arquivo original não estava disponível. Se tiver
> o arquivo **oficial** do Daniel, prefira substituir.

- **Logo:** ela aparece em dois lugares no HTML, dentro de `<svg viewBox="0 0 330 92" ...>`
  (no header e no rodapé). Você pode colar o SVG oficial no lugar, ou trocar o `<svg>` por
  uma imagem: `<img src="logo.svg" alt="EEEEEEEITA Protagonista" style="height:42px">`
  (nesse caso o arquivo deixa de ser único). O wordmark usa `fill="currentColor"` para se
  adaptar entre o fundo escuro (off-white) e o claro (índigo).
- **Favicon:** está no `<link rel="icon" ...>` como um SVG embutido. Para usar o ícone
  oficial, troque por `<link rel="icon" href="favicon.png">`.

### 2. Fotos e imagens

Cada slot de imagem é um bloco `<figure class="plate ...">` que aplica um tratamento de
**duotone com halftone** e mostra, em texto, a foto ideal daquele espaço. Para usar uma foto
real, adicione uma tag de imagem dentro do `figure`, com a classe `plate__img`:

~~~html
<figure class="plate p23">
  <img class="plate__img" src="daniel-hero.jpg" alt="Daniel de blazer em fundo neutro" loading="lazy">
  <span class="cap"><b>Retrato</b><span>Daniel de blazer, fundo neutro</span></span>
</figure>
~~~

A imagem entra automaticamente em duotone rosa/violeta (via `mix-blend-mode`), mantendo a
identidade. Se quiser a foto sem tratamento, remova o filtro da regra `.plate__img` no CSS.
As proporções disponíveis são as classes `p45` (4:5), `p23` (2:3), `p43` (4:3) e `p11` (1:1).
Sempre preencha o `alt` das imagens.

### 3. Textos, títulos e depoimentos

- **Textos e títulos:** edite diretamente dentro das tags, seção por seção.
- **Depoimentos:** procure por `class="quote"`. Cada um tem a frase (`<blockquote>`) e a
  autoria (`<figcaption class="who">` com nome em negrito, cargo e cidade). Para adicionar
  outro, duplique um bloco `<figure class="quote">...</figure>`.
- **O que eu ensino:** procure por `class="idx__row"`. São seis linhas numeradas.
- **Regra de estilo:** não use travessão (nem o traço longo, nem o traço médio). Prefira
  vírgula, ponto, dois-pontos ou parênteses.

### 4. Cores do tema

As cores extraídas da logo ficam em **um único lugar**: o bloco `:root` no início da `<style>`.
Mude ali e a página inteira acompanha.

~~~css
:root{
  --paper:#FBF7F2;    /* fundo claro (off-white) */
  --ink:#241B4A;      /* texto (índigo profundo, a cor do wordmark) */
  --dark:#150F26;     /* fundos escuros (hero, faixas, rodapé) */
  --magenta:#F0148E;  /* cor primária de marca */
  --orange:#F7941D;   /* acento quente */
  --violet:#8F2E9B;  --purple:#552383;  --yellow:#FFC20E;  --teal:#00A79D;
  --grad:linear-gradient(94deg,var(--magenta),var(--violet));      /* CTA */
  --grad-warm:linear-gradient(94deg,var(--magenta),var(--orange)); /* texto display */
}
~~~

### 5. Número de WhatsApp e mensagens

O número fica em **um lugar central**: a constante `WA_NUMBER` no início do `<script>`.

~~~js
var WA_NUMBER = '5511980291196'; // formato internacional, só dígitos
~~~

Cada botão de WhatsApp tem a classe `wa-link` e um atributo `data-msg` com a mensagem
pré-preenchida daquele contexto. O JavaScript monta o link final. Se o JS não carregar, o
`href` básico já leva ao WhatsApp mesmo assim.

### 6. Instagram e newsletter

- **Instagram:** os links apontam para `https://www.instagram.com/daniel.eita`. Use localizar
  e substituir caso mude.
- **Newsletter:** hoje o formulário valida o e-mail e mostra uma confirmação, **sem enviar a
  lugar nenhum**. Para integrar a um serviço real (Mailchimp, Brevo, RD Station etc.), edite a
  função `newsletter()` no `<script>`, no ponto marcado com o comentário
  "Aqui entraria o envio real".

## Acessibilidade, SEO e performance

- Contraste alto, `alt` e `aria-label` em imagens, ícones e botões, navegação por teclado
  com foco visível e link "pular para o conteúdo".
- Respeita `prefers-reduced-motion` (desliga marquee, contagem e animações de rolagem).
- `title`, `meta description`, Open Graph e dados estruturados (JSON-LD).
- Arquivo único, sem framework: carregamento rápido. Imagens reais devem usar `loading="lazy"`.

## Licença de uso

Conteúdo e marca **EEEEEEEITA Protagonista** pertencem ao Daniel. Depoimentos, turmas e
imagens são fictícios ou placeholders e devem ser substituídos por material real antes de
publicar.
