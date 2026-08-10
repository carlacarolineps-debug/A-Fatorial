/**
 * ESTILO, o padrão visual do sistema, servido pelo servidor.
 *
 * Pedido dela: "o padrão dos documentos precisa seguir o design padrão do
 * sistema". Antes cada página do servidor tinha desenho próprio, e o
 * cliente via duas empresas diferentes: uma no sistema, outra no
 * documento que chegava pelo WhatsApp.
 *
 * Aqui ficam os mesmos tokens e os mesmos componentes do index.html, um
 * lugar só, para o documento, o portal do cliente e a confirmação
 * falarem a mesma língua. Quando um valor mudar no sistema, muda aqui
 * também e as três páginas acompanham.
 *
 * Os valores são cópia dos do index.html, não aproximação:
 * === PADRAO === marca cada bloco que espelha o sistema.
 */

/* === PADRAO === o mesmo símbolo do index.html, para máscara CSS */
const SIMBOLO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 112 140'%3E%3Cpath fill-rule='evenodd' d='M14 86 a26 40 0 1 0 52 0 a26 40 0 1 0 -52 0 Z M30 81 a14 27 0 1 0 28 0 a14 27 0 1 0 -28 0 Z' transform='rotate(-20 40 86)'/%3E%3Cpath d='M58 6 C52 40 30 88 20 126 l6 2 C36 90 61 42 67 6 Z'/%3E%3Cpath d='M84 50 l9 1 -4 46 -7-1 Z'/%3E%3Ccircle cx='86' cy='110' r='6'/%3E%3Cpath d='M73.8 31.2C82 23 88 18 93.6 14.1l1.6 2.3C89.8 20.2 84 25 75.6 33.2Z'/%3E%3Cpath d='M110 4 88 13l7.6 2.8z' opacity='.5'/%3E%3Cpath d='M110 4 95.6 15.8l3.2 8.4z'/%3E%3C/svg%3E";

/* As mesmas fontes do sistema. Se a rede do cliente bloquear o Google, a
   pilha de reserva é a mesma do index.html e a página continua igual em
   estrutura, só muda o desenho da letra. */
const FONTES =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800' +
  '&family=Inter:wght@400;450;500;600;700&family=JetBrains+Mono:wght@500;600;700' +
  '&display=swap" rel="stylesheet">';

/* === PADRAO === cópia do :root do index.html */
const TOKENS =
  ':root{' +
  '--bg:#07070b;--bg-soft:#0f1016;--panel:#ffffff;--panel-soft:#f6f6f8;' +
  '--ink:#13131a;--ink-soft:#62626d;--ink-faint:#82828a;' +
  '--gold:#d4af5e;--gold-soft:#ecdcae;--gold-deep:#a8842f;--gold-bright:#f0d68a;' +
  /* dourado de superfície rende 2:1 sobre branco; este é o mesmo dourado
     fundo o bastante para ler como texto (4,9:1) */
  '--gold-txt:#7a5f16;' +
  '--line:#e9e9ee;--line-soft:#f1f1f4;' +
  '--ok:#1d8a5f;--ok-bg:#e7f5ee;--warn:#b5791a;--warn-bg:#fbf1de;' +
  '--bad:#bd3b3b;--bad-bg:#fbebeb;--info:#2f6dbf;--info-bg:#e9f1fb;' +
  '--r:16px;--r-sm:10px;--r-lg:22px;' +
  '--shadow:0 1px 2px rgba(15,16,22,.04),0 10px 30px -16px rgba(15,16,22,.16);' +
  '--shadow-lg:0 2px 6px rgba(15,16,22,.05),0 24px 60px -24px rgba(15,16,22,.28);' +
  "--font-display:'Sora',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" +
  "--font-body:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
  "--font-mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;" +
  '--dark-grad:linear-gradient(155deg,#0a0b10 0%,#11131c 48%,#181b27 100%);' +
  '--gold-grad:linear-gradient(135deg,var(--gold-bright),var(--gold) 45%,var(--gold-deep));' +
  '}';

