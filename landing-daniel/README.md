# EEEEEEEITA Protagonista, Daniel

Landing page de página única (one-page) para o Daniel, treinador de **comunicação e vendas**,
marca **EEEEEEEITA Protagonista**. Rolagem contínua, navegação por âncoras e conversão via WhatsApp.

Design: pôster tipográfico escuro no hero, seções claras e arejadas, degradês magenta/violeta
extraídos da logo, botões pill com brilho e tipografia display pesada (Archivo + Manrope).
Sem placeholders de imagem: a página é 100% tipográfica e gráfica, pronta para publicar.

Entregue como **um único arquivo HTML autossuficiente**: CSS e JavaScript embutidos, sem build.

## Como rodar

Abra o `index.html` no navegador (clique duas vezes). Só isso.

> Observação: a página usa recursos externos apenas para as **fontes** (Google Fonts:
> Archivo e Manrope). Sem internet, o navegador cai em fontes do sistema e o layout
> continua funcionando.

## A logo original

O HTML procura automaticamente um arquivo chamado **`logo.png`** na **mesma pasta** do
`index.html` (header e rodapé, dentro de um cartão branco que protege a marca sobre o
fundo escuro).

- **Para usar a logo oficial, sem releitura:** salve o arquivo original da logo como
  `logo.png` ao lado do `index.html`. Pronto, nada mais a editar.
- **Se o arquivo não existir**, um desenho vetorial embutido entra no lugar apenas como
  reserva, para a página nunca ficar sem marca.
- Aceita PNG com fundo branco ou transparente. Se o seu arquivo for `.jpg` ou tiver outro
  nome, troque as duas ocorrências de `logo.png` no HTML.

## Estrutura da página (na ordem da rolagem)

1. Header fixo com logo, âncoras (Método, Sobre, Resultados, Contato) e botão de WhatsApp.
2. Hero tipográfico escuro com "Comunicar melhor para vender mais" e faixa de fatos
   (+1000 profissionais, método, atuação).
3. Ticker (marquee) com as mensagens da marca.
4. O que eu ensino: índice editorial com as seis frentes (destaque ao passar o mouse).
5. Método Venda Mais Agora, com os pilares clareza, conexão e resultado.
6. Sobre o Daniel: cartão de citação + história em primeira pessoa.
7. Resultados: número +1000 com contagem animada e selo de perfil verificado.
8. Contato: WhatsApp, Instagram e atuação, com cartão de conversão.
9. CTA final forte para o WhatsApp.
10. Rodapé com logo, âncoras e direitos.

Botão flutuante de WhatsApp fixo durante toda a rolagem.

## Como personalizar

Tudo fica no `index.html`, em blocos comentados (procure por `<!-- ===== SEÇÃO ===== -->`).

- **Número de WhatsApp:** altere a constante `WA_NUMBER` no início do `<script>`. Cada botão
  tem um `data-msg` com a mensagem pré-preenchida daquele contexto.
- **Cores:** ficam no bloco `:root` no início do `<style>` (paleta extraída da logo:
  magenta `#F0148E`, laranja `#F7941D`, amarelo `#FFC20E`, violeta, roxo, teal, texto em
  índigo `#241B4A`). Os degradês de acento são `--grad` (CTA) e `--grad-warm` (texto).
- **Textos:** edite direto nas tags, seção por seção.
- **Instagram:** os links apontam para `https://www.instagram.com/daniel.eita`.
- **Regra de estilo:** não use travessão (nem o traço longo, nem o traço médio) em nenhum
  texto. Prefira vírgula, ponto, dois-pontos ou parênteses.

## Acessibilidade, SEO e performance

- Contraste alto, `aria-label` em botões e ícones, navegação por teclado com foco visível
  e link "pular para o conteúdo".
- Respeita `prefers-reduced-motion` (desliga marquee, contagem e animações de rolagem).
- `title`, `meta description`, Open Graph e dados estruturados (JSON-LD).
- Arquivo único, sem framework: carregamento rápido.

## Licença de uso

Conteúdo e marca **EEEEEEEITA Protagonista** pertencem ao Daniel.
