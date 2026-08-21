# -*- coding: utf-8 -*-
"""
Monta os documentos de franquia: a proposta e o checklist, separados.

Pedido dela: "quero o formulario para separar a parte como checklist".
São dois públicos e dois momentos. A proposta é o que ela entrega para
vender; o checklist é o que o cliente preenche e devolve. Juntos, um
atrapalhava o outro: ninguém imprime dez cópias de uma proposta só para
ter dez checklists.

Por que um montador, e não dois HTML escritos à mão: os dados (31
documentos, 23 incisos, 10 pilares) aparecem nos dois lugares. Duplicar
isso à mão é como o sistema acabou dizendo "16 itens" da COF em dez
lugares diferentes e errando em todos. Aqui o dado mora uma vez só.

DESENHO, e por que ele mudou.
A primeira versão levou o desenho da tela para o papel: cartão com
sombra e canto arredondado, caixa pastel colorida a cada dois parágrafos,
título de 20px, corpo de 10,5pt. A leitura dela foi certeira: "letras
enormes, não parece profissional, parece ChatGPT". Era isso mesmo, é o
sotaque de página gerada.

Documento impresso de consultoria tem outro vocabulário: corpo miúdo
(8,6pt), entrelinha curta, hierarquia feita por peso e caixa alta
espaçada em vez de tamanho, fio de cabelo no lugar de moldura, tabela no
lugar de lista solta, e o dourado como fio de um ponto só, não como
fundo. O checklist virou tabela de auditoria, que é dez vezes mais denso
e é o formato que quem preenche já conhece.

A saída é HTML puro, sem JavaScript: documento para imprimir não pode
depender de script rodando.

    python3 documentos/montar.py
"""
import pathlib, html

AQUI = pathlib.Path(__file__).parent

# ═══════════════════════════════════════════════════════════════════════
# OS DADOS, uma vez só
# ═══════════════════════════════════════════════════════════════════════

# os 31 documentos que uma rede precisa ter, iguais aos do sistema (FR_DOCS)
DOCS = [
 ('Modelagem', 'Define o que exatamente vai ser replicado. Sem isso, cada unidade vira uma empresa diferente.', [
  ('Diagnóstico de franqueabilidade', 'Laudo que diz se o negócio pode ser franqueado e o que precisa mudar antes.', ''),
  ('Modelagem do negócio', 'Metragem, layout, equipe mínima, mix, horário e ticket-alvo. O molde que todo franqueado recebe.', 'V'),
  ('Estudo de viabilidade econômico-financeira', 'Investimento, faturamento, custo, ponto de equilíbrio, payback e retorno.', 'VIII'),
  ('Plano de negócios do franqueado', 'O estudo na linguagem do candidato, com cenários conservador, realista e otimista.', ''),
 ]),
 ('Jurídico', 'É o que a Lei 13.966/2019 exige. Sem estes documentos a oferta é irregular e o contrato, anulável.', [
  ('Circular de Oferta de Franquia (COF)', 'Os 23 incisos do art. 2º, entregue no mínimo 10 dias antes da assinatura ou de qualquer pagamento.', 'art. 2º'),
  ('Contrato de franquia', 'Escrito, com duas testemunhas. Prazo, renovação, território, obrigações e penalidades.', 'XVI'),
  ('Pré-contrato de franquia', 'Para reserva de território ou sinal. Precisa dizer o que acontece com o valor pago se não fechar.', 'XVI'),
  ('Registro de marca no INPI', 'Franquear marca não registrada é possível, mas o risco precisa estar declarado na COF.', 'XIV'),
  ('Termo de confidencialidade (NDA)', 'Assinado antes de o candidato ver números e método.', ''),
 ]),
 ('Manuais', 'É o know-how saindo da cabeça do dono e virando documento transferível. É o que o franqueado compra.', [
  ('Manual de operações', 'Como a unidade funciona do abrir ao fechar. Sem ele não existe padrão, existe improviso.', 'XIII'),
  ('Manual de implantação', 'Do contrato à inauguração: obra, licenças, contratações, compras e checklist de abertura.', 'XIII'),
  ('Manual da marca e identidade visual', 'Logotipo, cores, tipografia, fachada, uniformes e comunicação.', 'XIII'),
  ('Manual de produtos e serviços', 'Ficha técnica, preparo, apresentação, precificação e política de promoções.', ''),
  ('Manual de gestão de pessoas', 'Perfis das funções, contratação, escala, treinamento e avaliação da equipe.', ''),
  ('Manual financeiro', 'Controles mínimos, fechamento de caixa, formação de preço e prestação de contas.', ''),
  ('Manual de marketing', 'Ação da rede e ação local, uso do fundo de propaganda, calendário e materiais aprovados.', 'XX'),
  ('Manual de atendimento', 'Roteiro de atendimento, resolução de reclamação e padrão de experiência.', ''),
 ]),
 ('Processos', 'Manual explica; POP e checklist fazem acontecer todo dia, mesmo com o dono ausente.', [
  ('Procedimentos Operacionais Padrão (POPs)', 'Um por rotina crítica: o que é feito, por quem, com que frequência e como se mede.', ''),
  ('Fluxogramas de processo', 'Os processos que atravessam áreas: pedido, compra, reposição, reclamação.', ''),
  ('Checklists de auditoria', 'A régua com que a franqueadora mede a unidade em campo.', ''),
 ]),
 ('Comercial e seleção', 'Franqueado errado é o maior custo de uma rede. Selecionar é mais barato que substituir.', [
  ('Perfil do franqueado ideal', 'Experiência, capacidade de investimento, reserva de capital de giro e perfil comportamental.', 'VI'),
  ('Processo de seleção de franqueados', 'Etapas, entrevistas, análise financeira e critérios de aprovação, por escrito.', ''),
  ('Apresentação comercial', 'O material que o candidato recebe: proposta de valor, números, suporte e próximos passos.', ''),
  ('Funil de captação', 'De onde vêm os candidatos, quantos avançam e qual o custo de aquisição de um franqueado.', ''),
 ]),
 ('Treinamento', 'O contrato transfere o direito de usar a marca; o treinamento transfere a capacidade de operar.', [
  ('Programa de treinamento inicial', 'Carga horária, conteúdo, local, quem paga e o que ele precisa saber fazer ao final.', 'XIII'),
  ('Trilha de capacitação contínua', 'Reciclagem, novidades de produto e desenvolvimento de gestão ao longo do contrato.', 'XIII'),
  ('Modelo de certificação', 'Como se comprova que o franqueado e a equipe estão aptos, e o que acontece se não estiverem.', ''),
 ]),
 ('Expansão e suporte', 'Rede que cresce sem suporte estruturado vira um problema multiplicado.', [
  ('Plano de expansão', 'Quantas unidades por ano, em quais praças, com que estrutura de suporte.', ''),
  ('Modelo de consultoria de campo', 'Frequência das visitas, roteiro, relatório e plano de ação.', 'XIII'),
  ('Manual de supervisão de rede', 'Como a franqueadora acompanha, mede e cobra a rede conforme ela cresce.', ''),
  ('Estudo de ponto e território', 'Critérios de aprovação de ponto e de delimitação de território.', 'XI'),
 ]),
]

