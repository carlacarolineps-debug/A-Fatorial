# Site Sheilóka — moda feminina (Mauá - SP)

Site de página única, pronto para apresentar e vender. Um único arquivo
(`index.html`), sem instalação. É só abrir no navegador (ou hospedar) que funciona.

## Como ver
- Dê duplo clique em `sheiloka/index.html` (abre no navegador), **ou**
- Hospede gratuitamente (GitHub Pages, Netlify, Vercel) arrastando a pasta.

## O que já está incluído
- **Identidade da marca**: paleta marrom/vinho/creme/dourado e monograma **SK**,
  inspirados no feed do Instagram.
- **Seções**: topo (hero) com nota 5,0 ★, faixa rolante, Sobre, Categorias
  (Looks, Bolsas, Folheados, Cintos, Óculos, Vitrine da Semana), Vitrine de
  produtos, Diferenciais, Avaliações reais do Google, grade do Instagram,
  Contato com **mapa do Google** e horário, CTA final e rodapé.
- **Botão flutuante de WhatsApp** e vários botões já apontando para
  **(11) 95079-1324** com mensagem pré-pronta.
- **Responsivo** (celular/tablet/desktop), menu mobile e animações de scroll.
- **SEO/compartilhamento** (título, descrição e Open Graph para WhatsApp).

## O que personalizar (rápido)
1. **Fotos reais** — hoje há "placeholders" com o monograma SK. Coloque as
   fotos da loja na pasta `sheiloka/img/` e troque os blocos:
   - Hero: o `.frame` (foto da vitrine / look da semana).
   - Vitrine: as 4 `.card .thumb` (foto, nome, preço reais).
   - Instagram: as 6 `.ig` (prints dos posts).
   Para usar uma imagem, troque o bloco do `SK` por:
   `<img src="img/nome-da-foto.jpg" alt="descrição" style="width:100%;height:100%;object-fit:cover">`
2. **Horário de funcionamento** — confira/edite na seção "Contato"
   (procure por `class="hours"`).
3. **Preços e nomes dos produtos** — na seção "Vitrine" (`class="prods"`).
4. **Logo oficial** — se tiver o arquivo do logo, substitua o `.monogram` (sk)
   no cabeçalho e no rodapé por `<img>`.

## Dados usados (confira se mudou)
- Telefone/WhatsApp: **(11) 95079-1324**
- Endereço: **R. Campos Sales, 357 — Vila Bocaina, Mauá - SP, 09310-040**
- Instagram: **@sheilokaacessorios_**
- Avaliação: **5,0 ★ no Google (143 avaliações)** · 5/5 no Facebook
