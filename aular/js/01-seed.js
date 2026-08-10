/* =========================================================================
   AuLar — dados de demonstração.
   Semeado com a realidade do ABC Paulista (Santo André, São Bernardo, São
   Caetano, Diadema, Mauá, Ribeirão Pires, Rio Grande da Serra), já com a
   estrutura preparada para o Brasil inteiro (ver UFS / REGIOES).
   ========================================================================= */
'use strict';

/* ------------------------------------------------------------------ país */
var UFS = [
  {uf:'AC',nome:'Acre',reg:'Norte'},        {uf:'AL',nome:'Alagoas',reg:'Nordeste'},
  {uf:'AP',nome:'Amapá',reg:'Norte'},       {uf:'AM',nome:'Amazonas',reg:'Norte'},
  {uf:'BA',nome:'Bahia',reg:'Nordeste'},    {uf:'CE',nome:'Ceará',reg:'Nordeste'},
  {uf:'DF',nome:'Distrito Federal',reg:'Centro-Oeste'}, {uf:'ES',nome:'Espírito Santo',reg:'Sudeste'},
  {uf:'GO',nome:'Goiás',reg:'Centro-Oeste'},{uf:'MA',nome:'Maranhão',reg:'Nordeste'},
  {uf:'MT',nome:'Mato Grosso',reg:'Centro-Oeste'}, {uf:'MS',nome:'Mato Grosso do Sul',reg:'Centro-Oeste'},
  {uf:'MG',nome:'Minas Gerais',reg:'Sudeste'}, {uf:'PA',nome:'Pará',reg:'Norte'},
  {uf:'PB',nome:'Paraíba',reg:'Nordeste'},  {uf:'PR',nome:'Paraná',reg:'Sul'},
  {uf:'PE',nome:'Pernambuco',reg:'Nordeste'},{uf:'PI',nome:'Piauí',reg:'Nordeste'},
  {uf:'RJ',nome:'Rio de Janeiro',reg:'Sudeste'}, {uf:'RN',nome:'Rio Grande do Norte',reg:'Nordeste'},
  {uf:'RS',nome:'Rio Grande do Sul',reg:'Sul'}, {uf:'RO',nome:'Rondônia',reg:'Norte'},
  {uf:'RR',nome:'Roraima',reg:'Norte'},     {uf:'SC',nome:'Santa Catarina',reg:'Sul'},
  {uf:'SP',nome:'São Paulo',reg:'Sudeste'}, {uf:'SE',nome:'Sergipe',reg:'Nordeste'},
  {uf:'TO',nome:'Tocantins',reg:'Norte'}
];
/* Praças de operação. A primeira é onde tudo começa. */
var PRACAS = [
  {id:'abc', nome:'Grande ABC', uf:'SP', ativa:true,
   cidades:['Santo André','São Bernardo do Campo','São Caetano do Sul','Diadema','Mauá',
            'Ribeirão Pires','Rio Grande da Serra']},
  {id:'sp',  nome:'São Paulo capital', uf:'SP', ativa:false,
   cidades:['São Paulo']},
  {id:'litoral', nome:'Baixada Santista', uf:'SP', ativa:false,
   cidades:['Santos','São Vicente','Praia Grande','Guarujá','Cubatão']},
  {id:'camp', nome:'Campinas e região', uf:'SP', ativa:false,
   cidades:['Campinas','Valinhos','Sumaré','Hortolândia']}
];
function cidadesAtivas(){
  var r = [];
  PRACAS.forEach(function(p){ if(p.ativa) r = r.concat(p.cidades); });
  return r;
}
function todasCidades(){
  var r = [];
  PRACAS.forEach(function(p){ r = r.concat(p.cidades); });
  return unicos(r).sort();
}

/* ------------------------------------------------------------------ planos */
/* Preços pensados para a realidade das ONGs: a maioria é pequena e não tem
   caixa. O plano grátis existe de propósito — é ele que enche a vitrine, e a
   vitrine cheia é o que faz o resto do negócio girar. Ver PROJETO.md. */
var PLANOS_PADRAO = [
  { id:'gratis', nome:'Semente', preco:0, limitePets:15, limiteUsuarios:2,
    cor:'var(--tinta-3)',
    recursos:['vitrine','pets','vacinas','adocoes','doacoes'],
    lista:['Até 15 pets ativos','Vitrine pública e match','Carteira de vacinas',
           'Funil de adoção','Receber doações (Pix)'],
    naoTem:['Lares temporários','Estoque e prestação de contas','Rede de proteção',
            'Marca própria','Relatórios e exportação'] },

  { id:'protetor', nome:'Protetor', preco:39.90, limitePets:60, limiteUsuarios:4,
    cor:'var(--verde)',
    recursos:['vitrine','pets','vacinas','adocoes','doacoes','lares','estoque','relatorios'],
    lista:['Até 60 pets ativos','Tudo do Semente','Lares temporários','Controle de ração e estoque',
           'Prestação de contas automática','Cartaz do pet com QR','Exportar dados'],
    naoTem:['Rede de proteção','Marca própria','Multiusuário ilimitado'] },

  { id:'ong', nome:'ONG', preco:99.90, limitePets:300, limiteUsuarios:12, destaque:true,
    cor:'var(--caramelo)',
    recursos:['vitrine','pets','vacinas','adocoes','doacoes','lares','estoque','relatorios',
              'rede','marca','patrocinio','eventos'],
    lista:['Até 300 pets ativos','Tudo do Protetor','Rede de proteção (lista compartilhada)',
           'Marca própria na vitrine','Painel de patrocinadores e ESG','Gestão de eventos e feiras',
           'Apadrinhamento recorrente'],
    naoTem:['Contrato público / multi-unidade'] },

  { id:'rede', nome:'Rede & Prefeitura', preco:399.00, limitePets:99999, limiteUsuarios:999,
    cor:'var(--uva)',
    recursos:['vitrine','pets','vacinas','adocoes','doacoes','lares','estoque','relatorios',
              'rede','marca','patrocinio','eventos','multi','api'],
    lista:['Pets ilimitados','Tudo do ONG','Várias unidades num painel só',
           'Portal público com o domínio da prefeitura','API e integração com o CCZ',
           'Suporte com hora marcada','Treinamento da equipe'],
    naoTem:[] }
];

