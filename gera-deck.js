const pptxgen = require("pptxgenjs");
const fs = require("fs");

const NAVY = "0B1D33";
const NAVY2 = "123252";
const AZUL = "2166AC";
const AZUL_CLARO = "8EC3E6";
const GELO = "EEF4F9";
const GELO_BORDA = "DCEBF7";
const INK = "182A3E";
const INK2 = "41556B";
const INK3 = "68798C";
const LINHA = "DBE3EC";
const AMBAR = "B45309";
const NEG = "B3362B";
const BRANCO = "FFFFFF";
const FONTE = "Arial";

const logoEdr = "image/png;base64," + fs.readFileSync("assets/logo-edr-transparente.png").toString("base64");
const differenzaCapa = "image/jpeg;base64," + fs.readFileSync("assets/differenza-capa.jpg").toString("base64");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

const W = 13.33, H = 7.5, MX = 0.75;

function tituloSlide(slide, num, rotulo, titulo) {
  slide.addText(num + "  ·  " + rotulo.toUpperCase(), {
    x: MX, y: 0.42, w: 8, h: 0.32, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 11, bold: true, color: AZUL, charSpacing: 2,
  });
  slide.addText(titulo, {
    x: MX, y: 0.72, w: W - 2 * MX, h: 0.62, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 27, bold: true, color: INK,
  });
}

function rodape(slide, pagina) {
  slide.addText("Grupo EDR — Levantamento Comercial e Financeiro · 2026", {
    x: MX, y: H - 0.44, w: 8, h: 0.3, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 8.5, color: INK3,
  });
  slide.addText(String(pagina), {
    x: W - 1.1, y: H - 0.44, w: 0.35, h: 0.3, isTextBox: true, margin: 0, align: "right",
    fontFace: FONTE, fontSize: 8.5, color: INK3,
  });
}

/* ============ 1 · CAPA ============ */
{
  const s = pres.addSlide();
  s.background = { color: NAVY };
  s.addImage({ data: logoEdr, x: MX, y: 0.62, w: 1.7, h: 0.65, rounding: false });
  s.addText("GRUPO EDR", {
    x: MX, y: 2.55, w: 8, h: 0.4, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 13, bold: true, color: AZUL_CLARO, charSpacing: 5,
  });
  s.addText("Levantamento\nComercial e Financeiro", {
    x: MX, y: 2.95, w: 10.5, h: 1.9, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 44, bold: true, color: BRANCO, lineSpacing: 52,
  });
  s.addText("Produtos promocionais e brindes corporativos", {
    x: MX, y: 5.0, w: 9, h: 0.45, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 16, color: "C7D5E4",
  });
  s.addText("Diagnóstico construído a partir dos documentos, registros de vendas,\norçamentos e entrevistas — estrutura encontrada em 2026.", {
    x: MX, y: 5.55, w: 8.5, h: 0.7, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 11.5, color: "8DA2B8", lineSpacing: 17,
  });
}

