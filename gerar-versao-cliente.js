// Gera a versão do CLIENTE a partir do nexus-grb.html: mesma engenharia, zero dados.
// Os números da Rebracil saem de dentro do código (não só da tela): as constantes embutidas
// são reescritas zeradas, preservando rótulos, contas e estrutura para receber as planilhas.
const fs = require('fs');
const ORIGEM = require('path').join(__dirname, 'nexus-grb.html');
const DESTINO = process.argv[2] || require('path').join(__dirname, 'NEXUS GRB - CLIENTE (em branco).html');

let html = fs.readFileSync(ORIGEM, 'utf8');
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
let trocas = 0;
const erros = [];

// Substitui `const NOME = <literal>;` avaliando o literal e regravando a versão zerada.
function reescrever(nome, transforma) {
  const re = new RegExp('const ' + nome + ' *= *([\\s\\S]*?);\\n');
  const m = html.match(re);
  if (!m) { erros.push('não achei a constante ' + nome); return; }
  let valor;
  try { valor = (0, eval)('(' + m[1] + ')'); }
  catch (e) { erros.push(nome + ': não consegui avaliar (' + e.message.slice(0, 50) + ')'); return; }
  const zerado = transforma(valor);
  html = html.replace(re, () => 'const ' + nome + ' = ' + JSON.stringify(zerado) + ';\n');
  trocas++;
}

// --- regras de zeragem (espelham o "Excluir tudo e zerar" do próprio sistema) ---
const zeraMeses = o => { if (o && typeof o === 'object') MESES.forEach(k => { if (typeof o[k] === 'number') o[k] = 0; }); return o; };
const zeraNums = o => {           // zera todo número, preservando textos, cores e marcadores
  if (Array.isArray(o)) return o.map(zeraNums);
  if (o && typeof o === 'object') { Object.keys(o).forEach(k => o[k] = zeraNums(o[k])); return o; }
  return typeof o === 'number' ? 0 : o;
};
const mapaVazio = o => { if (o && typeof o === 'object') Object.keys(o).forEach(k => o[k] = {}); return o; };

// DRE e previsões: mantém as linhas (descrições), zera os meses e o acumulado
const zeraLinhas = arr => (arr || []).map(l => { zeraMeses(l); if (typeof l.acum === 'number') l.acum = 0; if (typeof l.provisao_mensal === 'number') l.provisao_mensal = 0; return l; });
// Centros de custo no formato [nome, jan, fev, mar, abr, ac, mm, ma, ip]: zera 1..7, preserva
// o nome (índice 0) e o marcador de linha-mãe (último), que é a estrutura da árvore
const zeraCC = arr => (arr || []).map(r => { if (Array.isArray(r)) for (let i = 1; i <= 7; i++) if (typeof r[i] === 'number') r[i] = 0; return r; });

reescrever('DRE_MENSAL_2026', zeraLinhas);
reescrever('PREVISOES_2026', zeraLinhas);
reescrever('CC_DATA', zeraCC);
reescrever('EMB_DRE_MENSAL', zeraLinhas);
reescrever('EMB_PREVISOES', zeraLinhas);
reescrever('EMB_CC_DATA', zeraCC);
reescrever('EMB_FATURAMENTO', arr => (arr || []).map(f => { f.fat = {}; f.kg = {}; f.fator = {}; return f; }));
reescrever('EMB_INVENTARIO', arr => (arr || []).map(i => { i.valor = {}; i.kg = {}; i.mts = {}; return i; }));
reescrever('EMB_SERVICOS', zeraLinhas);
reescrever('EMB_SUBEMPRESAS', arr => (arr || []).map(zeraNums));
reescrever('EMB_ITP', zeraNums);
reescrever('EMB_FAT_TOTAL', mapaVazio);
reescrever('EMB_INV_TOTAL', mapaVazio);
reescrever('EMB_CC_MESES', () => ({}));
reescrever('EMB_CC_MESES_TOTAL', () => ({}));
reescrever('EMB_FATORES_MT', () => ({}));
reescrever('EMB_DIF_KG', () => ({}));
// Histórico de anos fechados: não entra por planilha, então vai vazio (a tela avisa)
reescrever('HISTORICO_DRE_COMPLETO', () => []);
reescrever('TENDENCIA_YOY', () => []);
reescrever('EMB_HISTORICO', () => []);
reescrever('EMB_TENDENCIA', () => []);
// Fechamento oficial de estoque e saldo de abertura são números da Rebracil
reescrever('NEXUS_EST_OFICIAL_REQ', () => ({}));

// Semente da Requalificadora (jan-mai já conferidos): não vai para o cliente
if (!/const NEXUS_SEED_REQ = /.test(html)) erros.push('não achei NEXUS_SEED_REQ');
html = html.replace(/const NEXUS_SEED_REQ = [\s\S]*?;\n/, () => 'const NEXUS_SEED_REQ = null;   // versão do cliente: sem dados embutidos\n');
trocas++;

// Saldo de estoque de abertura (dez/2025) da Requalificadora. Aparece na empresa E como valor
// padrão em dois pontos do cálculo — todas as ocorrências vão a zero (sistema sem abertura).
if (!/1037371\.61/.test(html)) erros.push('não achei o estoqueBase da Requalificadora');
html = html.split('1037371.61').join('0');