# os 23 incisos do art. 2º da Lei 13.966/2019
COF = [
 ('I', 'Histórico resumido, forma societária e nome completo ou razão social do franqueador e de todas as empresas a que esteja diretamente ligado, com nomes de fantasia e endereços.'),
 ('II', 'Qualificação completa do franqueador e das empresas a que esteja ligado, com os respectivos CNPJs.'),
 ('III', 'Balanços e demonstrações financeiras da franqueadora dos 2 últimos exercícios.'),
 ('IV', 'Ações judiciais relativas à franquia que questionem o sistema ou possam comprometer a operação no País, em que sejam parte o franqueador, controladoras, subfranqueador e titulares de marcas.'),
 ('V', 'Descrição detalhada da franquia e descrição geral do negócio e das atividades que o franqueado vai desempenhar.'),
 ('VI', 'Perfil do franqueado ideal: experiência anterior, escolaridade e outras características exigidas, obrigatória ou preferencialmente.'),
 ('VII', 'Requisitos quanto ao envolvimento direto do franqueado na operação e na administração do negócio.'),
 ('VIII', 'Especificações do investimento: total estimado para aquisição, implantação e entrada em operação; taxa inicial de filiação; valor estimado de instalações, equipamentos e estoque inicial, e condições de pagamento.'),
 ('IX', 'Taxas periódicas e outros valores devidos ao franqueador ou a terceiros indicados, com base de cálculo e o que cada uma remunera.'),
 ('X', 'Relação completa de todos os franqueados, subfranqueados e subfranqueadores da rede, e dos que se desligaram nos últimos 24 meses, com nome, endereço e telefone.'),
 ('XI', 'Política de atuação territorial: exclusividade ou preferência e sob que condições; vendas ou serviços fora do território e exportações; regras de concorrência entre unidades próprias e franqueadas.'),
 ('XII', 'Obrigação de adquirir bens, serviços ou insumos apenas de fornecedores indicados e aprovados pelo franqueador, com a relação deles.'),
 ('XIII', 'O que é oferecido ao franqueado e em quais condições: supervisão de rede, orientação, treinamento, manuais, auxílio na escolha do ponto, layout e padrões arquitetônicos.'),
 ('XIV', 'Situação da marca franqueada e demais direitos de propriedade intelectual autorizados, com número do registro ou do pedido, classe e subclasse nos órgãos competentes.'),
 ('XV', 'Situação do franqueado após a expiração do contrato quanto a know-how, informações confidenciais e segredos, e quanto à implantação de atividade concorrente.'),
 ('XVI', 'Modelo do contrato-padrão e, se for o caso, do pré-contrato-padrão, com texto completo, anexos, condições e prazos de validade.'),
 ('XVII', 'Existência ou não de regras de transferência ou sucessão e, se houver, quais são.'),
 ('XVIII', 'Situações em que se aplicam penalidades, multas ou indenizações, e os respectivos valores previstos no contrato.'),
 ('XIX', 'Existência de cotas mínimas de compra junto ao franqueador ou a terceiros designados, e a possibilidade e condições de recusa dos produtos ou serviços exigidos.'),
 ('XX', 'Existência de conselho ou associação de franqueados, com atribuições, poderes, mecanismos de representação e competências para gestão e fiscalização dos fundos.'),
 ('XXI', 'Regras de limitação à concorrência entre franqueador e franqueados, e entre franqueados, durante a vigência, com abrangência territorial, prazo e penalidades.'),
 ('XXII', 'Especificação precisa do prazo contratual e das condições de renovação, se houver.'),
 ('XXIII', 'Local, dia e hora para recebimento da documentação proposta e para início da abertura dos envelopes, quando se tratar de órgão ou entidade pública.'),
]

