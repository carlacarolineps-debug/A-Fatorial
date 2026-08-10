/**
 * CURRÍCULO QUE NÃO VIRA ARQUIVO NO COMPUTADOR DE NINGUÉM
 *
 * Mesma regra dos documentos de cliente, pelo mesmo motivo: currículo é
 * dado pessoal de gente que confiou na empresa, e arquivo baixado é
 * arquivo esquecido numa pasta qualquer.
 *
 *   A PESSOA envia uma vez, no cadastro, sem precisar de conta.
 *   A DONA abre pelo endereço, com o nome dela carimbado no registro.
 *   NINGUÉM baixa: não existe rota de download.
 *
 * PDF, DOC, DOCX, PNG e JPG até 6 MB. Nada de executável, nada de HTML:
 * arquivo que o navegador executa vira porta de entrada, e o próprio
 * servidor o entrega com Content-Disposition inline só para os tipos
 * que sabe desenhar.
 *
 * LGPD: o currículo tem prazo. Passados 12 meses sem virar contrato, o
 * arquivo é apagado sozinho, porque guardar dado sem finalidade é o
 * erro mais comum e o mais fácil de evitar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = process.env.DADOS_DIR || path.join(__dirname, 'dados');
const PASTA = path.join(DIR, 'curriculos');
const ARQ = path.join(DIR, 'curriculos.json');

let C = { itens: {}, seq: 1 };
try {
  fs.mkdirSync(PASTA, { recursive: true });
  if (fs.existsSync(ARQ)) C = Object.assign(C, JSON.parse(fs.readFileSync(ARQ, 'utf8')));
} catch (e) {}

let adiado = null;
function agora() { if (adiado) { clearTimeout(adiado); adiado = null; }
  try { fs.writeFileSync(ARQ, JSON.stringify(C)); } catch (e) {} }
function salvar() { if (adiado) return; adiado = setTimeout(() => { adiado = null; agora(); }, 300); }

const DIA = 24 * 3600e3;
const GUARDA = 365 * DIA;                 // o prazo da LGPD que a tela promete
const TETO = 6 * 1024 * 1024;             // 6 MB

/* Só o que a dona precisa ler, e nada que o navegador execute. */
const TIPOS = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/png': '.png',
  'image/jpeg': '.jpg'
};
/* A assinatura do arquivo vale mais do que o que o navegador diz que
   ele é: renomear .exe para .pdf engana o tipo declarado, não os
   primeiros bytes. */