/* ============ 2 · ESCOPO ============ */
{
  const s = pres.addSlide();
  s.background = { color: BRANCO };
  tituloSlide(s, "01", "Escopo", "O que foi levantado");

  s.addText("As informações comerciais e financeiras deste levantamento foram construídas a partir dos documentos disponibilizados, dos registros de vendas e orçamentos e de entrevistas com a equipe.\n\nO objetivo é dar aos sócios uma fotografia fiel da operação comercial encontrada em 2026: como ela está estruturada, o que os números dos últimos três anos mostram e qual foi o comportamento de receitas e despesas no trimestre mais recente.", {
    x: MX, y: 1.85, w: 5.3, h: 4.2, isTextBox: true, margin: 0, valign: "top",
    fontFace: FONTE, fontSize: 13.5, color: INK2, lineSpacing: 21,
  });

  const itens = [
    "Diagnóstico comercial e levantamento financeiro",
    "Entrevistas com os colaboradores envolvidos no processo",
    "Análise do faturamento dos últimos 3 anos",
    "Faturamento × rentabilidade do trimestre maio, junho e julho de 2026",
    "Despesas e receitas do mesmo trimestre de 2026",
  ];
  itens.forEach((t, i) => {
    const y = 1.85 + i * 0.92;
    s.addShape(pres.ShapeType.roundRect, {
      x: 6.7, y: y, w: 5.9, h: 0.78, rectRadius: 0.06,
      fill: { color: GELO }, line: { color: GELO_BORDA, width: 0.75 },
    });
    s.addText(String(i + 1).padStart(2, "0"), {
      x: 6.95, y: y + 0.14, w: 0.55, h: 0.5, isTextBox: true, margin: 0,
      fontFace: FONTE, fontSize: 16, bold: true, color: AZUL, valign: "middle",
    });
    s.addText(t, {
      x: 7.55, y: y + 0.08, w: 4.9, h: 0.62, isTextBox: true, margin: 0, valign: "middle",
      fontFace: FONTE, fontSize: 12, color: INK, lineSpacing: 15,
    });
  });
  rodape(s, 2);
}

/* ============ 3 · ESTRUTURA 2026 ============ */
{
  const s = pres.addSlide();
  s.background = { color: BRANCO };
  tituloSlide(s, "02", "Estrutura", "Estrutura apresentada em 2026");
  s.addText("Equipe enxuta e metas definidas — mas sem os instrumentos de gestão que sustentam uma área comercial.", {
    x: MX, y: 1.42, w: 10.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 13, color: INK2,
  });

  const cards = [
    ["Equipe", "2 representantes, 1 gerente comercial e 1 assistente de vendas."],
    ["Metas", "R$ 800 mil/mês no 1º semestre e R$ 1 milhão no 2º — vigentes de 2023 a 2025."],
    ["Indicadores", "Não foram identificados indicadores comerciais consolidados."],
    ["CRM", "Não foi identificado CRM em utilização."],
    ["Histórico", "Histórico de clientes e de perdas não consolidado."],
    ["Conversão", "Ticket médio e taxa de conversão não disponíveis de forma consolidada."],
    ["Leads", "Origem dos leads não consolidada."],
    ["Follow-up", "Acompanhamento sem controle centralizado nos registros analisados."],
  ];
  const cw = 2.86, ch = 1.5, gx = 0.18, gy = 0.3;
  const x0 = MX, y0 = 2.55;
  cards.forEach(([rot, txt], i) => {
    const col = i % 4, lin = Math.floor(i / 4);
    const x = x0 + col * (cw + gx), y = y0 + lin * (ch + gy);
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w: cw, h: ch, rectRadius: 0.07,
      fill: { color: GELO }, line: { color: GELO_BORDA, width: 0.75 },
    });
    s.addText(rot.toUpperCase(), {
      x: x + 0.22, y: y + 0.2, w: cw - 0.44, h: 0.3, isTextBox: true, margin: 0,
      fontFace: FONTE, fontSize: 10.5, bold: true, color: AZUL, charSpacing: 1.5,
    });
    s.addText(txt, {
      x: x + 0.22, y: y + 0.55, w: cw - 0.44, h: ch - 0.75, isTextBox: true, margin: 0, valign: "top",
      fontFace: FONTE, fontSize: 11.5, color: INK2, lineSpacing: 16,
    });
  });
  rodape(s, 3);
}