# os 10 pilares da franqueabilidade, iguais aos do sistema (FR_PILARES)
PILARES = [
 ('Rentabilidade e retorno', 15, ['A margem da unidade comporta royalties mais fundo de marketing', 'O payback do franqueado é atrativo, ideal abaixo de 30 meses', 'A unidade-piloto opera com lucro consistente', 'Ticket e volume sustentam o modelo econômico']),
 ('Replicabilidade operacional', 14, ['O negócio funciona sem a presença do fundador', 'A operação não depende de talentos raros ou insubstituíveis', 'Fornecedores, logística e tecnologia são replicáveis', 'O modelo se adapta a regiões e públicos diferentes']),
 ('Padronização e formatação', 12, ['Os processos-chave estão documentados em POPs', 'Existe manual de operações estruturado', 'Layout, identidade e experiência são padronizáveis', 'Há checklists e auditoria de conformidade']),
 ('Força e proteção da marca', 12, ['Marca registrada ou em registro no INPI', 'A marca tem reconhecimento e diferenciação', 'Identidade visual e verbal consistentes', 'Reputação e prova social sólidas']),
 ('Transferência de conhecimento', 10, ['O know-how pode ser ensinado em treinamento estruturado', 'A curva de aprendizado do franqueado é curta', 'Existe trilha de capacitação e reciclagem', 'Suporte contínuo de campo é viável']),
 ('Mercado e escalabilidade', 10, ['A demanda existe em outros territórios', 'O mercado está em crescimento ou é resiliente', 'O modelo escala sem perder qualidade', 'Baixa dependência de fatores locais únicos']),
 ('Maturidade jurídica', 8, ['Contrato de franquia e pré-contrato estruturados', 'COF completa conforme a Lei 13.966/2019', 'Societário e contábil organizados', 'Passivos e contingências sob controle']),
 ('Diferenciação competitiva', 8, ['Proposta de valor clara e difícil de copiar', 'Vantagem competitiva sustentável', 'Posicionamento de preço defensável']),
 ('Histórico e prova de conceito', 6, ['12 meses ou mais de operação com dados confiáveis', 'Resultados financeiros auditáveis', 'Mais de uma unidade validando o modelo']),
 ('Capacidade da franqueadora', 5, ['Estrutura e capital para dar suporte à rede', 'Time dedicado a expansão e operações', 'Cultura e governança preparadas para franquear']),
]

# o orçamento, o mesmo valorBase de 35.000 do sistema
ORCAMENTO = [
 ('Diagnóstico de franqueabilidade', 'Avaliação dos 10 pilares ponderados, entrevistas com a operação e laudo com o índice e as correções necessárias antes de franquear.', '6.000,00'),
 ('Viabilidade econômico-financeira', 'Modelagem da unidade, investimento inicial, DRE projetada, ponto de equilíbrio, payback e os três cenários do plano do franqueado.', '5.500,00'),
 ('Documentação da rede', 'Os 31 documentos, dos 8 manuais ao perfil do franqueado ideal e ao processo de seleção.', '11.000,00'),
 ('POPs e checklists de auditoria', 'Procedimentos das rotinas críticas, fluxogramas dos processos que atravessam áreas e a régua de auditoria de campo.', '5.000,00'),
 ('Circular de Oferta de Franquia', 'Os 23 incisos do art. 2º da Lei 13.966/2019, mais contrato-padrão e pré-contrato como anexos.', '5.500,00'),
 ('Plano de expansão e suporte', 'Metas por praça, modelo de consultoria de campo, supervisão de rede e critérios de ponto e território.', '2.000,00'),
]

ETAPAS = [
 ('Contrato', 'Assinatura e alinhamento de escopo antes de qualquer trabalho.', 'Semana 1'),
 ('Diagnóstico de franqueabilidade', 'Os 10 pilares ponderados respondem a pergunta que importa: dá para franquear, e o que precisa mudar antes.', 'Semanas 1 a 3'),
 ('Viabilidade da unidade', 'Investimento, faturamento esperado, ponto de equilíbrio, payback e retorno. A conta que o candidato leva ao contador dele.', 'Semanas 3 a 5'),
 ('Documentação', 'Os 31 documentos da rede, do manual de operações ao perfil do franqueado ideal.', 'Semanas 4 a 9'),
 ('POPs e checklists', 'Cada rotina crítica vira procedimento: o que é feito, por quem, com que frequência e como se mede.', 'Semanas 6 a 10'),
 ('Circular de Oferta de Franquia', 'Os 23 incisos do art. 2º da Lei 13.966/2019, com contrato-padrão e pré-contrato anexos.', 'Semanas 9 a 11'),
 ('Rede e expansão', 'Indicadores da unidade e da rede, plano de expansão e modelo de consultoria de campo.', 'Semanas 11 a 12'),
 ('Laudo e entrega', 'Emissão do laudo final e passagem do acervo, com treinamento da sua equipe.', 'Semana 13'),
]