/* ------------------------------------------------------------------ apoio */
var PERSONALIDADES = ['brincalhão','calmo','carinhoso','protetor','curioso','tímido','independente',
  'grudento','esperto','preguiçoso','alegre','companheiro','observador','falante'];
var NECESSIDADES = ['medicação contínua','dieta especial','mobilidade reduzida','cego','surdo',
  'FIV+','FeLV+','idoso','em tratamento','pós-cirúrgico','ansiedade de separação'];

function nascPara(anos){ return maisDias(isoHoje(), -Math.round(anos*365.25)); }

/* ------------------------------------------------------------------ semear */
function semear(){
  var hj = isoHoje();
  var D = {
    versao: 1,
    criadoEm: hj,
    plataforma: {
      nome:'AuLar', dono:'Carla Caroline',
      cidade:'Santo André', uf:'SP',
      pixChave:'contato@aular.app',
      taxaDoacao: 4.9,          // % retido sobre doações processadas
      taxaPresente: 8.0,        // % sobre a lista de presentes (ração etc.)
      carenciaBloqueio: 0,      // dias de tolerância após o vencimento
      diasSuspensao: 30,        // vira "suspensa" (some da vitrine)
      diasRemocao: 90,          // remoção definitiva do perfil
      modoBloqueio: 'preserva', // 'preserva' = vitrine dos pets continua no ar
      avisoAntesRemocao: 15
    },
    planos: PLANOS_PADRAO,
    ongs: [], pets: [], pessoas: [], interesses: [], adocoes: [], doacoes: [],
    faturas: [], estoque: [], movEstoque: [], vacinas: [], eventos: [], achados: [],
    tarefas: [], atividades: [], listaRisco: [], patrocinadores: [], presentes: [],
    notificacoes: [], swipes: []
  };

  /* ---------------- ONGs (a primeira é a "sua") ---------------- */
  var ongs = [
    { nome:'Patas do ABC', cidade:'Santo André', uf:'SP', bairro:'Vila Assunção',
      cnpj:'30.361.388/0001-17', responsavel:'Carla Caroline', telefone:'11987650001',
      email:'contato@patasdoabc.org', planoId:'ong', diaVenc:10, cor:'#E9762B',
      sobre:'Somos um grupo de protetoras independentes que virou ONG em 2019. Resgatamos, tratamos, castramos e encaminhamos para adoção responsável no Grande ABC. Não temos abrigo físico: tudo acontece em lares temporários.',
      instagram:'@patasdoabc', desdeMeses:26, dono:true },

    { nome:'SOS Focinhos São Bernardo', cidade:'São Bernardo do Campo', uf:'SP', bairro:'Rudge Ramos',
      cnpj:'22.145.909/0001-40', responsavel:'Marcos Tavares', telefone:'11987650002',
      email:'sos@focinhossbc.org', planoId:'protetor', diaVenc:5, cor:'#0E9F8E',
      sobre:'Resgate e reabilitação de cães vítimas de maus-tratos. Atuamos em SBC e Diadema.',
      instagram:'@sosfocinhossbc', desdeMeses:14 },

    { nome:'Anjos de Quatro Patas', cidade:'Diadema', uf:'SP', bairro:'Centro',
      cnpj:'19.882.334/0001-05', responsavel:'Rita Nogueira', telefone:'11987650003',
      email:'anjos4patas@gmail.com', planoId:'gratis', diaVenc:20, cor:'#6C5CE7',
      sobre:'Duas protetoras, um quintal e muita vontade. Cuidamos de filhotes abandonados.',
      instagram:'@anjos4patas', desdeMeses:7 },

    { nome:'Lar Temporário Mauá', cidade:'Mauá', uf:'SP', bairro:'Jardim Zaíra',
      cnpj:'27.410.556/0001-88', responsavel:'Juliana Prado', telefone:'11987650004',
      email:'contato@lartemporariomaua.org', planoId:'protetor', diaVenc:1, cor:'#E5487E',
      sobre:'Rede de lares temporários em Mauá e Ribeirão Pires.',
      instagram:'@lartemporariomaua', desdeMeses:19, atrasoDias:6 },

    { nome:'Vira-Lata Feliz', cidade:'São Caetano do Sul', uf:'SP', bairro:'Santa Paula',
      cnpj:'31.900.221/0001-63', responsavel:'Eduardo Lima', telefone:'11987650005',
      email:'oi@viralatafeliz.org', planoId:'ong', diaVenc:15, cor:'#B07408',
      sobre:'Adoção com acompanhamento pós-adoção de 6 meses. Somos rígidos na triagem — e temos orgulho disso.',
      instagram:'@viralatafeliz', desdeMeses:31 },

    { nome:'Abrigo Esperança Animal', cidade:'Ribeirão Pires', uf:'SP', bairro:'Ouro Fino',
      cnpj:'12.775.100/0001-29', responsavel:'Sandra Beltrão', telefone:'11987650006',
      email:'esperanca@abrigoanimal.org', planoId:'gratis', diaVenc:25, cor:'#2C6FCB',
      sobre:'Abrigo físico com 60 cães. Precisamos de ração todo mês.',
      instagram:'@abrigoesperancaanimal', desdeMeses:41, atrasoDias:104 }
  ];

  ongs.forEach(function(o, ix){
    var idOng = 'ong_' + slug(o.nome).slice(0,14);
    var criada = maisMeses(hj, -o.desdeMeses);
    var venc = proximoVencimento(o.diaVenc, hj);
    if(o.atrasoDias) venc = maisDias(hj, -o.atrasoDias);
    D.ongs.push({
      id:idOng, nome:o.nome, cidade:o.cidade, uf:o.uf, bairro:o.bairro, cnpj:o.cnpj,
      responsavel:o.responsavel, telefone:o.telefone, email:o.email,
      sobre:o.sobre, instagram:o.instagram, cor:o.cor, logo:null,
      planoId:o.planoId, diaVenc:o.diaVenc, proximoVencimento:venc,
      criadaEm:criada, assinaturaDesde:criada,
      situacao:'ativa', pixChave:o.email, dono:!!o.dono,
      selos:[], transparencia:true, avisado:null
    });
  });

  /* ---------------- pets ---------------- */
  var catalogo = [
    // Patas do ABC
    {ong:0,nome:'Thor',esp:'cao',sexo:'M',porte:'grande',anos:3,cast:true,en:4,
     cor:'caramelo',pel:'curta',pers:['brincalhão','protetor','carinhoso'],
     hist:'Resgatado na Avenida dos Estados depois de um atropelamento. Passou por cirurgia no fêmur e hoje corre como se nada tivesse acontecido. Adora bola e não desgruda de quem senta no chão.',
     sc:true,sg:false,scr:true,quintal:true,soz:6,custo:280,resg:-420,onde:'Av. dos Estados, Santo André'},
    {ong:0,nome:'Mel',esp:'cao',sexo:'F',porte:'medio',anos:5,cast:true,en:2,
     cor:'preta',pel:'media',pers:['calma','carinhosa','observadora'],
     hist:'A Mel foi devolvida duas vezes por ser "quieta demais". Ela é exatamente isso: quieta. Dorme o dia todo, acompanha você até a cozinha e volta pra cama. Para quem mora em apartamento, é a companhia perfeita.',
     sc:true,sg:true,scr:true,quintal:false,soz:9,custo:190,resg:-700,onde:'Doação de tutor idoso',
     devolvida:2},
    {ong:0,nome:'Pipoca',esp:'cao',sexo:'F',porte:'pequeno',anos:0.5,cast:false,en:5,
     cor:'branca com manchas',pel:'curta',pers:['brincalhona','curiosa','alegre'],
     hist:'Filhote encontrada dentro de uma caixa perto da feira do Jardim Santo André. Cresceu com dois gatos no lar temporário e acha que é gato também.',
     sc:true,sg:true,scr:true,quintal:false,soz:3,custo:210,resg:-95,onde:'Feira do Jardim Santo André',
     urgente:true},
    {ong:0,nome:'Bartolomeu',esp:'gato',sexo:'M',porte:'medio',anos:8,cast:true,en:1,
     cor:'cinza',pel:'curta',pers:['independente','calmo','observador'],
     hist:'O Barto é FIV positivo, o que assusta muita gente sem motivo: ele pode viver muitos anos com qualidade, só precisa ficar dentro de casa e longe de brigas. É o gato mais tranquilo que já passou por aqui.',
     sc:false,sg:true,scr:true,quintal:false,soz:12,custo:170,resg:-260,onde:'Telhado da ONG',
     nec:['FIV+','idoso'],especial:true},
    {ong:0,nome:'Amora',esp:'cao',sexo:'F',porte:'medio',anos:2,cast:true,en:3,
     cor:'caramelo escuro',pel:'curta',pers:['companheira','esperta','grudenta'],
     hist:'Chegou com sarna e desnutrida, hoje está com o pelo brilhando. Aprendeu senta, deita e dá a pata em três semanas.',
     sc:true,sg:false,scr:true,quintal:false,soz:6,custo:200,resg:-180,onde:'Vila Luzita'},
    {ong:0,nome:'Nino',esp:'gato',sexo:'M',porte:'pequeno',anos:1,cast:true,en:4,
     cor:'laranja',pel:'curta',pers:['brincalhão','curioso','falante'],
     hist:'Miau constante e opinião sobre tudo. Se você trabalha em casa, ele vai participar das reuniões.',
     sc:false,sg:true,scr:true,quintal:false,soz:10,custo:150,resg:-140,onde:'Vila Assunção'},
    {ong:0,nome:'Zeca',esp:'cao',sexo:'M',porte:'grande',anos:7,cast:true,en:2,
     cor:'preto e branco',pel:'media',pers:['calmo','protetor','companheiro'],
     hist:'Sete anos esperando. O Zeca viu 40 cães saírem daqui adotados antes dele. É dócil, obediente e já está na fase da vida em que só quer um sofá e alguém por perto.',
     sc:true,sg:false,scr:true,quintal:true,soz:8,custo:260,resg:-1400,onde:'Abandonado na porta da ONG',
     nec:['idoso'],especial:true},
    {ong:0,nome:'Frida',esp:'cao',sexo:'F',porte:'pequeno',anos:4,cast:true,en:3,
     cor:'tricolor',pel:'longa',pers:['carinhosa','tímida','esperta'],
     hist:'Tem medo de homem de boné — provavelmente por causa do que passou. Com paciência, vira sombra de quem cuida dela.',
     sc:true,sg:true,scr:false,quintal:false,soz:5,custo:180,resg:-330,onde:'Resgate em Utinga'},
    // SOS Focinhos SBC
    {ong:1,nome:'Rex',esp:'cao',sexo:'M',porte:'grande',anos:4,cast:true,en:4,
     cor:'marrom',pel:'curta',pers:['protetor','esperto','companheiro'],
     hist:'Vítima de maus-tratos, ficou preso em corrente curta por anos. Hoje confia em gente de novo — é um processo lindo de ver.',
     sc:false,sg:false,scr:true,quintal:true,soz:5,custo:300,resg:-540,onde:'Denúncia em Rudge Ramos'},
    {ong:1,nome:'Luna',esp:'cao',sexo:'F',porte:'medio',anos:1.5,cast:true,en:5,
     cor:'branca',pel:'curta',pers:['brincalhona','alegre','grudenta'],
     hist:'Energia de sobra. Precisa de alguém que goste de caminhar — ela retribui em dobro.',
     sc:true,sg:true,scr:true,quintal:true,soz:4,custo:220,resg:-210,onde:'Anchieta'},
    {ong:1,nome:'Simba',esp:'gato',sexo:'M',porte:'medio',anos:2,cast:true,en:3,
     cor:'rajado',pel:'curta',pers:['independente','curioso'],
     hist:'Gato de telhado que resolveu virar gato de sofá.',
     sc:false,sg:true,scr:true,quintal:false,soz:12,custo:140,resg:-160,onde:'Centro de SBC'},
    // Anjos de Quatro Patas
    {ong:2,nome:'Bento',esp:'cao',sexo:'M',porte:'pequeno',anos:0.3,cast:false,en:5,
     cor:'caramelo',pel:'curta',pers:['brincalhão','curioso'],
     hist:'Filhote da ninhada encontrada num terreno baldio em Diadema. Tem 4 irmãos aqui também.',
     sc:true,sg:true,scr:true,quintal:false,soz:2,custo:190,resg:-60,onde:'Terreno baldio, Diadema',
     urgente:true},
    {ong:2,nome:'Cacau',esp:'cao',sexo:'F',porte:'pequeno',anos:0.3,cast:false,en:5,
     cor:'marrom',pel:'curta',pers:['alegre','curiosa'],
     hist:'Irmã do Bento. Adotar os dois juntos seria o sonho.',
     sc:true,sg:true,scr:true,quintal:false,soz:2,custo:190,resg:-60,onde:'Terreno baldio, Diadema',
     urgente:true},
    // Lar Temporário Mauá
    {ong:3,nome:'Pretinha',esp:'gato',sexo:'F',porte:'pequeno',anos:3,cast:true,en:2,
     cor:'preta',pel:'curta',pers:['calma','carinhosa'],
     hist:'Gata preta espera 3x mais para ser adotada. A Pretinha está aqui há 11 meses provando esse número.',
     sc:false,sg:true,scr:true,quintal:false,soz:11,custo:130,resg:-340,onde:'Jardim Zaíra'},
    {ong:3,nome:'Duque',esp:'cao',sexo:'M',porte:'grande',anos:6,cast:true,en:2,
     cor:'cinza',pel:'curta',pers:['calmo','protetor'],
     hist:'Cão de guarda aposentado. Precisa de espaço e de uma família paciente.',
     sc:false,sg:false,scr:false,quintal:true,soz:8,custo:290,resg:-600,onde:'Entrega voluntária'},
    // Vira-Lata Feliz
    {ong:4,nome:'Jujuba',esp:'cao',sexo:'F',porte:'pequeno',anos:2,cast:true,en:4,
     cor:'creme',pel:'media',pers:['alegre','grudenta','esperta'],
     hist:'Pequena, agitada e absolutamente convencida de que é a dona da casa.',
     sc:true,sg:true,scr:true,quintal:false,soz:5,custo:170,resg:-230,onde:'Santa Paula'},
    {ong:4,nome:'Tobias',esp:'cao',sexo:'M',porte:'medio',anos:9,cast:true,en:1,
     cor:'caramelo',pel:'curta',pers:['calmo','companheiro','preguiçoso'],
     hist:'Nove anos, artrose leve, medicação de R$ 60/mês. Em troca: o cão mais grato que você vai conhecer.',
     sc:true,sg:true,scr:true,quintal:false,soz:9,custo:240,resg:-800,onde:'Tutor faleceu',
     nec:['idoso','medicação contínua'],especial:true},
    {ong:4,nome:'Mia',esp:'gato',sexo:'F',porte:'pequeno',anos:0.6,cast:true,en:5,
     cor:'branca e cinza',pel:'curta',pers:['brincalhona','curiosa','falante'],
     hist:'Filhote elétrica. Ideal para quem já tem outro gato jovem em casa.',
     sc:false,sg:true,scr:true,quintal:false,soz:8,custo:140,resg:-90,onde:'Resgate no Nova Gerty'},
    // Abrigo Esperança
    {ong:5,nome:'Estrela',esp:'cao',sexo:'F',porte:'medio',anos:5,cast:true,en:3,
     cor:'branca com preto',pel:'media',pers:['carinhosa','observadora'],
     hist:'Está no abrigo há 3 anos. Fica no fundo do canil quando chega visita — precisa de alguém que insista.',
     sc:true,sg:false,scr:true,quintal:true,soz:7,custo:210,resg:-1100,onde:'Ouro Fino'},
    {ong:5,nome:'Bidu',esp:'cao',sexo:'M',porte:'pequeno',anos:1,cast:true,en:4,
     cor:'caramelo',pel:'curta',pers:['brincalhão','alegre','grudento'],
     hist:'Chegou com 2 meses, cresceu no abrigo. Nunca teve uma casa de verdade.',
     sc:true,sg:true,scr:true,quintal:false,soz:4,custo:180,resg:-300,onde:'Ouro Fino'}
  ];

  catalogo.forEach(function(c, ix){
    var ong = D.ongs[c.ong];
    var pid = 'pet_' + slug(c.nome) + '_' + ix;
    D.pets.push({
      id:pid, ongId:ong.id, nome:c.nome, especie:c.esp, sexo:c.sexo, porte:c.porte,
      nascimento:nascPara(c.anos), castrado:c.cast, cor:c.cor, pelagem:c.pel,
      microchip:c.cast ? '982000' + (100000+ix*137) : null,
      rga:(c.cast && ix%3===0) ? 'RGA-SP-' + (20260000+ix) : null,
      status:'disponivel', fotos:[fotoGerada(c.nome + ix, c.esp)],
      historia:c.hist, personalidade:c.pers, necessidades:c.nec || [],
      energia:c.en, sociavelCaes:c.sc, sociavelGatos:c.sg, sociavelCriancas:c.scr,
      precisaQuintal:c.quintal, tempoSozinho:c.soz, custoMensal:c.custo,
      resgatadoEm:maisDias(hj, c.resg), resgatadoOnde:c.onde,
      urgente:!!c.urgente, especial:!!c.especial, devolucoes:c.devolvida || 0,
      peso: c.porte==='grande'?28:(c.porte==='medio'?14:6),
      larTemporarioId:null, visualizacoes: 40 + (ix*17) % 260, curtidas: 3 + (ix*7) % 40
    });
    gerarVacinas(D, pid, ong.id, c.esp, nascPara(c.anos));
  });

  /* ---------------- pessoas ---------------- */
  var pessoas = [
    {nome:'Ana Beatriz Souza',cid:'Santo André',tel:'11991110001',papeis:['adotante'],
     perfil:{moradia:'apartamento',metros:'medio',quintal:false,horasFora:8,criancas:false,
             outrosPets:'nenhum',experiencia:'primeira',exercicio:'medio',orcamento:250,
             portePref:'qualquer',idadePref:'qualquer',especiePref:'cao'}},
    {nome:'Rodrigo Almeida',cid:'São Bernardo do Campo',tel:'11991110002',papeis:['adotante','doador'],
     perfil:{moradia:'casa',metros:'grande',quintal:true,horasFora:5,criancas:true,
             outrosPets:'cao',experiencia:'muita',exercicio:'alto',orcamento:400,
             portePref:'grande',idadePref:'adulto',especiePref:'cao'}},
    {nome:'Fernanda Lopes',cid:'São Caetano do Sul',tel:'11991110003',papeis:['adotante','lar'],
     perfil:{moradia:'apartamento',metros:'pequeno',quintal:false,horasFora:10,criancas:false,
             outrosPets:'gato',experiencia:'alguma',exercicio:'baixo',orcamento:200,
             portePref:'pequeno',idadePref:'adulto',especiePref:'gato'}},
    {nome:'Carlos Mendes',cid:'Diadema',tel:'11991110004',papeis:['doador']},
    {nome:'Patrícia Ramos',cid:'Mauá',tel:'11991110005',papeis:['lar','voluntario']},
    {nome:'Juliana Castro',cid:'Santo André',tel:'11991110006',papeis:['lar']},
    {nome:'Marcelo Dias',cid:'Santo André',tel:'11991110007',papeis:['doador','voluntario']},
    {nome:'Beatriz Nunes',cid:'São Bernardo do Campo',tel:'11991110008',papeis:['adotante'],
     perfil:{moradia:'apartamento',metros:'medio',quintal:false,horasFora:4,criancas:false,
             outrosPets:'nenhum',experiencia:'alguma',exercicio:'alto',orcamento:300,
             portePref:'medio',idadePref:'filhote',especiePref:'cao'}},
    {nome:'Ricardo Tanaka',cid:'São Caetano do Sul',tel:'11991110009',papeis:['doador']},
    {nome:'Luana Ferreira',cid:'Ribeirão Pires',tel:'11991110010',papeis:['adotante','doador'],
     perfil:{moradia:'casa',metros:'medio',quintal:true,horasFora:6,criancas:true,
             outrosPets:'nenhum',experiencia:'primeira',exercicio:'medio',orcamento:280,
             portePref:'medio',idadePref:'adulto',especiePref:'qualquer'}}
  ];
  pessoas.forEach(function(p, ix){
    D.pessoas.push({
      id:'p_' + slug(p.nome).slice(0,12) + ix,
      nome:p.nome, email:slug(p.nome).replace(/-/g,'.') + '@email.com',
      telefone:p.tel, cpf:null, cidade:p.cid, uf:'SP',
      papeis:p.papeis, perfil:p.perfil || null, foto:null,
      criadoEm:maisDias(hj, -(20 + ix*11)), consentimentoLGPD:true,
      lar: p.papeis.indexOf('lar') >= 0 ? {
        ativo:true, capacidade: 1 + (ix % 3),
        aceita: ix % 2 ? ['cao','gato'] : ['gato'],
        porteMax: ix % 2 ? 'medio' : 'pequeno',
        desde: maisDias(hj, -(90 + ix*20)), ocupadas: 0
      } : null
    });
  });

  /* lares temporários ocupados */
  var lares = filtrar(D.pessoas, function(p){ return p.lar; });
  [2,4,7].forEach(function(petIx, i){
    if(D.pets[petIx] && lares[i]){
      D.pets[petIx].larTemporarioId = lares[i].id;
      lares[i].lar.ocupadas = 1;
    }
  });

  /* ---------------- interesses (funil) ---------------- */
  var etapas = ['interesse','triagem','entrevista','visita','termo','entregue'];
  [[0,0,'entrevista',-9],[0,7,'interesse',-2],[1,0,'triagem',-5],[4,1,'visita',-14],
   [6,8,'interesse',-1],[8,1,'triagem',-4],[9,7,'entrevista',-7],[15,2,'interesse',-3],
   [16,9,'visita',-11],[19,0,'interesse',-1]
  ].forEach(function(t, ix){
    var pet = D.pets[t[0]], pes = D.pessoas[t[1]];
    if(!pet || !pes) return;
    D.interesses.push({
      id:'int_' + ix, petId:pet.id, pessoaId:pes.id, ongId:pet.ongId,
      etapa:t[2], criadoEm:maisDias(hj, t[3]), atualizadoEm:maisDias(hj, t[3]+1),
      score: pes.perfil ? compatibilidade(pes.perfil, pet).score : null,
      visita:null, notas:[], origem: ix % 3 === 0 ? 'vitrine' : (ix % 3 === 1 ? 'feira' : 'indicação')
    });
    if(t[2] !== 'interesse') pet.status = 'em_processo';
  });

  /* ---------------- adoções concluídas ---------------- */
  for(var a=0;a<14;a++){
    var ongA = D.ongs[a % 5];
    var quando = maisDias(hj, -(15 + a*19));
    D.adocoes.push({
      id:'ado_' + a, ongId:ongA.id,
      petNome: ['Tico','Nala','Bob','Lola','Fumaça','Pingo','Maya','Chico','Nina','Bolt',
                'Suzi','Toby','Kiara','Max'][a],
      petEspecie: a % 4 === 0 ? 'gato' : 'cao',
      pessoaId: D.pessoas[a % D.pessoas.length].id,
      pessoaNome: D.pessoas[a % D.pessoas.length].nome,
      data:quando, termoAssinado:true, devolvido: a === 11,
      acompanhamentos: montarAcompanhamentos(quando, hj)
    });
  }

  /* ---------------- doações ---------------- */
  var meios = ['pix','credito','debito'];
  for(var d=0; d<70; d++){
    var ongD = D.ongs[d % 5];
    var recorrente = d % 4 === 0;
    var apadrinha = d % 9 === 0;
    var valor = apadrinha ? [30,50,80][d%3] : (recorrente ? [20,30,50,100][d%4] : [10,25,50,100,200,500][d%6]);
    var quando2 = maisDias(hj, -Math.floor(d*1.6));
    D.doacoes.push({
      id:'doa_' + d, ongId:ongD.id,
      pessoaId: D.pessoas[d % D.pessoas.length].id,
      pessoaNome: D.pessoas[d % D.pessoas.length].nome,
      tipo: apadrinha ? 'apadrinhamento' : (recorrente ? 'recorrente' : 'unica'),
      meio: apadrinha || recorrente ? (d % 2 ? 'pix_automatico' : 'credito') : meios[d % 3],
      valor:valor, data:quando2, status:'confirmada',
      petId: apadrinha ? D.pets[d % D.pets.length].id : null,
      taxa: Math.round(valor * D.plataforma.taxaDoacao) / 100,
      coberta: d % 3 === 0
    });
  }

  /* ---------------- estoque de ração ---------------- */
  D.ongs.forEach(function(o, ix){
    var qtdPets = filtrar(D.pets, function(p){ return p.ongId === o.id; }).length || 1;
    [['Ração adulto premium','racao','kg', 15*qtdPets, 0.35*qtdPets],
     ['Ração filhote','racao','kg', 6, 0.9],
     ['Ração gatos','racao','kg', 8, 0.3],
     ['Areia sanitária','higiene','kg', 12, 0.6],
     ['Vermífugo','medicamento','un', 9, 0.12],
     ['Antipulgas','medicamento','un', 5, 0.15]
    ].forEach(function(it, j){
      var qtd = Math.round(it[3] * (ix===5 ? 0.25 : (ix===2 ? 0.5 : 1)));
      D.estoque.push({
        id:'est_' + ix + '_' + j, ongId:o.id, item:it[0], tipo:it[1], unidade:it[2],
        quantidade:qtd, minimo:Math.round(it[4]*14), consumoDia:Math.round(it[4]*100)/100
      });
    });
  });

  /* ---------------- lista de presentes (doação de ração) ---------------- */
  D.ongs.forEach(function(o, ix){
    [['Saco de ração adulto 15kg', 189.90, 6, 'Cobasi Santo André'],
     ['Saco de ração filhote 10,1kg', 174.90, 4, 'Petz São Bernardo'],
     ['Caixa de areia sanitária 12kg', 45.00, 5, 'Agropet ABC'],
     ['Vermífugo (cartela)', 38.00, 10, 'Farmácia Veterinária ABC']
    ].forEach(function(g, j){
      D.presentes.push({
        id:'pre_' + ix + '_' + j, ongId:o.id, item:g[0], precoUnit:g[1],
        meta:g[2], recebidos: Math.max(0, (ix + j) % (g[2]+1) - 1), parceiro:g[3]
      });
    });
  });

  /* ---------------- eventos (agenda pública real do ABC) ---------------- */
  var domingoFinal = ultimoDomingoDoMes(hj);
  D.eventos = [
    {id:'ev1', ongId:D.ongs[0].id, tipo:'feira', titulo:'Feira de adoção "Eu amo, eu adoto"',
     data:domingoFinal, hora:'10:00', local:'Tenda azul do Parque Central',
     cidade:'Santo André', uf:'SP', publico:true, vagas:40, inscritos:0,
     obs:'Feira mensal da Prefeitura de Santo André. Acontece no último domingo do mês.'},
    {id:'ev2', ongId:D.ongs[0].id, tipo:'castracao', titulo:'Castramóvel — mutirão de castração',
     data:maisDias(hj, 12), hora:'08:00', local:'Praça do Jardim Santo André',
     cidade:'Santo André', uf:'SP', publico:true, vagas:20, inscritos:0,
     obs:'Unidade móvel da Prefeitura. Agendamento pelo site da prefeitura; a ONG leva os resgatados.'},
    {id:'ev3', ongId:D.ongs[1].id, tipo:'feira', titulo:'Feira de adoção do Shopping ABC',
     data:maisDias(hj, 6), hora:'11:00', local:'Praça de eventos, piso térreo',
     cidade:'Santo André', uf:'SP', publico:true, vagas:25, inscritos:0, obs:''},
    {id:'ev4', ongId:D.ongs[3].id, tipo:'castracao', titulo:'Castração gratuita — Castramóvel Mauá',
     data:maisDias(hj, 4), hora:'09:00', local:'Jardim Zaíra',
     cidade:'Mauá', uf:'SP', publico:true, vagas:30, inscritos:0,
     obs:'A Prefeitura de Mauá oferece castração gratuita aos domingos.'},
    {id:'ev5', ongId:D.ongs[0].id, tipo:'mutirao', titulo:'Mutirão de banho e vermifugação',
     data:maisDias(hj, 19), hora:'09:00', local:'Sede da ONG — Vila Assunção',
     cidade:'Santo André', uf:'SP', publico:false, vagas:12, inscritos:0, obs:'Só voluntários.'},
    {id:'ev6', ongId:D.ongs[4].id, tipo:'feira', titulo:'Adote um vira-lata — Praça da Igreja',
     data:maisDias(hj, 27), hora:'10:00', local:'Praça da Matriz',
     cidade:'São Caetano do Sul', uf:'SP', publico:true, vagas:18, inscritos:0, obs:''}
  ];

  /* ---------------- achados e perdidos ---------------- */
  D.achados = [
    {id:'ac1', tipo:'perdido', especie:'cao', nome:'Bidu', descricao:'Caramelo pequeno, coleira vermelha, muito medroso. Sumiu na altura da Rua Oratório.',
     cidade:'Santo André', uf:'SP', bairro:'Vila Guiomar', data:maisDias(hj,-3),
     contato:'11994440001', foto:fotoGerada('perdido-bidu','cao'), resolvido:false, recompensa:300},
    {id:'ac2', tipo:'encontrado', especie:'gato', nome:null, descricao:'Gata tricolor, adulta, muito dócil, sem coleira. Está comigo em casa.',
     cidade:'São Bernardo do Campo', uf:'SP', bairro:'Rudge Ramos', data:maisDias(hj,-1),
     contato:'11994440002', foto:fotoGerada('achado-gata','gato'), resolvido:false, recompensa:0},
    {id:'ac3', tipo:'perdido', especie:'cao', nome:'Nina', descricao:'Pastora idosa, surda, tem microchip. Fugiu no barulho dos fogos.',
     cidade:'Diadema', uf:'SP', bairro:'Centro', data:maisDias(hj,-8),
     contato:'11994440003', foto:fotoGerada('perdido-nina','cao'), resolvido:true, recompensa:500}
  ];

  /* ---------------- rede de proteção (lista de risco compartilhada) ---------------- */
  D.listaRisco = [
    {id:'lr1', ongId:D.ongs[4].id, nomeRef:'R. S. M.', cpfParcial:'***.412.***-08',
     motivo:'Adotou 3 animais em ONGs diferentes em 40 dias e revendeu dois em grupo de venda.',
     gravidade:'alta', data:maisDias(hj,-52), confirmadaPor:2},
    {id:'lr2', ongId:D.ongs[1].id, nomeRef:'J. P. A.', cpfParcial:'***.888.***-21',
     motivo:'Devolveu 2 cães alegando "não deu certo" em menos de 15 dias, ambos com sinais de desnutrição.',
     gravidade:'media', data:maisDias(hj,-120), confirmadaPor:1}
  ];

  /* ---------------- patrocinadores ---------------- */
  D.patrocinadores = [
    {id:'pat1', ongId:D.ongs[0].id, nome:'Clínica VetLar Santo André', tipo:'servico',
     valor:800, desde:maisMeses(hj,-8), contrapartida:'Consultas e vacinas com 40% de desconto'},
    {id:'pat2', ongId:D.ongs[0].id, nome:'Metalúrgica Prisma (ESG)', tipo:'dinheiro',
     valor:1500, desde:maisMeses(hj,-4), contrapartida:'Logo na vitrine + relatório de impacto trimestral'},
    {id:'pat3', ongId:D.ongs[4].id, nome:'Pet Shop Amigo Fiel', tipo:'racao',
     valor:600, desde:maisMeses(hj,-11), contrapartida:'40kg de ração/mês'}
  ];

  /* ---------------- tarefas ---------------- */
  D.tarefas = [
    {id:'t1', ongId:D.ongs[0].id, titulo:'Levar Pipoca para castrar', prazo:maisDias(hj,2),
     responsavel:'Patrícia Ramos', feito:false, tipo:'veterinario'},
    {id:'t2', ongId:D.ongs[0].id, titulo:'Comprar ração — estoque acaba semana que vem',
     prazo:maisDias(hj,4), responsavel:'Carla Caroline', feito:false, tipo:'compras'},
    {id:'t3', ongId:D.ongs[0].id, titulo:'Ligar para adotante da Mel (pós-adoção 30 dias)',
     prazo:maisDias(hj,-1), responsavel:'Carla Caroline', feito:false, tipo:'pos-adocao'},
    {id:'t4', ongId:D.ongs[0].id, titulo:'Montar cartazes para a feira do Parque Central',
     prazo:maisDias(hj,5), responsavel:'Marcelo Dias', feito:false, tipo:'evento'},
    {id:'t5', ongId:D.ongs[0].id, titulo:'Renovar vermífugo do Thor', prazo:maisDias(hj,-4),
     responsavel:'Carla Caroline', feito:true, tipo:'veterinario'}
  ];

  /* ---------------- faturas (histórico + a atual) ---------------- */
  D.ongs.forEach(function(o){
    var plano = achar(D.planos, o.planoId);
    if(!plano || plano.preco === 0) return;
    for(var m = 6; m >= 0; m--){
      var comp = maisMeses(hj, -m);
      var vence = comp.slice(0,8) + ('0'+o.diaVenc).slice(-2);
      var atrasada = difDias(vence, hj) > 0;
      var pagou = m > 0 || !atrasada;
      // ONGs com atraso não pagaram as últimas
      if(o.nome.indexOf('Mauá') >= 0 && m === 0) pagou = false;
      if(o.nome.indexOf('Esperança') >= 0 && m <= 3) pagou = false;
      D.faturas.push({
        id:'fat_' + o.id + '_' + m, ongId:o.id, competencia:comp.slice(0,7),
        valor:plano.preco, vence:vence,
        pagoEm: pagou ? maisDias(vence, -(m % 3)) : null,
        meio: pagou ? (m % 2 ? 'pix_automatico' : 'credito') : null,
        status: pagou ? 'paga' : (atrasada ? 'atrasada' : 'aberta')
      });
    }
  });

  /* ---------------- atividades ---------------- */
  D.atividades = [];
  D.ongs.forEach(function(o){
    registrarEm(D, o.id, 'sistema', 'Conta criada no AuLar', maisDias(o.criadaEm, 0));
  });

  return D;
}