/* ============ 4 · SÍNTESE HISTÓRICA ============ */
{
  const s = pres.addSlide();
  s.background = { color: BRANCO };
  tituloSlide(s, "03", "Síntese", "Síntese histórica do levantamento");

  const linhas = [
    ["Faturamento", "Elevada oscilação mensal e diferenças relevantes entre os períodos disponíveis. O maior percentual de atingimento da meta foi de 44,6%."],
    ["Comercial", "A atuação relatada combina relacionamento, prospecção, desenvolvimento personalizado e negociação."],
    ["Estrutura", "Operação comercial enxuta, com participação direta dos sócios e forte presença da ex-sócia na condução das vendas."],
    ["Clientes e produtos", "Histórico com grandes empresas, fabricação própria de plásticos, desenvolvimento de moldes e linhas recorrentes, como copos e xícaras."],
    ["2026", "Informações comerciais distribuídas em diferentes arquivos, sem consolidação única de indicadores e históricos."],
  ];
  let y = 1.95;
  linhas.forEach(([rot, txt], i) => {
    s.addText(rot.toUpperCase(), {
      x: MX, y: y + 0.05, w: 2.5, h: 0.8, isTextBox: true, margin: 0, valign: "top",
      fontFace: FONTE, fontSize: 11, bold: true, color: AZUL, charSpacing: 1,
    });
    s.addText(txt, {
      x: 3.5, y: y, w: 9.0, h: 0.85, isTextBox: true, margin: 0, valign: "top",
      fontFace: FONTE, fontSize: 13, color: INK2, lineSpacing: 18,
    });
    y += 0.98;
    if (i < linhas.length - 1) {
      s.addShape(pres.ShapeType.line, {
        x: MX, y: y - 0.14, w: W - 2 * MX, h: 0, line: { color: LINHA, width: 0.75 },
      });
    }
  });
  rodape(s, 4);
}

/* ============ 5 · EVOLUÇÃO DO FATURAMENTO ============ */
{
  const s = pres.addSlide();
  s.background = { color: BRANCO };
  tituloSlide(s, "04", "Faturamento", "Evolução do faturamento — 2023 a 2025");

  const anos = [
    ["2023", "R$ 4.813.901,32", "média mensal R$ 401.158,44", "44,6% da meta"],
    ["2024", "R$ 2.402.185,30", "média mensal R$ 200.182,11", "22,2% da meta"],
    ["2025", "R$ 4.593.599,50", "média mensal R$ 382.799,96", "42,5% da meta"],
  ];
  const cw = 3.85, gx = 0.18, x0 = MX, y0 = 1.75;
  anos.forEach(([ano, total, media, pct], i) => {
    const x = x0 + i * (cw + gx);
    s.addShape(pres.ShapeType.roundRect, {
      x, y: y0, w: cw, h: 1.45, rectRadius: 0.07,
      fill: { color: GELO }, line: { color: GELO_BORDA, width: 0.75 },
    });
    s.addText(ano + "  —  " + pct, {
      x: x + 0.25, y: y0 + 0.16, w: cw - 0.5, h: 0.3, isTextBox: true, margin: 0,
      fontFace: FONTE, fontSize: 10.5, bold: true, color: INK3, charSpacing: 1,
    });
    s.addText(total, {
      x: x + 0.25, y: y0 + 0.45, w: cw - 0.5, h: 0.5, isTextBox: true, margin: 0,
      fontFace: FONTE, fontSize: 21, bold: true, color: INK,
    });
    s.addText(media, {
      x: x + 0.25, y: y0 + 0.97, w: cw - 0.5, h: 0.3, isTextBox: true, margin: 0,
      fontFace: FONTE, fontSize: 10.5, color: INK2,
    });
  });

  // valores em R$ mil: rótulos independem do locale do PowerPoint
  s.addChart([
    {
      type: pres.ChartType.bar,
      data: [{
        name: "Média mensal de faturamento",
        labels: ["2023", "2024", "2025"],
        values: [401.158, 200.182, 382.800],
      }],
      options: {
        barDir: "col", barGapWidthPct: 120,
        chartColors: [AZUL],
        showValue: true, dataLabelPosition: "outEnd",
        dataLabelFormatCode: '"R$ "0" mil"',
        dataLabelColor: INK, dataLabelFontSize: 10, dataLabelFontBold: true, dataLabelFontFace: FONTE,
      },
    },
    {
      type: pres.ChartType.line,
      data: [{
        name: "Meta de referência",
        labels: ["2023", "2024", "2025"],
        values: [900, 900, 900],
      }],
      options: {
        chartColors: [INK],
        lineSize: 1.5, lineDash: "dash", lineDataSymbol: "none",
        showValue: false,
      },
    },
  ], {
    x: MX, y: 3.45, w: W - 2 * MX, h: 3.1,
    showTitle: false, showLegend: false,
    valAxisMaxVal: 1000, valAxisMinVal: 0, valAxisMajorUnit: 200,
    valAxisLabelFormatCode: '0" mil"',
    valAxisLabelColor: INK3, valAxisLabelFontSize: 9, valAxisLabelFontFace: FONTE,
    catAxisLabelColor: INK, catAxisLabelFontSize: 12, catAxisLabelFontFace: FONTE,
    valGridLine: { color: "E4EAF1", size: 0.75, style: "solid" },
    catGridLine: { style: "none" },
  });

  s.addText("Linha tracejada: meta de referência de R$ 900 mil/mês (média das metas de R$ 800 mil e R$ 1 milhão). Atingimento: 44,6% em 2023 · 22,2% em 2024 · 42,5% em 2025.   Fonte: informações recebidas pela empresa.", {
    x: MX, y: 6.62, w: W - 2 * MX, h: 0.35, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 9.5, color: INK3,
  });
  rodape(s, 5);
}