CONDICOES = [
 ('Prazo de execução', '90 dias corridos a partir da assinatura e da entrega das informações iniciais pela contratante.'),
 ('Forma de pagamento', 'Entrada de 30% na assinatura e o saldo em 3 parcelas mensais iguais, ou à vista com desconto a combinar.'),
 ('Reuniões', 'Encontro quinzenal de acompanhamento, presencial em São Paulo ou remoto, com pauta e ata registradas no sistema.'),
 ('Acesso ao andamento', 'Painel do cliente aberto, com a etapa atual, o que espera por você e todos os documentos num lugar só.'),
 ('Abatimento do diagnóstico', 'Se a contratante começou pelo Raio-X do negócio e contratar em até 90 dias, o valor pago no diagnóstico é abatido integralmente. Cláusula 8ª do contrato.'),
 ('Confidencialidade', 'NDA assinado antes do acesso a números e método, válido durante e após o contrato.'),
 ('O que depende da contratante', 'Acesso às informações da operação, disponibilidade da equipe nas entrevistas e aprovação de cada entrega no prazo combinado.'),
 ('Não incluído', 'Honorários de advogado, taxas do INPI, custos de cartório, projeto arquitetônico da unidade-modelo e produção gráfica. São custos de terceiros, pagos direto ao fornecedor.'),
]

# ═══════════════════════════════════════════════════════════════════════
# O DESENHO
# ═══════════════════════════════════════════════════════════════════════

SIMBOLO = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 112 140'%3E"
 "%3Cpath fill-rule='evenodd' d='M14 86 a26 40 0 1 0 52 0 a26 40 0 1 0 -52 0 Z M30 81 a14 27 0 1 0 28 0 a14 27 0 1 0 -28 0 Z' transform='rotate(-20 40 86)'/%3E"
 "%3Cpath d='M58 6 C52 40 30 88 20 126 l6 2 C36 90 61 42 67 6 Z'/%3E"
 "%3Cpath d='M84 50 l9 1 -4 46 -7-1 Z'/%3E%3Ccircle cx='86' cy='110' r='6'/%3E"
 "%3Cpath d='M73.8 31.2C82 23 88 18 93.6 14.1l1.6 2.3C89.8 20.2 84 25 75.6 33.2Z'/%3E"
 "%3Cpath d='M110 4 88 13l7.6 2.8z' opacity='.5'/%3E%3Cpath d='M110 4 95.6 15.8l3.2 8.4z'/%3E%3C/svg%3E")