/* === PADRAO === os componentes do sistema que estas páginas usam */
const BASE =
  '*{box-sizing:border-box;margin:0;padding:0}' +
  'body{font-family:var(--font-body);background:var(--panel-soft);color:var(--ink);' +
  'font-size:14px;line-height:1.6;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}' +
  'h1,h2,h3{font-family:var(--font-display);letter-spacing:-.02em;line-height:1.2}' +
  'a{color:var(--gold-txt)}' +

  /* a folha: o mesmo cartão do sistema, só que sozinho na página */
  '.folha{max-width:920px;margin:0 auto;padding:26px 22px 40px}' +
  '.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);' +
  'box-shadow:var(--shadow)}' +

  /* a ilha escura: o mesmo hero do portal do cliente */
  '.ilha{background:var(--dark-grad);border:1px solid rgba(255,255,255,.06);' +
  'border-radius:var(--r-lg);padding:32px 34px;color:#fff;position:relative;overflow:hidden;' +
  'box-shadow:0 30px 80px -40px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.05)}' +
  '.ilha::before{content:"";position:absolute;width:38rem;height:26rem;top:-16rem;left:-6rem;' +
  'pointer-events:none;background:radial-gradient(circle,rgba(212,175,94,.18),transparent 62%)}' +
  '.ilha::after{content:"";position:absolute;width:34rem;height:24rem;bottom:-16rem;right:-8rem;' +
  'pointer-events:none;background:radial-gradient(circle,rgba(90,130,220,.12),transparent 64%)}' +
  '.ilha>*{position:relative;z-index:1}' +
  '.ilha h1{font-size:clamp(26px,5vw,38px);font-weight:300;margin:16px 0 0}' +
  '.ilha h1 b{font-weight:600;background:var(--gold-grad);-webkit-background-clip:text;' +
  'background-clip:text;color:transparent}' +
  '.ilha .para{font:600 12px/1.5 var(--font-mono);letter-spacing:.11em;text-transform:uppercase;' +
  'color:var(--gold);margin-top:11px}' +

  /* o selo do topo da ilha, igual ao "ÁREA EXCLUSIVA DO CLIENTE" */
  '.selo{display:inline-flex;align-items:center;gap:9px;border:1px solid rgba(212,175,94,.35);' +
  'background:rgba(212,175,94,.10);border-radius:100px;padding:7px 15px 7px 11px;' +
  'font:600 11px/1 var(--font-mono);letter-spacing:.09em;text-transform:uppercase;color:var(--gold-soft)}' +
  '.selo i{width:15px;height:19px;flex:none;background:var(--gold-grad);' +
  '-webkit-mask:url("' + SIMBOLO + '") no-repeat center/contain;' +
  'mask:url("' + SIMBOLO + '") no-repeat center/contain}' +

  /* a régua de números da ilha */
  '.regua{display:flex;flex-wrap:wrap;gap:30px;margin-top:26px;padding-top:20px;' +
  'border-top:1px solid rgba(255,255,255,.09)}' +
  '.regua div{min-width:96px}' +
  '.regua b{display:block;font:600 19px/1.1 var(--font-display);color:var(--gold-soft)}' +
  '.regua span{display:block;font:600 10px/1.4 var(--font-body);letter-spacing:.09em;' +
  'text-transform:uppercase;color:#8e909c;margin-top:7px}' +

  /* === PADRAO === a esteira do sistema, com tdot e tline */
  '.esteira{background:linear-gradient(180deg,#fcfbf8,#fff);border:1px solid var(--line);' +
  'border-radius:var(--r-lg);padding:22px 24px;box-shadow:var(--shadow)}' +
  '.esteira-h{display:flex;align-items:center;gap:10px;font:600 11px/1 var(--font-body);' +
  'text-transform:uppercase;letter-spacing:1.2px;color:var(--ink);margin-bottom:20px}' +
  '.esteira-h .tag{background:var(--gold);color:#1a1408;padding:4px 10px;border-radius:20px;' +
  'font-size:10px;letter-spacing:.5px}' +
  '.track{display:flex;align-items:flex-start}' +
  '.tstep{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:82px;flex-shrink:0}' +
  '.tdot{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;' +
  'justify-content:center;font-weight:700;font-size:13px;border:2px solid var(--line);' +
  'background:#fff;color:var(--ink-faint)}' +
  '.tlabel{font:600 10px/1.3 var(--font-body);text-align:center;color:var(--ink-faint);max-width:96px}' +
  '.tlabel small{display:block;font-weight:500;font-family:var(--font-mono);font-size:9.5px;margin-top:3px}' +
  '.tline{height:2px;flex:1;min-width:18px;background:var(--line);margin:17px 1px 0}' +
  '.tline.done{background:var(--gold)}' +
  '.tstep.done .tdot{background:var(--gold);border-color:var(--gold);color:#1a1408}' +
  '.tstep.done .tlabel{color:var(--ink)}' +

  /* === PADRAO === botões */
  '.btn{padding:11px 18px;border-radius:var(--r-sm);font:600 13px var(--font-body);cursor:pointer;' +
  'border:1px solid transparent;transition:.18s;display:inline-flex;align-items:center;' +
  'justify-content:center;gap:7px;text-decoration:none}' +
  '.btn-gold{background:var(--gold);color:#1a1408;border-color:var(--gold)}' +
  '.btn-gold:hover{background:var(--gold-deep);border-color:var(--gold-deep);color:#fff}' +
  '.btn-ghost{background:var(--panel);color:var(--ink-soft);border-color:var(--line)}' +
  '.btn-ghost:hover{border-color:var(--gold);color:var(--ink)}' +
  '.btn-lim{background:none;border-color:transparent;color:var(--ink-faint)}' +
  '.btn-lim:hover{color:var(--ink)}' +

  /* === PADRAO === etiquetas de estado */
  '.pill{font:600 11px var(--font-body);padding:5px 11px;border-radius:20px;white-space:nowrap;' +
  'display:inline-flex;align-items:center;gap:5px}' +
  '.pill-ok{background:var(--ok-bg);color:var(--ok)}' +
  '.pill-warn{background:var(--warn-bg);color:var(--warn)}' +
  '.pill-info{background:var(--info-bg);color:var(--info)}' +
  '.pill-mute{background:var(--line-soft);color:var(--ink-soft)}' +

  /* === PADRAO === campo de entrada */
  '.inp{width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:var(--r-sm);' +
  'font:14px var(--font-body);background:var(--panel);color:var(--ink);outline:none;transition:.18s}' +
  '.inp:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,162,74,.12)}' +

  /* === PADRAO === tabela */
  '.tbl{width:100%;border-collapse:separate;border-spacing:0}' +
  '.tbl th{padding:12px 13px;text-align:left;font:600 10px var(--font-body);text-transform:uppercase;' +
  'letter-spacing:1px;color:var(--ink-soft);border-bottom:1px solid var(--ink)}' +
  '.tbl td{padding:12px 13px;border-bottom:1px solid var(--line);font-size:13px;vertical-align:middle}' +

  '.rodape{font:12px/1.7 var(--font-body);color:var(--ink-faint);padding:20px 4px 0;text-align:center}' +
  '.rodape b{color:var(--ink-soft);font-weight:600}' +
  '.rodape a{color:var(--gold-txt);font-weight:600}' +

  /* No celular a régua com cinco números empilhava e tomava a tela toda
     antes de o cliente ver um documento sequer. Vira uma faixa que
     desliza de lado, como as fitas de indicador do sistema. */
  '@media(max-width:620px){' +
  '.folha{padding:16px 12px 30px}.ilha{padding:22px 18px;border-radius:var(--r)}' +
  '.esteira{padding:18px 14px;border-radius:var(--r)}' +
  '.selo{font-size:10px;padding:6px 12px 6px 9px}' +
  '.regua{flex-wrap:nowrap;overflow-x:auto;gap:22px;margin-top:20px;padding-bottom:4px;' +
  'scrollbar-width:none}.regua::-webkit-scrollbar{display:none}' +
  '.regua div{min-width:auto;flex:none}.regua b{font-size:17px}}';

/** O <head> inteiro: fontes do sistema, tokens e componentes, mais o que a página pedir. */
function cabeca(titulo, extra) {
  return '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="theme-color" content="#0a0b10">' +
    '<meta name="robots" content="noindex,nofollow,noarchive">' +
    '<title>' + titulo + '</title>' + FONTES +
    '<style>' + TOKENS + BASE + (extra || '') + '</style>';
}

/** O selo da marca, o mesmo do topo do portal do cliente. */
function selo(texto) {
  return '<div class="selo"><i></i>' + (texto || 'Grupo A! Fatorial') + '</div>';
}

module.exports = { cabeca, selo, SIMBOLO, TOKENS, BASE, FONTES };