/* ============ 6 · AGOSTO A DEZEMBRO ============ */
{
  const s = pres.addSlide();
  s.background = { color: BRANCO };
  tituloSlide(s, "05", "Ponto de atenção", "Agosto a dezembro: o ritmo cai no fim do ano");

  s.addText("Em 2023 e 2025, a média mensal de agosto a dezembro ficou bem abaixo da média do ano; em 2024, ficou praticamente igual. O segundo semestre, que carrega a meta mais alta, é justamente onde o ritmo tende a diminuir.", {
    x: MX, y: 1.5, w: 11.8, h: 0.65, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 13, color: INK2, lineSpacing: 18,
  });

  s.addChart([
    {
      type: pres.ChartType.bar,
      data: [{
        name: "Média mensal ago–dez",
        labels: ["2023", "2024", "2025"],
        values: [299.881, 202.131, 278.603],
      }],
      options: {
        barDir: "col", barGapWidthPct: 120,
        chartColors: [AZUL],
        showValue: true, dataLabelPosition: "outEnd",
        dataLabelFormatCode: '"R$ "0" mil"',
        dataLabelColor: INK, dataLabelFontSize: 10, dataLabelFontBold: true, dataLabelFontFace: FONTE,
      },
    },
    {
      type: pres.ChartType.line,
      data: [{
        name: "Meta de referência",
        labels: ["2023", "2024", "2025"],
        values: [900, 900, 900],
      }],
      options: {
        chartColors: [INK],
        lineSize: 1.5, lineDash: "dash", lineDataSymbol: "none",
        showValue: false,
      },
    },
  ], {
    x: MX, y: 2.4, w: 8.1, h: 4.2,
    showTitle: false, showLegend: false,
    valAxisMaxVal: 1000, valAxisMinVal: 0, valAxisMajorUnit: 200,
    valAxisLabelFormatCode: '0" mil"',
    valAxisLabelColor: INK3, valAxisLabelFontSize: 9, valAxisLabelFontFace: FONTE,
    catAxisLabelColor: INK, catAxisLabelFontSize: 12, catAxisLabelFontFace: FONTE,
    valGridLine: { color: "E4EAF1", size: 0.75, style: "solid" },
    catGridLine: { style: "none" },
  });

  const pontos = [
    ["2023", "R$ 299.881,26", "33,3% da meta"],
    ["2024", "R$ 202.130,66", "22,5% da meta"],
    ["2025", "R$ 278.603,08", "31,0% da meta"],
  ];
  let py = 2.6;
  s.addText("MÉDIA MENSAL NO PERÍODO", {
    x: 9.3, y: py, w: 3.3, h: 0.3, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 10, bold: true, color: INK3, charSpacing: 1.5,
  });
  py += 0.45;
  pontos.forEach(([ano, valor, pct]) => {
    s.addText(ano, {
      x: 9.3, y: py, w: 1.0, h: 0.35, isTextBox: true, margin: 0,
      fontFace: FONTE, fontSize: 12, bold: true, color: INK,
    });
    s.addText(valor + "   ·   " + pct, {
      x: 9.3, y: py + 0.32, w: 3.3, h: 0.32, isTextBox: true, margin: 0,
      fontFace: FONTE, fontSize: 11.5, color: INK2,
    });
    py += 0.85;
  });
  s.addText("Linha tracejada: meta de referência de R$ 900 mil/mês.   Fonte: informações recebidas pela empresa.", {
    x: MX, y: 6.72, w: 8, h: 0.3, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 9.5, color: INK3,
  });
  rodape(s, 6);
}