CSS = """
:root{
  --ink:#16161c;--ink-2:#4a4a55;--ink-3:#7c7c86;
  --gold:#a8842f;--gold-fio:#c9a961;
  --fio:#d8d8de;--fio-leve:#ebebef;--chapa:#f7f7f9;
  --display:'Sora',Georgia,serif;
  --corpo:'Inter',-apple-system,'Segoe UI',Roboto,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;
  --sim:url("SIMBOLO_AQUI");
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--corpo);color:var(--ink);background:#e8e8ec;
  font-size:11px;line-height:1.5;-webkit-font-smoothing:antialiased}

/* na tela, a folha imita o papel. Na impressão vira a página mesmo. */
.folha{width:210mm;min-height:297mm;margin:18px auto;background:#fff;
  padding:16mm 15mm 14mm;box-shadow:0 2px 20px rgba(0,0,0,.14)}

/* ── timbre ───────────────────────────────────────────────────────── */
.timbre{display:flex;align-items:flex-end;gap:9px;padding-bottom:7px;
  border-bottom:.75pt solid var(--ink)}
.timbre>i{width:15px;height:19px;background:var(--gold);flex:none;
  -webkit-mask:var(--sim) center/contain no-repeat;mask:var(--sim) center/contain no-repeat}
.timbre .nm{font:600 10px/1 var(--display);letter-spacing:.14em;text-transform:uppercase}
.timbre .nm i{font-style:normal;color:var(--gold)}
.timbre .doc{margin-left:auto;font:500 7.5px/1 var(--mono);letter-spacing:.15em;
  text-transform:uppercase;color:var(--ink-3)}

/* ── título do documento ──────────────────────────────────────────── */
.abre{padding:26px 0 20px}
.abre .olho{font:600 7.5px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;
  color:var(--gold)}
.abre h1{font:300 27px/1.14 var(--display);letter-spacing:-.022em;margin:11px 0 0;
  max-width:26ch}
.abre h1 b{font-weight:600}
.abre .lede{margin-top:12px;max-width:64ch;color:var(--ink-2);font-size:11px}

/* ── seções ───────────────────────────────────────────────────────── */
.sec{margin-top:19px}
.sec>h2{font:600 11.5px/1.3 var(--display);letter-spacing:-.005em;
  padding-bottom:5px;border-bottom:.75pt solid var(--ink);
  display:flex;align-items:baseline;gap:9px}
.sec>h2 .n{font:600 7.5px/1 var(--mono);letter-spacing:.14em;color:var(--gold);flex:none}
.sec>h2 .ao{margin-left:auto;font:500 7.5px/1 var(--mono);letter-spacing:.12em;
  text-transform:uppercase;color:var(--ink-3)}
.sec p{margin-top:9px;max-width:76ch}
.sec p+p{margin-top:6px}

/* ── tabelas: o fio de cabelo faz o trabalho da moldura ───────────── */
table{width:100%;border-collapse:collapse;margin-top:10px;font-size:10px}
th{text-align:left;font:600 7.5px/1.3 var(--mono);letter-spacing:.13em;
  text-transform:uppercase;color:var(--ink-3);padding:0 6px 5px;
  border-bottom:.75pt solid var(--ink);vertical-align:bottom}
td{padding:5.5px 6px;border-bottom:.5pt solid var(--fio-leve);vertical-align:top}
th:first-child,td:first-child{padding-left:0}
th:last-child,td:last-child{padding-right:0}
.num{text-align:right;font-family:var(--mono);white-space:nowrap;font-size:9.5px}
tr.total td{border-top:.75pt solid var(--ink);border-bottom:none;font-weight:700;
  padding-top:7px}
tr.total .num{font-size:11px}
td .sub{display:block;color:var(--ink-3);font-size:9px;line-height:1.4;margin-top:1px}
.rot{font:500 8px/1.3 var(--mono);letter-spacing:.08em;color:var(--gold);white-space:nowrap}

/* a coluna de marcar: quadrado de caneta, não caixa de formulário web */
.mk{width:34px;text-align:center}
.mk i{display:inline-block;width:9.5px;height:9.5px;border:.75pt solid var(--ink-3)}
th.mk{font-size:6.5px;letter-spacing:.09em}
.mk.larga{width:auto}
th.mk.larga{font-size:7.5px;letter-spacing:.13em}

/* ── etapas, numeradas por conta do texto e não por bolinha ───────── */
.etapas td:first-child{font-family:var(--mono);font-size:9px;color:var(--ink-3);
  width:20px;padding-top:6.5px}
.etapas .t{font-weight:600}

/* ── grupo do checklist: cabeçalho de bloco em chapa clara ────────── */
.blocoh{background:var(--chapa);border-top:.75pt solid var(--ink);
  padding:6px 6px 5px;margin-top:14px;display:flex;align-items:baseline;gap:9px}
.blocoh b{font:600 9.5px/1.3 var(--display)}
.blocoh>span{color:var(--ink-3);font-size:9px;flex:1}
.blocoh>span.qt{font:500 7.5px/1 var(--mono);letter-spacing:.1em;color:var(--ink-3);
  flex:none;margin-left:auto;padding-left:12px}
.blocoh+table{margin-top:0}
.blocoh+table th{padding-top:5px}

/* ── nota: fio dourado à esquerda, sem fundo colorido ─────────────── */
.nota{border-left:1.5pt solid var(--gold-fio);padding:2px 0 2px 11px;margin-top:12px;
  font-size:10px;color:var(--ink-2);max-width:76ch}
.nota b{color:var(--ink)}
.nota.forte{border-left-color:var(--ink)}

/* ── identificação: régua de campos ───────────────────────────────── */
.ident{margin-top:14px;border-top:.75pt solid var(--ink)}
.ident .l{display:flex;gap:22px}
.ident .c{flex:1;padding:12px 0 3px;border-bottom:.5pt solid var(--fio)}
.ident .c b{display:block;font:600 7px/1 var(--mono);letter-spacing:.14em;
  text-transform:uppercase;color:var(--ink-3);margin-bottom:16px}

/* ── faixas de resultado ──────────────────────────────────────────── */
.faixas{display:flex;gap:0;margin-top:12px;border-top:.5pt solid var(--fio)}
.faixas>div{flex:1;padding:9px 12px 0;border-right:.5pt solid var(--fio)}
.faixas>div:first-child{padding-left:0}
.faixas>div:last-child{border-right:0;padding-right:0}
.faixas .n{font:600 10px/1 var(--display)}
.faixas .l{font-size:9px;color:var(--ink-2);margin-top:4px}

/* ── assinaturas ──────────────────────────────────────────────────── */
.assina{display:flex;gap:42px;margin-top:38px;page-break-inside:avoid}
.assina>div{flex:1}
.assina .r{border-bottom:.75pt solid var(--ink);height:34px}
.assina b{display:block;font-size:9.5px;font-weight:600;margin-top:6px}
.assina span{display:block;font:500 7px/1.4 var(--mono);letter-spacing:.11em;
  text-transform:uppercase;color:var(--ink-3);margin-top:1px}

/* ── rodapé ───────────────────────────────────────────────────────── */
.rodape{margin-top:26px;padding-top:6px;border-top:.5pt solid var(--fio);
  display:flex;font:500 7px/1.4 var(--mono);letter-spacing:.09em;
  text-transform:uppercase;color:var(--ink-3)}
.rodape span:last-child{margin-left:auto}

/* ── impressão ────────────────────────────────────────────────────── */
@page{size:A4;margin:16mm 15mm 17mm}
@media print{
  /* rodapé no fluxo, com respiro curto. A tentativa de fixá-lo para
     repetir em toda página falhou no Chrome: com margem de página, o
     elemento fixo foi parar no TOPO da folha, atravessado por cima do
     conteúdo. O número de página vem do gerador do PDF. */
  .rodape{margin-top:14px}
  body{background:#fff;font-size:8.6pt;line-height:1.42}
  .folha{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}
  .abre h1{font-size:21pt}
  .abre{padding:14pt 0 11pt}
  .sec{margin-top:13px}
  .sec p{margin-top:7px}
  td{padding:4.6px 6px}
  table{margin-top:8px}
  .nota{margin-top:9px}
  .blocoh{margin-top:11px}
  .sec>h2{font-size:9.5pt}
  table{font-size:7.9pt}
  td .sub{font-size:7.2pt}
  .nota{font-size:7.9pt}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  /* 38px de respiro na tela viram uma página inteira no papel: com
     break-inside:avoid, a assinatura não cabia no resto da folha e
     pulava sozinha para a seguinte. */
  .assina{margin-top:14px}
  .assina .r{height:26px}
  /* faltavam 15pt para o rodapé caber na folha e ele ia sozinho para a
     página seguinte. É a mesma órfã de antes, agora no bloco final. */
  .rodape{margin-top:8px;padding-top:4px}
  /* o que não pode partir no meio */
  tr,.blocoh,.assina,.faixas,.nota{break-inside:avoid}
  .sec.fecha{break-inside:avoid}
  .sec>h2,.blocoh{break-after:avoid}
  .abre{break-after:avoid}
  thead{display:table-header-group}
  .naoimprime{display:none!important}
}
.naoimprime{position:fixed;right:16px;bottom:16px;z-index:9}
.naoimprime button{font:600 11px/1 var(--corpo);padding:10px 14px;border:.75pt solid var(--ink);
  background:#fff;color:var(--ink);cursor:pointer;letter-spacing:.02em}
/* "screen and" é obrigatório: sem isso, A4 (794px) entra no ponto de
   quebra e a impressão herda o desenho de celular, com as faixas
   empilhadas e as assinaturas em coluna. */
@media screen and (max-width:820px){
  .folha{width:auto;margin:0;padding:16px 14px;box-shadow:none}
  .ident .l{flex-wrap:wrap;gap:0 18px}
  .ident .c{flex:1 1 40%}
  .faixas{flex-direction:column}
  .faixas>div{border-right:0;border-bottom:.5pt solid var(--fio);padding:9px 0}
  .assina{flex-direction:column;gap:18px}
}
""".replace('SIMBOLO_AQUI', SIMBOLO)

