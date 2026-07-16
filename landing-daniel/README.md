# EEEEEEEITA Protagonista, Daniel

Landing page de página única (one-page) para o Daniel, treinador de **comunicação e vendas**,
marca **EEEEEEEITA Protagonista**. Rolagem contínua, navegação por âncoras e conversão via WhatsApp.

Feita com **HTML + Tailwind CSS + JavaScript puro**, sem etapa de build obrigatória.

## Como rodar localmente

O jeito mais simples: abra o arquivo `index.html` no navegador (clique duas vezes).

Para uma experiência idêntica à de produção (evita bloqueios do navegador com arquivos locais),
suba um servidor estático a partir da pasta `landing-daniel`:

~~~bash
# opção 1, com Python 3
python3 -m http.server 8080

# opção 2, com Node
npx serve .
~~~

Depois acesse `http://localhost:8080` no navegador.

## Estrutura de arquivos

~~~
landing-daniel/
├── index.html                 # a página inteira (todas as seções)
├── README.md                  # este arquivo
└── assets/
    ├── css/
    │   └── styles.css         # tema, tipografia e todo o estilo editorial
    ├── js/
    │   └── main.js            # WhatsApp, menu, scrollspy, animações, newsletter
    └── img/
        ├── logo.svg           # logo da marca (cérebro + wordmark)
        └── favicon.svg        # ícone da aba (cérebro da marca)
~~~

### Seções (na ordem da rolagem)

1. Header fixo com logo, menu de âncoras e botão de WhatsApp.
2. Hero com headline "Comunicar melhor para vender mais".
3. O que eu ensino (grid editorial assimétrico com seis frentes).
4. Método **Venda Mais Agora** (faixa de destaque com os pilares clareza, conexão e resultado).
5. Sobre o Daniel (storytelling em primeira pessoa).
6. Resultados e prova social (número +1000, depoimentos, turmas, selo verificado).
7. Feed do Instagram (galeria com link para @daniel.eita).
8. Contato (WhatsApp, Instagram, atuação no ABC e São Paulo).
9. CTA final + captura de e-mail (newsletter).
10. Rodapé (logo, redes, âncoras, direitos).

Além disso, há um botão flutuante de WhatsApp fixo durante toda a rolagem.

## Como personalizar

### 1. Logo e favicon

> **Importante:** os arquivos `assets/img/logo.svg` e `assets/img/favicon.svg` são um
> **placeholder fiel** da marca (cérebro colorido + wordmark). Substitua pelo arquivo
> **oficial** do Daniel.

Duas formas:

- **Manter o SVG:** cole o conteúdo do SVG oficial dentro de `assets/img/logo.svg`
  (e do ícone em `favicon.svg`), sem mudar os nomes.
- **Usar PNG:** coloque `logo.png` na pasta `assets/img/` e troque a referência no
  `index.html` (procure por `assets/img/logo.svg` e aponte para o novo arquivo).
  A logo aparece em dois lugares: no header e no rodapé.

### 2. Fotos e imagens

Cada slot de imagem é um bloco `<figure class="photo" ...>` que mostra, em texto, a
**foto ideal** daquele espaço (ex.: "foto do Daniel de blazer, fundo neutro"). Para usar
uma foto real, escolha uma das opções:

**Opção A, trocar por uma tag de imagem (recomendado):**

~~~html
<figure class="photo photo--portrait">
  <img src="assets/img/daniel-hero.jpg"
       alt="Daniel de blazer em fundo neutro"
       loading="lazy">
</figure>
~~~

**Opção B, usar imagem de fundo:**

~~~html
<figure class="photo photo--portrait"
        style="background-image:url('assets/img/daniel-hero.jpg')"
        role="img" aria-label="Daniel de blazer em fundo neutro">
</figure>
~~~

(nesse caso, apague o `<span class="photo__note">...</span>` de dentro do bloco).

As proporções disponíveis são as classes `photo--portrait` (4:5), `photo--landscape` (4:3)
e `photo--square` (1:1). Sempre preencha o `alt` das imagens (acessibilidade e SEO).

### 3. Textos, títulos e depoimentos

Todo o conteúdo fica direto no `index.html`, em português e comentado por seção.