/* ============ 7 · TRIMESTRE 2026 ============ */
{
  const s = pres.addSlide();
  s.background = { color: BRANCO };
  tituloSlide(s, "06", "Trimestre 2026", "Receitas × despesas — maio a julho de 2026");

  const linhasT = [
    ["Maio", "R$ 0,00", "R$ 190.354,01", "– R$ 190.354,01"],
    ["Junho", "R$ 443.206,60", "R$ 576.492,84", "– R$ 133.286,24"],
    ["Julho", "R$ 648.611,47", "R$ 688.907,87", "– R$ 40.296,40"],
    ["Total do período", "R$ 1.091.818,07", "R$ 1.455.754,72", "– R$ 363.936,65"],
  ];
  const rows = [
    [
      { text: "Mês", options: { bold: true, color: INK3, fontSize: 10, align: "left" } },
      { text: "Receita", options: { bold: true, color: INK3, fontSize: 10, align: "right" } },
      { text: "Despesas", options: { bold: true, color: INK3, fontSize: 10, align: "right" } },
      { text: "Resultado", options: { bold: true, color: INK3, fontSize: 10, align: "right" } },
    ],
  ];
  linhasT.forEach(([mes, rec, desp, res], i) => {
    const total = i === 3;
    rows.push([
      { text: mes, options: { bold: total, color: INK, fontSize: 12.5, align: "left" } },
      { text: rec, options: { bold: total, color: INK, fontSize: 12.5, align: "right" } },
      { text: desp, options: { bold: total, color: INK, fontSize: 12.5, align: "right" } },
      { text: res, options: { bold: true, color: NEG, fontSize: 12.5, align: "right" } },
    ]);
  });
  s.addTable(rows, {
    x: MX, y: 1.8, w: 7.4, colW: [1.9, 1.83, 1.83, 1.84],
    border: [
      { type: "solid", pt: 0.75, color: LINHA },
      { type: "none" }, { type: "solid", pt: 0.75, color: LINHA }, { type: "none" },
    ],
    fill: { color: BRANCO },
    rowH: 0.58, valign: "middle",
    fontFace: FONTE, margin: [0.04, 0.08, 0.04, 0.08],
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: 8.7, y: 1.8, w: 3.9, h: 3.1, rectRadius: 0.08,
    fill: { color: NAVY }, line: { type: "none" },
  });
  s.addText("RESULTADO DO TRIMESTRE", {
    x: 9.0, y: 2.15, w: 3.3, h: 0.3, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 10.5, bold: true, color: AZUL_CLARO, charSpacing: 1.5,
  });
  s.addText("– R$ 363.936,65", {
    x: 9.0, y: 2.5, w: 3.4, h: 0.65, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 26, bold: true, color: "FFB3A7",
  });
  s.addText("Maio não registrou receita. Junho e julho mostram recuperação de faturamento, com o prejuízo mensal caindo de R$ 190,4 mil para R$ 40,3 mil — mas as despesas ainda superam as receitas nos três meses.", {
    x: 9.0, y: 3.25, w: 3.35, h: 1.5, isTextBox: true, margin: 0, valign: "top",
    fontFace: FONTE, fontSize: 10.5, color: "C7D5E4", lineSpacing: 15,
  });

  s.addChart(pres.ChartType.bar, [
    { name: "Receita", labels: ["Maio", "Junho", "Julho"], values: [0, 443.207, 648.611] },
    { name: "Despesas", labels: ["Maio", "Junho", "Julho"], values: [190.354, 576.493, 688.908] },
  ], {
    x: MX, y: 5.1, w: 7.4, h: 1.85,
    barDir: "col", barGapWidthPct: 90, barOverlapPct: -15,
    chartColors: [AZUL, AMBAR],
    showTitle: false,
    showLegend: true, legendPos: "b", legendColor: INK2, legendFontSize: 10, legendFontFace: FONTE,
    showValue: false,
    valAxisMaxVal: 800, valAxisMinVal: 0, valAxisMajorUnit: 200,
    valAxisLabelFormatCode: '0" mil"',
    valAxisLabelColor: INK3, valAxisLabelFontSize: 8.5, valAxisLabelFontFace: FONTE,
    catAxisLabelColor: INK, catAxisLabelFontSize: 10.5, catAxisLabelFontFace: FONTE,
    valGridLine: { color: "E4EAF1", size: 0.75, style: "solid" },
    catGridLine: { style: "none" },
  });
  rodape(s, 7);
}