e = html.escape


def pagina(titulo, rotulo, corpo):
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(titulo)} · Grupo A! Fatorial</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
<div class="naoimprime"><button onclick="window.print()">Imprimir ou salvar em PDF</button></div>
<div class="folha">
<div class="timbre">
  <i aria-hidden="true"></i>
  <div class="nm">Grupo <i>A!</i> Fatorial</div>
  <div class="doc">{e(rotulo)}</div>
</div>
{corpo}
<div class="rodape">
  <span>A! Fatorial Soluções para Empresas e Franquias Ltda · CNPJ 30.361.388/0001-17</span>
  <span>contato@grupoafatorial.com.br · 11 9.1101-2147</span>
</div>
</div>
</body>
</html>
"""


def abre(olho, titulo_html, lede):
    return f'<div class="abre"><div class="olho">{olho}</div><h1>{titulo_html}</h1>' \
           f'<p class="lede">{lede}</p></div>'


def ident(campos):
    linhas = []
    for grupo in campos:
        cs = ''.join(f'<div class="c"><b>{e(c)}</b></div>' for c in grupo)
        linhas.append(f'<div class="l">{cs}</div>')
    return '<div class="ident">' + ''.join(linhas) + '</div>'


# ═══════════════════════════════════════════════════════════════════════
# A PROPOSTA
# ═══════════════════════════════════════════════════════════════════════

etapas_tr = ''.join(
    f'<tr><td>{i}</td><td><span class="t">{e(t)}</span>'
    f'<span class="sub">{e(d)}</span></td>'
    f'<td class="num" style="color:var(--ink-3)">{e(p)}</td></tr>'
    for i, (t, d, p) in enumerate(ETAPAS, 1))

orc_tr = ''.join(
    f'<tr><td><b>{e(n)}</b><span class="sub">{e(d)}</span></td>'
    f'<td class="num">{v}</td></tr>'
    for n, d, v in ORCAMENTO)

cond_tr = ''.join(
    f'<tr><td style="width:26%"><b>{e(k)}</b></td><td>{e(v)}</td></tr>'
    for k, v in CONDICOES)

PROPOSTA = abre(
  'Proposta comercial · Formatação de franquia',
  'Transformar um negócio que dá certo em <b>rede replicável</b>.',
  'O que o serviço entrega, em quanto tempo, por quanto, e o que depende de você. '
  'O diagnóstico de franqueabilidade vai em documento separado, para a sua equipe preencher '
  'sem precisar imprimir esta proposta de novo.'
) + ident([['Empresa', 'CNPJ'], ['Responsável', 'Data da proposta', 'Validade']]) + f"""

<div class="sec">
  <h2><span class="n">01</span>O que é a Formatação de Franquia<span class="ao">Escopo</span></h2>
  <p>Franquear não é vender o direito de usar um nome. É conseguir que outra pessoa, em outra
    cidade, com outra equipe, entregue o mesmo resultado que você entrega hoje. O que torna isso
    possível não é o contrato: é o método fora da sua cabeça, escrito, medido e auditável.</p>
  <p>Começamos perguntando se o negócio <b>aguenta</b> virar rede, porque franquear um modelo que
    não se sustenta multiplica o problema em vez do lucro. Só depois montamos a documentação, os
    manuais, os POPs, a Circular de Oferta de Franquia e o plano de expansão.</p>
  <div class="nota"><b>Ao final você tem</b> o laudo de franqueabilidade, o estudo de viabilidade
    da unidade, os 31 documentos da rede, os POPs das rotinas críticas, a Circular de Oferta de
    Franquia completa e o plano de expansão. Não é um relatório com o que fazer: é o acervo pronto
    para abrir a primeira unidade franqueada.</div>
</div>

<div class="sec">
  <h2><span class="n">02</span>Como o trabalho anda<span class="ao">8 etapas · 90 dias</span></h2>
  <p>Cada etapa tem dono e prazo, e você acompanha pelo painel na hora que quiser. Nada avança
    sem a sua aprovação.</p>
  <table class="etapas"><tbody>{etapas_tr}</tbody></table>
</div>