- **Textos e títulos:** edite o texto dentro das tags. Cada seção tem um comentário
  `<!-- ... -->` indicando o que é.
- **Depoimentos:** procure por `class="depo"`. Cada card tem a frase (`depo__text`), as
  iniciais do avatar (`depo__ava`), o nome (`depo__name`) e o cargo/cidade (`depo__role`).
  Para adicionar outro, duplique um bloco `<figure class="depo">...</figure>`.
- **O que eu ensino:** procure por `class="teach__item"`. São seis blocos numerados.
- **Regra de estilo:** não use travessão (nem o traço longo, nem o traço médio) em nenhum
  texto. Prefira vírgula, ponto, dois-pontos ou parênteses.

### 4. Cores do tema

As cores foram extraídas da logo e ficam em **um único lugar**: o bloco `:root` no topo de
`assets/css/styles.css`. Mude ali e a página inteira acompanha.

~~~css
:root{
  --cream:      #FBF7F1;  /* fundo principal */
  --ink:        #241B2E;  /* texto (grafite) */
  --brand:      #6D2A8C;  /* roxo/magenta, cor primária de marca */
  --orange:     #EE7A22;  /* laranja, cor de CTA/ação */
  --magenta:    #E11D74;  /* destaque */
  --yellow:     #F4C020;
  --teal:       #159C97;
  /* ... */
}
~~~

As mesmas cores estão espelhadas na configuração do Tailwind (dentro do `index.html`,
no bloco `tailwind.config`), caso você use utilitários do Tailwind em novos elementos.

### 5. Número de WhatsApp e mensagens

O número fica em **um lugar central**: a constante `WA_NUMBER` no topo de `assets/js/main.js`.

~~~js
var WA_NUMBER = '5511980291196'; // formato internacional, só dígitos
~~~

Cada botão de WhatsApp tem a classe `js-wa` e um atributo `data-msg` com a mensagem
pré-preenchida daquele contexto. O JavaScript monta o link final
(`https://wa.me/NUMERO?text=MENSAGEM`). Para mudar uma mensagem, edite o `data-msg` do botão.
Se o JavaScript não carregar, o `href` básico já leva ao WhatsApp mesmo assim.

### 6. Instagram

Os links apontam para `https://www.instagram.com/daniel.eita`. Faça um "localizar e
substituir" caso o usuário mude.

### 7. Newsletter (captura de e-mail)

Hoje o formulário valida o e-mail e mostra uma confirmação, **sem enviar para lugar nenhum**.
Para integrar a um serviço real (Mailchimp, Brevo, RD Station etc.), edite a função
`newsletter()` em `assets/js/main.js`, no ponto marcado com o comentário
"Aqui entraria o envio real". Basta fazer um `fetch` para o endpoint do seu serviço.

## Acessibilidade

- Contraste alto entre texto e fundo.
- `alt` e `aria-label` em imagens, ícones e botões.
- Navegação por teclado, com foco visível e link "pular para o conteúdo".
- Respeita `prefers-reduced-motion` (desliga animações para quem prefere menos movimento).

## SEO e performance

- `title`, `meta description`, Open Graph, Twitter Card e dados estruturados (JSON-LD).
- Imagens reais devem usar `loading="lazy"` (já indicado nos exemplos acima).
- Tipografia carregada com `preconnect` para acelerar.

### Sobre o Tailwind em produção

Esta entrega usa o **Tailwind via CDN** (`cdn.tailwindcss.com`) para simplicidade, sem
build. Ele exibe um aviso no console e não é o ideal para produção. Para publicar com
performance máxima, compile o Tailwind gerando um CSS enxuto:

~~~bash
npm install -D tailwindcss
npx tailwindcss -i ./assets/css/tailwind-input.css -o ./assets/css/tailwind.css --minify
~~~

Depois troque, no `index.html`, o `<script src="https://cdn.tailwindcss.com">` e o bloco
`tailwind.config` por `<link rel="stylesheet" href="assets/css/tailwind.css">`.
O arquivo `assets/css/styles.css` (que carrega quase todo o visual) continua igual.

## Licença de uso

Conteúdo e marca **EEEEEEEITA Protagonista** pertencem ao Daniel. Depoimentos, turmas e
imagens são fictícios ou placeholders e devem ser substituídos por material real antes de
publicar.