/* ------------------------------------------------------------------ apoio do seed */
function registrarEm(D, ongId, tipo, texto, quando){
  D.atividades.unshift({ id:id('at'), ongId:ongId, tipo:tipo, texto:texto,
    quando:quando || isoHoje(), carimbo:Date.now() });
}
function proximoVencimento(dia, ref){
  var d = data(ref), alvo = new Date(d.getFullYear(), d.getMonth(), dia);
  if(alvo < d) alvo = new Date(d.getFullYear(), d.getMonth()+1, dia);
  return iso(alvo);
}
function ultimoDomingoDoMes(ref){
  var d = data(ref);
  var fim = new Date(d.getFullYear(), d.getMonth()+1, 0);
  while(fim.getDay() !== 0) fim.setDate(fim.getDate()-1);
  if(iso(fim) < ref){                       // já passou: pega o do mês que vem
    fim = new Date(d.getFullYear(), d.getMonth()+2, 0);
    while(fim.getDay() !== 0) fim.setDate(fim.getDate()-1);
  }
  return iso(fim);
}
function montarAcompanhamentos(adocao, hj){
  var marcos = [7, 30, 90, 180], r = [];
  marcos.forEach(function(dias){
    var quando = maisDias(adocao, dias);
    r.push({
      dias:dias, previsto:quando,
      feito: difDias(quando, hj) >= 0,
      nota: difDias(quando, hj) >= 0 ? sorteio([
        'Adaptação ótima. Mandou fotos no sofá.',
        'Estranhou os primeiros dias, agora dorme na cama.',
        'Ganhou peso, pelo brilhando.',
        'Já fez amizade com o gato da casa.',
        'Tutor pediu orientação sobre ansiedade. Encaminhado para adestrador parceiro.'
      ]) : null
    });
  });
  return r;
}