<div class="sec">
  <h2><span class="n">03</span>Investimento<span class="ao">Orçamento aberto</span></h2>
  <p>Aberto linha a linha, porque número redondo sem composição gera desconfiança, e com razão.</p>
  <table>
    <thead><tr><th>Etapa e conteúdo</th><th class="num" style="width:22%">Valor (R$)</th></tr></thead>
    <tbody>{orc_tr}
      <tr class="total"><td>Total do projeto</td><td class="num">35.000,00</td></tr>
    </tbody>
  </table>
</div>

<div class="sec">
  <h2><span class="n">04</span>Condições comerciais</h2>
  <table><tbody>{cond_tr}</tbody></table>
  <div class="nota forte"><b>O trabalho é feito com a sua equipe, não no lugar dela.</b> A gente
    entra na operação, desenha, documenta e treina. Quem opera a rede depois é o seu time: o nosso
    trabalho é fazer com que ele consiga, e cobrar até a rotina andar sozinha.</div>
</div>

<div class="sec fecha">
  <h2><span class="n">05</span>Próximos passos</h2>
  <table class="etapas"><tbody>
    <tr><td>1</td><td><span class="t">Preencher o checklist</span><span class="sub">O documento
      separado, com os 31 itens do acervo, os 23 incisos da COF e os 10 pilares. Mesmo incompleto:
      o que ficar em branco também informa.</span></td>
      <td class="num" style="color:var(--ink-3)">Agora</td></tr>
    <tr><td>2</td><td><span class="t">Reunião de leitura</span><span class="sub">Uma hora para
      revisar o que foi marcado e ajustar o escopo ao que de fato falta.</span></td>
      <td class="num" style="color:var(--ink-3)">Até 5 dias</td></tr>
    <tr><td>3</td><td><span class="t">Proposta final e contrato</span><span class="sub">Escopo
      fechado, com prazo e valor ajustados ao que o checklist mostrou.</span></td>
      <td class="num" style="color:var(--ink-3)">Até 10 dias</td></tr>
    <tr><td>4</td><td><span class="t">Assinatura e início</span><span class="sub">Assinatura
      eletrônica, acesso ao painel liberado e primeira etapa aberta.</span></td>
      <td class="num" style="color:var(--ink-3)">Na hora</td></tr>
  </tbody></table>
  <div class="assina">
    <div><div class="r"></div><b>Pela contratante</b><span>Nome, cargo e data</span></div>
    <div><div class="r"></div><b>Carla Caroline</b><span>CEO · Grupo A! Fatorial</span></div>
  </div>
</div>"""


# ═══════════════════════════════════════════════════════════════════════
# O CHECKLIST
# ═══════════════════════════════════════════════════════════════════════

def tabela_docs():
    h, n = [], 0
    for cat, porque, itens in DOCS:
        h.append(f'<div class="blocoh"><b>{e(cat)}</b><span>{e(porque)}</span>'
                 f'<span class="qt">{len(itens)}</span></div>')
        h.append('<table><thead><tr><th style="width:20px">#</th><th>Documento</th>'
                 '<th class="mk">Tem</th><th class="mk">Parcial</th><th class="mk">Não tem</th>'
                 '</tr></thead><tbody>')
        for titulo, desc, lei in itens:
            n += 1
            tag = f' <span class="rot">COF {e(lei)}</span>' if lei else ''
            h.append(f'<tr><td style="font-family:var(--mono);color:var(--ink-3)">{n}</td>'
                     f'<td><b>{e(titulo)}</b>{tag}<span class="sub">{e(desc)}</span></td>'
                     f'<td class="mk"><i></i></td><td class="mk"><i></i></td>'
                     f'<td class="mk"><i></i></td></tr>')
        h.append('</tbody></table>')
    return ''.join(h)


def tabela_cof():
    linhas = ''.join(
        f'<tr><td style="width:42px;font-family:var(--mono);font-size:9px">{n}</td>'
        f'<td>{e(t)}</td><td class="mk"><i></i></td><td class="mk"><i></i></td></tr>'
        for n, t in COF)
    return ('<table><thead><tr><th>Inciso</th><th>O que a lei exige que conste</th>'
            '<th class="mk">Consta</th><th class="mk">Falta</th></tr></thead>'
            f'<tbody>{linhas}</tbody></table>')


def tabela_pilares():
    h = []
    for i, (nome, peso, criterios) in enumerate(PILARES, 1):
        h.append(f'<div class="blocoh"><b>{i}. {e(nome)}</b><span></span>'
                 f'<span class="qt">Peso {peso}</span></div>')
        h.append('<table><tbody>')
        for c in criterios:
            h.append(f'<td>{e(c)}</td><td class="mk"><i></i></td></tr>'.join(['<tr>', '']))
        h.append('</tbody></table>')
    return ''.join(h)


def tabela_apuracao():
    linhas = ''.join(
        f'<tr><td>{i}. {e(nome)}</td>'
        f'<td class="num" style="color:var(--ink-3)">{len(cr)}</td>'
        f'<td class="mk" style="width:46px"><i style="width:30px;height:13px"></i></td>'
        f'<td class="num" style="color:var(--ink-3)">{peso}</td>'
        f'<td class="mk" style="width:52px"><i style="width:36px;height:13px"></i></td></tr>'
        for i, (nome, peso, cr) in enumerate(PILARES, 1))
    return ('<table><thead><tr><th>Pilar</th><th class="num">Critérios</th>'
            '<th class="mk larga">Marcados</th><th class="num">Peso</th><th class="mk larga">Pontos</th>'
            '</tr></thead><tbody>' + linhas +
            '<tr class="total"><td>Índice de franqueabilidade</td>'
            '<td class="num">37</td><td></td><td class="num">100</td>'
            '<td class="mk"><i style="width:36px;height:15px;border-width:1pt"></i></td></tr>'
            '</tbody></table>')


CHECKLIST = abre(
  'Checklist · Franqueabilidade e acervo da rede',
  'O que a sua empresa já tem, e <b>o que falta para virar rede</b>.',
  'Quatro blocos para preencher a caneta: o acervo de 31 documentos que uma franqueadora precisa '
  'ter, os 23 incisos que a lei exige na Circular de Oferta de Franquia, os 10 pilares que dizem '
  'se o negócio aguenta ser franqueado, e a folha de apuração.'
) + ident([['Empresa', 'CNPJ'], ['Quem preencheu', 'Cargo', 'Data']]) + f"""