/* ============ 8 · ESTUDOS POR CLIENTE ============ */
{
  const s = pres.addSlide();
  s.background = { color: BRANCO };
  tituloSlide(s, "07", "Estudos por cliente", "O que os pedidos recentes dizem sobre a margem");
  s.addText("Cinco pedidos de três clientes, abertos nota a nota — receitas, custos de fornecedores, fretes, comissões e impostos.", {
    x: MX, y: 1.42, w: 11.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 13, color: INK2,
  });

  const clientes = [
    ["MAUI Marketing Promocional", "Bowl Lâmpada do Gênio (Chamyto)\npedidos 3127 e 3132", "R$ 270.616,36", "R$ 247.060,52", "R$ 23.555,84", "8,70%", 0.087],
    ["Nestlé Brasil", "Lixeiras NDG cinza, vermelha e branca\npedido 3121", "R$ 527.810,00", "R$ 439.475,02", "R$ 88.334,98", "16,74%", 0.1674],
    ["HH Global do Brasil", "Copo lata com alça (Absolut / Tabasco)\npedidos 3124 e 3125", "R$ 210.554,60", "R$ 174.414,82", "R$ 36.139,78", "17,16%", 0.1716],
  ];
  const cw = 3.85, gx = 0.18, x0 = MX, y0 = 2.05, ch = 4.35;
  clientes.forEach(([nome, prod, rec, custo, res, mgTxt, mg], i) => {
    const x = x0 + i * (cw + gx);
    s.addShape(pres.ShapeType.roundRect, {
      x, y: y0, w: cw, h: ch, rectRadius: 0.08,
      fill: { color: GELO }, line: { color: GELO_BORDA, width: 0.75 },
    });
    s.addText(nome, {
      x: x + 0.28, y: y0 + 0.25, w: cw - 0.56, h: 0.35, isTextBox: true, margin: 0,
      fontFace: FONTE, fontSize: 15, bold: true, color: INK,
    });
    s.addText(prod, {
      x: x + 0.28, y: y0 + 0.62, w: cw - 0.56, h: 0.6, isTextBox: true, margin: 0, valign: "top",
      fontFace: FONTE, fontSize: 9.5, color: INK3, lineSpacing: 13,
    });
    const dados = [["Receita", rec], ["Custos e despesas", custo], ["Resultado", res]];
    let dy = y0 + 1.4;
    dados.forEach(([rot, val]) => {
      s.addText(rot, {
        x: x + 0.28, y: dy, w: 1.9, h: 0.3, isTextBox: true, margin: 0,
        fontFace: FONTE, fontSize: 10.5, color: INK2,
      });
      s.addText(val, {
        x: x + 0.28, y: dy + 0.24, w: cw - 0.56, h: 0.35, isTextBox: true, margin: 0,
        fontFace: FONTE, fontSize: 14, bold: true, color: INK,
      });
      dy += 0.68;
    });
    s.addText("Margem sobre a receita", {
      x: x + 0.28, y: dy + 0.08, w: 2.4, h: 0.28, isTextBox: true, margin: 0,
      fontFace: FONTE, fontSize: 10, color: INK2,
    });
    s.addText(mgTxt, {
      x: x + cw - 1.28, y: dy - 0.02, w: 1.0, h: 0.4, isTextBox: true, margin: 0, align: "right",
      fontFace: FONTE, fontSize: 16, bold: true, color: AZUL,
    });
    // trilho da margem (escala 0–20%)
    const tw = cw - 0.56;
    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.28, y: dy + 0.42, w: tw, h: 0.12, rectRadius: 0.06,
      fill: { color: "DDE7F0" }, line: { type: "none" },
    });
    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.28, y: dy + 0.42, w: Math.max(0.15, tw * (mg / 0.20)), h: 0.12, rectRadius: 0.06,
      fill: { color: AZUL }, line: { type: "none" },
    });
  });
  s.addText("Barras de margem em escala de 0 a 20%.   Prazos de recebimento: na maior parte dos pedidos, 45, 100 e até 120 dias (um pedido MAUI em 7/14 dias) — pressão de caixa mesmo com margem positiva.", {
    x: MX, y: 6.62, w: W - 2 * MX, h: 0.35, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 9.5, color: INK3,
  });
  rodape(s, 8);
}