// --- números fixos no HTML (não vinham de constante) ---
const trocasTexto = [
  // KPIs da tela Comparativo Histórico (o rótulo citava 2025, ano que não existe mais aqui)
  ['<div class="kpi-label">Despesa Total (2025)</div>', '<div class="kpi-label">Despesa Total (último ano)</div>'],
  ['<div class="kpi-val text-red-strong">R$ 11.080.235,50</div><div class="kpi-sub">Custo consolidado do último ano</div>',
   '<div class="kpi-val" style="color:var(--color-dim)">—</div><div class="kpi-sub">Sem anos fechados carregados</div>'],
  ['<div class="kpi-val text-green-strong">R$ 17.370.593,39</div><div class="kpi-sub">Alcançado no exercício de 2023</div>',
   '<div class="kpi-val" style="color:var(--color-dim)">—</div><div class="kpi-sub">Sem anos fechados carregados</div>'],
  ['<div class="kpi-val text-green-strong">R$ 864.181,69</div><div class="kpi-sub">Resultado do negócio em 2025 (Sem T.F.)</div>',
   '<div class="kpi-val" style="color:var(--color-dim)">—</div><div class="kpi-sub">Sem anos fechados carregados</div>'],
  ['<div class="kpi-val text-red-strong">- R$ 568.412,31</div><div class="kpi-sub">Resultado Real após impacto financeiro (2025)</div>',
   '<div class="kpi-val" style="color:var(--color-dim)">—</div><div class="kpi-sub">Sem anos fechados carregados</div>'],
  // Leituras narrativas que citavam números de 2023/2025
  ['No melhor cenário, o Resultado Real maquia o faturamento. No pior cenário, dependendo só da operação, a empresa apontou prejuízo de -R$ 568K em 2025.',
   'Esta leitura compara o resultado da operação com o resultado após o impacto financeiro. Ela se escreve sozinha quando os anos fechados forem carregados.'],
  ['O Faturamento despencou (de R$ 17,3M em 2023 para R$ 11,9M em 2025). Mas as Despesas travaram acima dos R$ 11 milhões.',
   'Esta leitura compara a evolução do faturamento com a das despesas ano a ano. Ela se escreve sozinha quando os anos fechados forem carregados.'],
  ['A média de despesa mensal está na casa de R$ 1,5M. O faturamento precisa obrigatoriamente superar essa linha de corte logo na primeira quinzena para garantir caixa livre.',
   'A média de despesa mensal define a linha de corte que o faturamento precisa superar para garantir caixa livre. Ela aparece aqui assim que os meses forem carregados.'],
  // Nota da tela de Serviços com os totais de jan/fev
  ['Janeiro fecha em <b>R$ 67.342,57</b> e fevereiro em <b>R$ 68.831,82</b>, os mesmos totais das abas R.Serviços da planilha. O <b>Acordo Trabalhista</b> de R$ 25.000,00 por mês é o maior peso da unidade.',
   'Esta tela recebe as contas da unidade de serviços (abas R.Serviços da planilha), mês a mês e editável.'],
];
trocasTexto.forEach(([de, para]) => {
  if (html.indexOf(de) < 0) { erros.push('não achei o texto: ' + de.slice(0, 55) + '...'); return; }
  html = html.split(de).join(para);
  trocas++;
});

// Nota do inventário: no cliente não existe "fechamento oficial" embutido nem a diferença apurada
const notaInvDe = /A linha <b>Estoque no DRE<\/b> segue o <b>fechamento oficial<\/b>[\s\S]*?bruto \(inventário\) \+ líquido \(posição\)\./;
if (!notaInvDe.test(html)) erros.push('não achei a nota do inventário');
html = html.replace(notaInvDe, () => 'A linha <b>Estoque no DRE</b> é o <b>estoque bruto</b> (inventário) mais o <b>estoque líquido</b> (posição de estoque). Na aba <b>CONSOLIDADO</b> você escolhe em qual resultado cada código de produto entra; a escolha vale para todos os meses e fica salva.');
trocas++;

// Marca a versão como entrega ao cliente (etiqueta própria, para não colidir com a sua)
html = html.replace("const NEXUS_BUILD = '", () => "const NEXUS_BUILD = 'C");

if (erros.length) { console.error('ERROS:\n  ' + erros.join('\n  ')); process.exit(1); }

// Conferência: nenhum script pode ter quebrado e nenhum número da Rebracil pode ter sobrado
const blocos = [...html.matchAll(/<script(?: defer)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ruins = 0;
blocos.forEach((js, i) => { try { new Function(js); } catch (e) { ruins++; console.error('BLOCO ' + i + ': ' + e.message.slice(0, 70)); } });
if (ruins) { console.error('ERRO: script inválido, nada foi gravado.'); process.exit(1); }

fs.writeFileSync(DESTINO, html);
console.log(trocas + ' blocos de dados zerados · ' + blocos.length + ' scripts válidos');
console.log('gerado: ' + DESTINO + ' (' + Math.round(Buffer.byteLength(html) / 1024) + ' KB)');