const ASSINATURAS = [
  { t: 'application/pdf', b: [0x25, 0x50, 0x44, 0x46] },                       // %PDF
  { t: 'image/png',       b: [0x89, 0x50, 0x4E, 0x47] },                       // .PNG
  { t: 'image/jpeg',      b: [0xFF, 0xD8, 0xFF] },
  { t: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    b: [0x50, 0x4B, 0x03, 0x04] },                                            // zip, o docx é zip
  { t: 'application/msword', b: [0xD0, 0xCF, 0x11, 0xE0] }                     // OLE2
];
function tipoReal(buf) {
  const a = ASSINATURAS.find(x => x.b.every((v, i) => buf[i] === v));
  return a ? a.t : '';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Apaga o que passou do prazo. Roda na varredura do servidor. */
function varrer() {
  const corte = Date.now() - GUARDA;
  let apagados = 0;
  Object.keys(C.itens).forEach(id => {
    const it = C.itens[id];
    if (it.guardar) return;                         // virou contrato, fica
    if (new Date(it.em).getTime() > corte) return;
    try { fs.unlinkSync(path.join(PASTA, it.arquivo)); } catch (e) {}
    delete C.itens[id]; apagados++;
  });
  if (apagados) { salvar(); console.log('[curriculos] ' + apagados + ' apagado(s) por prazo'); }
  return apagados;
}

function montar(app, dep) {
  const { exigeLogin, talvezLogin, registrar } = dep;

  /* ── a pessoa envia, sem conta ──
     Vem em JSON com o arquivo em base64, e não em multipart, porque o
     cadastro é uma página só e mandar JSON não exige biblioteca nenhuma
     dos dois lados. */
  app.post('/cv', async (req, res) => {
    const { candidatoId, nome, arquivo, tipo, dados } = req.body || {};
    if (!candidatoId || !dados) return res.status(400).json({ ok: false, erro: 'faltam_dados' });

    let buf;
    try { buf = Buffer.from(String(dados).replace(/^data:[^,]+,/, ''), 'base64'); }
    catch (e) { return res.status(400).json({ ok: false, erro: 'base64_invalido' }); }

    if (!buf.length) return res.status(400).json({ ok: false, erro: 'arquivo_vazio' });
    if (buf.length > TETO) return res.status(413).json({ ok: false, erro: 'arquivo_grande',
      detalhe: 'O limite é 6 MB. Comprima o PDF ou mande só as páginas que importam.' });

    const real = tipoReal(buf);
    if (!real || !TIPOS[real]) return res.status(415).json({ ok: false, erro: 'tipo_nao_aceito',
      detalhe: 'Aceitamos PDF, DOC, DOCX, PNG e JPG. O arquivo enviado não é nenhum deles.' });
    /* declarado diferente do real é sinal de arquivo renomeado */
    if (tipo && TIPOS[tipo] && tipo !== real && !(real.indexOf('openxml') >= 0 && tipo.indexOf('openxml') >= 0)) {
      return res.status(415).json({ ok: false, erro: 'tipo_divergente',
        detalhe: 'O conteúdo do arquivo não corresponde à extensão dele.' });
    }

    const id = 'CV-' + (C.seq++).toString(36) + crypto.randomBytes(3).toString('hex');
    const nomeArq = id + TIPOS[real];
    try { fs.writeFileSync(path.join(PASTA, nomeArq), buf); }
    catch (e) { return res.status(500).json({ ok: false, erro: 'nao_gravou' }); }

    /* um candidato só tem um currículo: reenviar troca, e o velho sai */
    Object.keys(C.itens).forEach(k => {
      if (C.itens[k].candidatoId === candidatoId) {
        try { fs.unlinkSync(path.join(PASTA, C.itens[k].arquivo)); } catch (e) {}
        delete C.itens[k];
      }
    });

    C.itens[id] = { id, candidatoId, nome: String(nome || '').slice(0, 120),
      original: String(arquivo || '').slice(0, 160), tipo: real, arquivo: nomeArq,
      bytes: buf.length, em: new Date().toISOString(), aberturas: [] };
    salvar();
    res.json({ ok: true, cv: { id, tipo: real, bytes: buf.length } });
  });

  /* ── a dona abre ──
     Inline, nunca como anexo: o navegador desenha e nada fica no disco
     de quem leu. */
  app.get('/cv/:id', talvezLogin, (req, res) => {
    const it = C.itens[req.params.id];
    if (!it) return res.status(404).send('Currículo não encontrado ou já apagado pelo prazo.');
    if (!req.eu) return res.status(401).send('Só a equipe vê currículo.');
    it.aberturas.push({ em: new Date().toISOString(), quem: req.eu.nome, uid: req.eu.id });
    salvar();
    if (registrar) registrar(req, req.eu, { acao: 'curriculo.ver', col: 'talentos',
                                            alvo: it.candidatoId, obs: it.nome });
    let corpo;
    try { corpo = fs.readFileSync(path.join(PASTA, it.arquivo)); }
    catch (e) { return res.status(410).send('O arquivo não está mais no servidor.'); }
    res.set('Content-Type', it.tipo);
    res.set('Content-Disposition', 'inline; filename="curriculo"');
    res.set('Content-Security-Policy', "default-src 'none'; object-src 'none'");
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store');
    res.send(corpo);
  });

  /* ── o que existe de currículo, para a tela dela montar o link ── */
  app.get('/cv', exigeLogin, (_req, res) => {
    res.json({ ok: true, itens: Object.values(C.itens).map(x => ({
      id: x.id, candidatoId: x.candidatoId, tipo: x.tipo, bytes: x.bytes,
      em: x.em, original: x.original, aberturas: x.aberturas.length
    })) });
  });

  /* ── apagar a pedido da pessoa, que é direito dela pela LGPD ── */
  app.delete('/cv/:id', exigeLogin, (req, res) => {
    const it = C.itens[req.params.id];
    if (!it) return res.status(404).json({ ok: false });
    try { fs.unlinkSync(path.join(PASTA, it.arquivo)); } catch (e) {}
    delete C.itens[req.params.id]; salvar();
    if (registrar) registrar(req, req.eu, { acao: 'curriculo.apagar', col: 'talentos',
                                            alvo: it.candidatoId, antes: { nome: it.nome }, depois: null });
    res.json({ ok: true });
  });

  /* ── quem virou contrato não perde o currículo no prazo ── */
  app.post('/cv/:id/guardar', exigeLogin, (req, res) => {
    const it = C.itens[req.params.id];
    if (!it) return res.status(404).json({ ok: false });
    it.guardar = (req.body || {}).guardar !== false;
    salvar();
    res.json({ ok: true, guardar: it.guardar });
  });
}

module.exports = { montar, varrer, _interno: { tipoReal, TIPOS, TETO } };