<div class="sec">
  <h2><span class="n">◈</span>Como preencher<span class="ao">Leia antes</span></h2>
  <table class="etapas"><tbody>
    <tr><td>1</td><td><span class="t">Marque o que é verdade hoje</span><span class="sub">Não o
      que está planejado nem o que está quase pronto. O valor deste documento é ele ser honesto.</span></td></tr>
    <tr><td>2</td><td><span class="t">Em branco também informa</span><span class="sub">Item que
      você não sabe responder quer dizer que não existe dono para aquilo.</span></td></tr>
    <tr><td>3</td><td><span class="t">Três estados no acervo</span><span class="sub">Tem, se
      existe e está atualizado. Parcial, se existe mas está incompleto ou desatualizado. Não tem,
      se não existe.</span></td></tr>
    <tr><td>4</td><td><span class="t">Devolva mesmo incompleto</span><span class="sub">Na reunião
      de leitura fechamos o que ficou em aberto, e o escopo do trabalho sai do que este documento
      mostrar.</span></td></tr>
  </tbody></table>
</div>

<div class="sec">
  <h2><span class="n">A</span>O acervo da rede<span class="ao">31 documentos</span></h2>
  <p>O que sobrar em branco é, exatamente, o escopo do trabalho.</p>
  {tabela_docs()}
</div>

<div class="sec">
  <h2><span class="n">B</span>Circular de Oferta de Franquia<span class="ao">Lei 13.966/2019, art. 2º</span></h2>
  <p>Se você já tem uma COF, confira inciso por inciso. Se ainda não tem, este é o índice do que
    ela vai precisar conter.</p>
  <div class="nota forte"><b>O prazo de 10 dias não é formalidade.</b> A COF precisa ser entregue
    ao candidato no mínimo 10 dias antes da assinatura do contrato ou pré-contrato, e antes de
    qualquer pagamento. Descumprir o prazo, omitir informação ou prestar informação falsa permite
    ao franqueado anular o contrato e exigir a devolução de tudo o que pagou, corrigido e com
    perdas e danos.</div>
  {tabela_cof()}
</div>

<div class="sec">
  <h2><span class="n">C</span>O negócio aguenta virar rede?<span class="ao">10 pilares ponderados</span></h2>
  <p>Marque só o que já é verdade hoje. É o mesmo critério do nosso laudo, na versão de papel.</p>
  {tabela_pilares()}
</div>

<div class="sec fecha">
  <h2><span class="n">D</span>Folha de apuração<span class="ao">O resultado</span></h2>
  <p>Conte quantos critérios marcou em cada pilar. Os pontos do pilar são os marcados divididos
    pelo total de critérios, multiplicado pelo peso. A soma dos dez é o índice, de 0 a 100.</p>
  {tabela_apuracao()}
  <div class="faixas">
    <div><div class="n">Acima de 75</div><div class="l">Pronto para franquear, com ajustes pontuais.</div></div>
    <div><div class="n">Entre 55 e 75</div><div class="l">Dá para franquear, mas há correções estruturais antes.</div></div>
    <div><div class="n">Abaixo de 55</div><div class="l">Franquear agora multiplica o problema. Primeiro a casa, depois a rede.</div></div>
  </div>
  <div class="nota">Se preferir, devolva só as marcações: a gente calcula e devolve o laudo com a
    leitura pilar por pilar.</div>
  <div class="assina">
    <div><div class="r"></div><b>Quem preencheu</b><span>Nome, cargo e data</span></div>
    <div><div class="r"></div><b>Conferido por</b><span>Grupo A! Fatorial</span></div>
  </div>
</div>"""

# ═══════════════════════════════════════════════════════════════════════

(AQUI / 'franquia-proposta.html').write_text(
    pagina('Formatação de Franquia · Proposta', 'Proposta comercial', PROPOSTA), encoding='utf-8')
(AQUI / 'franquia-checklist.html').write_text(
    pagina('Checklist de Franqueabilidade', 'Checklist · preencher e devolver', CHECKLIST),
    encoding='utf-8')

n_docs = sum(len(c[2]) for c in DOCS)
n_crit = sum(len(p[2]) for p in PILARES)
assert n_docs == 31 and len(COF) == 23 and len(PILARES) == 10, 'as contagens mudaram'
assert sum(p[1] for p in PILARES) == 100, 'os pesos não somam 100'
print('franquia-proposta.html   · 8 etapas · orçamento de R$ 35.000 em %d linhas' % len(ORCAMENTO))
print('franquia-checklist.html  · %d documentos · %d incisos · %d pilares com %d critérios'
      % (n_docs, len(COF), len(PILARES), n_crit))
print('contagens conferidas · pesos somam 100')