/* ============ 9 · CENÁRIO 20% ============ */
{
  const s = pres.addSlide();
  s.background = { color: BRANCO };
  tituloSlide(s, "08", "Cenário de referência", "Quanto seria um resultado de 20% sobre a média");
  s.addText("Exercício de referência: o resultado que a operação teria gerado caso as vendas de cada ano tivessem saído com 20% de rentabilidade.", {
    x: MX, y: 1.45, w: 11.8, h: 0.4, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 13, color: INK2,
  });

  const rows = [
    [
      { text: "Ano", options: { bold: true, color: INK3, fontSize: 10.5, align: "left" } },
      { text: "Faturamento do ano", options: { bold: true, color: INK3, fontSize: 10.5, align: "right" } },
      { text: "20% sobre o ano", options: { bold: true, color: INK3, fontSize: 10.5, align: "right" } },
      { text: "20% sobre a média mensal", options: { bold: true, color: INK3, fontSize: 10.5, align: "right" } },
    ],
    [
      { text: "2023", options: { bold: true, color: INK, fontSize: 14, align: "left" } },
      { text: "R$ 4.813.901,32", options: { color: INK, fontSize: 14, align: "right" } },
      { text: "R$ 962.780,28", options: { bold: true, color: AZUL, fontSize: 14, align: "right" } },
      { text: "R$ 80.231,69", options: { color: INK, fontSize: 14, align: "right" } },
    ],
    [
      { text: "2024", options: { bold: true, color: INK, fontSize: 14, align: "left" } },
      { text: "R$ 2.402.185,30", options: { color: INK, fontSize: 14, align: "right" } },
      { text: "R$ 480.437,04", options: { bold: true, color: AZUL, fontSize: 14, align: "right" } },
      { text: "R$ 40.036,42", options: { color: INK, fontSize: 14, align: "right" } },
    ],
    [
      { text: "2025", options: { bold: true, color: INK, fontSize: 14, align: "left" } },
      { text: "R$ 4.593.599,50", options: { color: INK, fontSize: 14, align: "right" } },
      { text: "R$ 918.719,88", options: { bold: true, color: AZUL, fontSize: 14, align: "right" } },
      { text: "R$ 76.559,99", options: { color: INK, fontSize: 14, align: "right" } },
    ],
  ];
  s.addTable(rows, {
    x: MX, y: 2.3, w: W - 2 * MX, colW: [1.6, 3.5, 3.3, 3.43],
    border: [
      { type: "solid", pt: 0.75, color: LINHA },
      { type: "none" }, { type: "solid", pt: 0.75, color: LINHA }, { type: "none" },
    ],
    rowH: 0.8, valign: "middle",
    fontFace: FONTE, margin: [0.06, 0.12, 0.06, 0.12],
  });
  s.addText("Nos pedidos analisados em 2026, as margens reais ficaram entre 8,7% e 17,2% — abaixo dessa referência.", {
    x: MX, y: 6.0, w: 11.5, h: 0.4, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 12, color: INK2,
  });
  s.addText("Percentual de rentabilidade de 20% aplicado sobre a média mensal e sobre o total de cada ano.", {
    x: MX, y: 6.62, w: 11.5, h: 0.3, isTextBox: true, margin: 0,
    fontFace: FONTE, fontSize: 9.5, color: INK3,
  });
  rodape(s, 9);
}

/* ============ 10 · LEITURA FINAL ============ */
{
  const s = pres.addSlide();
  s.background = { color: BRANCO };
  tituloSlide(s, "09", "Leitura final", "O que este levantamento mostra");

  const pontos = [
    ["A meta nunca foi alcançada no período analisado.", "O melhor ano (2023) atingiu 44,6% da meta mensal de referência; 2024 ficou em 22,2% e 2025 em 42,5%."],
    ["O faturamento oscila muito de mês a mês", "e, em 2023 e 2025, perdeu ritmo entre agosto e dezembro — exatamente o semestre com a meta mais alta."],
    ["O trimestre de maio a julho de 2026 operou no negativo", "(– R$ 363,9 mil acumulados), com trajetória de recuperação: o prejuízo mensal caiu de R$ 190,4 mil para R$ 40,3 mil."],
    ["As margens por pedido variam de 8,7% a 17,2%", "— abaixo da referência de 20% — e os prazos de recebimento longos adiam a entrada do caixa."],
    ["A área comercial opera sem instrumentos de gestão consolidados:", "sem CRM, sem indicadores unificados, sem histórico organizado de clientes, perdas, conversão e origem de leads."],
  ];
  let y = 1.85;
  pontos.forEach(([forte, resto], i) => {
    s.addText(String(i + 1), {
      x: MX, y: y + 0.02, w: 0.5, h: 0.5, isTextBox: true, margin: 0,
      fontFace: FONTE, fontSize: 20, bold: true, color: AZUL,
    });
    s.addText([
      { text: forte + " ", options: { bold: true, color: INK } },
      { text: resto, options: { color: INK2 } },
    ], {
      x: 1.45, y: y, w: 11.1, h: 0.85, isTextBox: true, margin: 0, valign: "top",
      fontFace: FONTE, fontSize: 13.5, lineSpacing: 19,
    });
    y += 0.98;
  });
  rodape(s, 10);
}

/* ============ 11 · ENCERRAMENTO ============ */
{
  const s = pres.addSlide();
  s.background = { data: differenzaCapa };
}

pres.writeFile({ fileName: "apresentacao-comercial-edr.pptx" }).then(() => {
  console.log("deck gerado");
});
