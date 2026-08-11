/* =========================================================================
   P de PATA — site de divulgação, a tela que vem antes do portal.

   É a porta de entrada: quem chega pela primeira vez cai aqui, entende o que
   é, para quem serve e quanto custa, e só então entra no sistema. Os números
   exibidos saem da própria base — em produção, do banco real. Nada de número
   inventado em página de venda.
   ========================================================================= */
'use strict';

var SITE_VISTO = 'pdepata_site_visto';

function mostrarSite(){
  var el = $('#site');
  el.innerHTML = montarSite();
  el.style.display = '';
  el.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  observarEntrada();
}
function entrarNoPortal(){
  $('#site').style.display = 'none';
  document.body.style.overflow = '';
  try{ localStorage.setItem(SITE_VISTO, '1'); }catch(e){}
  if(!SESSAO.papel) $('#login').style.display = '';
}
function voltarAoSite(){
  $('#login').style.display = 'none';
  mostrarSite();
}
/** Revela os blocos conforme entram na tela. Sem biblioteca. */
function observarEntrada(){
  var alvos = $$('#site .sobe');
  if(!window.IntersectionObserver){ alvos.forEach(function(a){ a.classList.add('ver'); }); return; }
  var obs = new IntersectionObserver(function(ents){
    ents.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('ver'); obs.unobserve(e.target); } });
  }, { rootMargin:'0px 0px -60px 0px', threshold:0.05 });
  alvos.forEach(function(a){ obs.observe(a); });
}

/* ------------------------------------------------------------------ conteúdo */
function montarSite(){
  var pets = filtrar(DB.pets, function(p){ return p.status !== 'adotado' && p.status !== 'obito'; });
  var destaque = ordenar(filtrar(petsVisiveis(), function(p){ return p.especie === 'cao'; }),
                         function(p){ return p.resgatadoEm; })[0] || DB.pets[0];
  var cidades = unicos(DB.ongs.map(function(o){ return o.cidade; })).length;
  var adocoes = DB.adocoes.length;
  var certificadas = filtrar(DB.ongs, function(o){ return certificada(o); }).length;

  return '' +
  cabecalhoSite() +
  heroiSite(destaque, pets.length, cidades) +
  numerosSite() +
  paraQuemSite() +
  diferenciaisSite() +
  fundoSite(certificadas) +
  planosSite() +
  provaSite(pets.length, adocoes, cidades) +
  perguntasSite() +
  chamadaFinalSite() +
  rodapeSite();
}

function cabecalhoSite(){
  return '<header class="topo"><div class="env">' +
    '<a class="marca" href="#topo">' + logoTrava(36) + '</a>' +
    '<nav class="menu">' +
      '<a href="#para-quem">Para quem é</a>' +
      '<a href="#diferenca">O que muda</a>' +
      '<a href="#fundo">Fundo de Impacto</a>' +
      '<a href="#planos">Planos</a>' +
      '<a href="#perguntas">Perguntas</a>' +
    '</nav>' +
    '<button class="bt bt-p" onclick="entrarNoPortal()">Entrar no sistema →</button>' +
  '</div></header>';
}

function heroiSite(pet, qtdPets, cidades){
  return '<section class="heroi" id="topo"><div class="env">' +
    '<div>' +
      '<span class="rot">Grande ABC · São Paulo</span>' +
      '<h1>Conectando vidas,<br>transformando <em>histórias</em>.</h1>' +
      '<p class="sub">O P de PATA junta as duas pontas: um lugar onde as pessoas encontram o animal que ' +
        'realmente combina com a vida delas, e a ferramenta que faz a organização parar de trabalhar ' +
        'em caderno e planilha.</p>' +
      '<div class="pilares">' + MARCA.pilares.map(function(p){
        return '<span style="color:' + p.cor + '">' + p.txt + '</span>'; }).join('') + '</div>' +
      '<div class="acoes">' +
        '<button class="bt" onclick="entrarNoPortal();setTimeout(function(){entrar(\'adotante\')},60)">' +
          '🧭 Quero adotar</button>' +
        '<button class="bt bt-2" onclick="entrarNoPortal()">🏢 Sou ONG ou protetor</button>' +
      '</div>' +
      '<p class="nota">Grátis para começar · ' + qtdPets + ' animais esperando em ' + cidades + ' cidades</p>' +
    '</div>' +
    '<div><div class="ficha"><div class="fita"></div>' +
      '<div class="foto" style="' + estiloFoto(pet) + '"></div>' +
      '<div class="nm">' + esc(pet.nome) + '</div>' +
      '<div class="ln"><span>idade</span><b>' + idadeTexto(pet.nascimento) + '</b></div>' +
      '<div class="ln"><span>porte</span><b>' + rotuloPorte(pet.porte) + '</b></div>' +
      '<div class="ln"><span>esperando há</span><b>' +
        Math.max(1, Math.floor(difDias(pet.resgatadoEm, isoHoje())/30)) + ' meses</b></div>' +
      '<div class="ln" style="border:0"><span>combina com você?</span><b>faça o teste</b></div>' +
      '<div class="selo">Vacinas em dia</div>' +
    '</div></div>' +
  '</div></section>';
}

function numerosSite(){
  return '<div class="numeros"><div class="env">' +
    '<div class="g">' +
      numSite('4,8 mi', 'cães e gatos em situação de vulnerabilidade no Brasil') +
      numSite('201 mil', 'animais sob cuidado de ONGs e protetores independentes') +
      numSite('~400', 'ONGs formais no país — 45% delas no Sudeste') +
      numSite('R$ 81 bi', 'movimentados pelo setor pet em 2026') +
    '</div>' +
    '<p class="fonte">Fontes: Instituto Pet Brasil e Abempet. ' +
      'A conta é simples e incômoda: sobra dinheiro no mercado pet e falta estrutura em quem cuida.</p>' +
  '</div></div>';
}
function numSite(n_, l){
  return '<div class="sobe"><div class="n">' + n_ + '</div><div class="l">' + l + '</div></div>';
}

function paraQuemSite(){
  return '<section id="para-quem"><div class="env">' +
    '<div class="cab sobe"><span class="rot">Para quem é</span>' +
      '<h2>Três pessoas diferentes, o mesmo lugar</h2>' +
      '<p>Cada uma entra por uma porta e enxerga só o que precisa.</p></div>' +
    '<div class="grade g3">' +
      cartaoPublico('🧭', 'Quero adotar', 'Você responde 13 perguntas sobre a sua rotina de verdade — ' +
        'espaço, horas fora de casa, orçamento — e a fila se reorganiza.',
        ['Cada animal mostra a nota de compatibilidade e o motivo dela',
         'Diz também o que vai dar trabalho, não só o que encanta',
         'Você acompanha cada etapa até a entrega'],
        'Começar a procurar', "entrarNoPortal();setTimeout(function(){entrar('adotante')},60)") +
      cartaoPublico('🏢', 'Sou ONG ou protetor', 'Sai do caderno e da planilha. Cadastro dos animais, ' +
        'calendário de vacinas montado sozinho, funil de adoção e prestação de contas.',
        ['Grátis até 15 animais, sem prazo e sem cartão',
         'Calendário de vacinas gerado pelo protocolo brasileiro',
         'Rede de proteção compartilhada entre as organizações'],
        'Ver os planos', "document.querySelector('#planos').scrollIntoView({behavior:'smooth'})") +
      cartaoPublico('🏭', 'Sou empresa', 'Associe a marca a impacto que dá para auditar — e leve o ' +
        'relatório pronto para o balanço de sustentabilidade.',
        ['Cotas de patrocínio a partir de R$ 490/mês',
         'Relatório ESG com números reais, não estimativa',
         'Presença nas feiras de adoção da região'],
        'Falar sobre patrocínio', "entrarNoPortal();setTimeout(function(){entrar('adotante');ir('apoiar')},80)") +
    '</div>' +
  '</div></section>';
}
function cartaoPublico(ico, titulo, texto, itens, botao, acao){
  return '<div class="cartao sobe"><span class="ico">' + ico + '</span>' +
    '<h3>' + titulo + '</h3><p>' + texto + '</p>' +
    '<ul>' + itens.map(function(i){ return '<li>' + i + '</li>'; }).join('') + '</ul>' +
    '<div class="pe"><button class="bt bt-2 bt-p" onclick="' + acao + '">' + botao + '</button></div></div>';
}

function diferenciaisSite(){
  var itens = [
    ['01', 'A nota de compatibilidade, não só a foto',
     'Aplicativo de adoção que só mostra foto e deixa deslizar gera muito interesse e muita devolução — ' +
     'o animal volta, ocupa vaga de novo e a pessoa vai embora frustrada. Aqui o deslizar continua, mas ' +
     'cada animal chega com uma nota calculada sobre o que faz uma adoção durar: espaço, horas sozinho, ' +
     'energia, convivência, experiência e orçamento. E a nota <span class="marca-txt">fala em português</span>: ' +
     '“ele sofre depois de 4h sozinho, e você fica fora 9h”.'],
    ['02', 'O calendário de vacinas que você não digita',
     'Ao cadastrar o animal, o sistema já sabe o protocolo brasileiro — V10 ou V4, antirrábica, gripe, ' +
     'giárdia, vermífugo, antipulgas —, calcula as datas pela idade e encadeia os reforços. Você só ' +
     'confirma a aplicação. <span class="marca-txt">A prescrição continua sendo do veterinário</span>; ' +
     'o sistema organiza.'],
    ['03', 'A rede de proteção entre as organizações',
     'Quem revende filhote ou maltrata não volta na mesma ONG: vai na próxima, na cidade vizinha, que ' +
     'não tem como saber. No P de PATA a ocorrência registrada por uma organização vira ' +
     '<span class="marca-txt">alerta para todas as outras no momento exato da triagem</span>. ' +
     'Guarda só iniciais e CPF parcial, exige descrição do fato e não é veto automático — a decisão ' +
     'continua sendo de cada ONG.'],
    ['04', 'O acompanhamento que evita a devolução',
     'Quase toda devolução acontece nos primeiros 90 dias, e quase sempre por algo que uma conversa ' +
     'resolveria: xixi fora do lugar, latido, ciúme do gato. Assim que a adoção é concluída, o sistema ' +
     '<span class="marca-txt">agenda sozinho os contatos de 7, 30, 90 e 180 dias</span>.']
  ];
  return '<section class="faixa" id="diferenca"><div class="env">' +
    '<div class="cab sobe"><span class="rot">O que muda na prática</span>' +
      '<h2>Quatro coisas que ninguém mais faz</h2>' +
      '<p>Não é lista de recurso. É o que decide se o animal fica na casa nova.</p></div>' +
    itens.map(function(i){
      return '<div class="dif sobe"><div class="num">' + i[0] + '</div>' +
        '<div><h3>' + i[1] + '</h3><p>' + i[2] + '</p></div></div>';
    }).join('') +
  '</div></section>';
}

function fundoSite(certificadas){
  return '<section id="fundo"><div class="env">' +
    '<div class="cab sobe"><span class="rot">Fundo de Impacto</span>' +
      '<h2>Quer ajudar mas não sabe em quem confiar?</h2>' +
      '<p>Essa é a dúvida que trava a maioria das doações. O Fundo resolve com critério, não com ' +
      'simpatia: você doa uma vez e o valor é dividido todo mês entre as organizações que provaram ' +
      'trabalho — e o extrato de quem recebeu o quê fica público.</p></div>' +
    '<div class="grade g3">' +
      '<div class="cartao sobe"><span class="ico">📋</span><h3>Como se ganha o selo</h3>' +
        '<p>Nove critérios calculados ao vivo sobre dados que a ONG já alimenta:</p>' +
        '<ul><li>Presta contas em público</li><li>Saúde dos animais em dia</li>' +
        '<li>Acompanha depois da adoção</li><li>Poucas devoluções e resposta rápida</li>' +
        '<li>Castração, microchip e RGA</li></ul></div>' +
      '<div class="cartao sobe"><span class="ico">➗</span><h3>Como o dinheiro é dividido</h3>' +
        '<p>A regra fica publicada e não muda caso a caso:</p>' +
        '<ul><li><b>60%</b> pela necessidade — quantos animais a ONG tem sob cuidado</li>' +
        '<li><b>40%</b> pelo mérito — a nota do selo</li>' +
        '<li><b>12%</b> de gestão ficam com o P de PATA, e isso aparece na tela antes de você confirmar</li></ul></div>' +
      '<div class="cartao sobe"><span class="ico">🚫</span><h3>O que dinheiro não compra</h3>' +
        '<p>O plano contratado <b>não vale um único ponto</b> no selo. Uma ONG do plano gratuito pode ' +
        'ter nota maior que uma do plano mais caro — e receber mais por isso.</p>' +
        '<p>No dia em que pagar mensalidade melhorar a nota, a nota deixa de valer.</p></div>' +
    '</div>' +
    '<div class="sobe" style="margin-top:32px;display:flex;gap:14px;flex-wrap:wrap;align-items:center">' +
      '<button class="bt" onclick="entrarNoPortal();setTimeout(function(){entrar(\'adotante\');ir(\'fundo\')},80)">' +
        'Ver o Fundo por dentro</button>' +
      '<span style="font-size:14px;color:var(--tinta-3)">' + certificadas +
        ' organizações certificadas neste momento</span>' +
    '</div>' +
  '</div></section>';
}

function planosSite(){
  return '<section id="planos"><div class="env">' +
    '<div class="cab sobe"><span class="rot">Planos</span>' +
      '<h2>Grátis de verdade para quem está começando</h2>' +
      '<p>O plano gratuito não tem prazo, não pede cartão e não é versão capada de demonstração. ' +
      'Ele existe porque vitrine cheia é o que traz adotante — e porque protetor pequeno não tem caixa.</p></div>' +
    '<div class="grade g4">' +
      DB.planos.map(function(p){
        return '<div class="plano-s sobe ' + (p.destaque ? 'dest' : '') + '">' +
          (p.destaque ? '<span class="et">mais escolhido</span>' : '') +
          '<h3>' + p.nome + '</h3>' +
          '<div class="pr">' + (p.preco ? brl(p.preco).replace(',00','') : 'Grátis') +
            (p.preco ? '<small>/mês</small>' : '') + '</div>' +
          '<ul>' + p.lista.slice(0,5).map(function(l){ return '<li>' + l + '</li>'; }).join('') + '</ul>' +
          '<button class="bt bt-2 bt-p" onclick="entrarNoPortal()">Começar</button>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<p class="sobe" style="margin-top:24px;font-size:14px;color:var(--tinta-3);max-width:52em">' +
      'A cobrança é mensal e o cancelamento é imediato. Se a mensalidade atrasar, o sistema bloqueia — ' +
      'mas as páginas dos animais que já estão publicados continuam no ar, para que nenhuma adoção se ' +
      'perca por causa de uma fatura. Seus dados são seus: dá para baixar tudo em um clique, ' +
      'inclusive com a conta bloqueada.</p>' +
  '</div></section>';
}

function provaSite(qtdPets, adocoes, cidades){
  return '<section class="faixa"><div class="env">' +
    '<div class="cab sobe"><span class="rot">Onde já está rodando</span>' +
      '<h2>Começando pelo ABC, pronto para o Brasil</h2>' +
      '<p>Adoção é mercado local: ninguém atravessa o estado para conhecer um cão. Por isso abrimos ' +
      'praça por praça, com densidade — várias ONGs, muitos lares temporários e público suficiente ' +
      'para a vitrine parecer viva. O cadastro já aceita as 27 unidades da federação.</p></div>' +
    '<div class="grade g3">' +
      '<div class="cartao sobe"><span class="ico">🐾</span><h3>' + qtdPets + ' animais</h3>' +
        '<p>sob cuidado das organizações da rede, com ficha completa e vacinas acompanhadas</p></div>' +
      '<div class="cartao sobe"><span class="ico">🏡</span><h3>' + adocoes + ' adoções</h3>' +
        '<p>concluídas com termo assinado e acompanhamento pós-adoção agendado</p></div>' +
      '<div class="cartao sobe"><span class="ico">📍</span><h3>' + cidades + ' cidades</h3>' +
        '<p>no Grande ABC, com a agenda das feiras e dos mutirões de castração das prefeituras</p></div>' +
    '</div>' +
  '</div></section>';
}

function perguntasSite(){
  var qs = [
    ['O sistema é realmente gratuito?',
     'O plano Semente é gratuito, sem prazo e sem cartão de crédito: até 15 animais ativos, vitrine ' +
     'pública, carteira de vacinas, funil de adoção e recebimento de doações por Pix. Você só paga se ' +
     'crescer e precisar de mais — e, mesmo aí, a mensalidade começa em R$ 39,90.'],
    ['Como o P de PATA se sustenta, então?',
     'O P de PATA é uma empresa, não uma ONG, e isso está dito em todas as telas. Ela vive de mensalidade ' +
     'de quem pode pagar, de uma taxa de serviço sobre as doações processadas, da gestão do Fundo de ' +
     'Impacto e de patrocínio de empresas. O que nunca acontece é dinheiro mudar de dono sem aviso: ' +
     'em cada tela de doação você vê exatamente quanto vai para a ONG e quanto fica com a plataforma, ' +
     'antes de confirmar.'],
    ['E se eu atrasar a mensalidade?',
     'O acesso à gestão é bloqueado, mas as páginas dos animais já publicados continuam no ar até 30 ' +
     'dias — porque derrubar a vitrine tiraria do ar um cão que pode estar a um clique da adoção. ' +
     'Depois de 90 dias sem pagamento o perfil é removido, com aviso 15 dias antes e a possibilidade ' +
     'de baixar todos os seus dados.'],
    ['Meus dados ficam presos na plataforma?',
     'Não. Em Meu plano → Meus dados você baixa tudo num arquivo só: animais, vacinas, adoções, ' +
     'doadores, estoque e faturas. Funciona inclusive com a conta bloqueada. Se um dia quiser trocar ' +
     'de sistema, leva tudo.'],
    ['Vocês guardam dados de quem quer adotar?',
     'Só o necessário para a adoção acontecer: nome, contato, cidade e as respostas do teste de ' +
     'compatibilidade, sempre com consentimento explícito. O CPF aparece mascarado nas telas e ' +
     'completo apenas no termo de adoção. Qualquer pessoa pode pedir cópia ou exclusão dos dados ' +
     'dela, conforme a LGPD.'],
    ['A rede de proteção não é uma lista negra?',
     'É um registro de ocorrências, não uma condenação. Guarda apenas iniciais e CPF parcial, exige ' +
     'descrição objetiva do fato, permite que outra organização confirme e é consultável pelo titular. ' +
     'O alerta aparece na triagem para informar a decisão — a decisão continua sendo de cada ONG.'],
    ['Preciso instalar alguma coisa?',
     'Não. Funciona no navegador do computador e do celular. Na feira de adoção, onde raramente há ' +
     'internet boa, o essencial continua funcionando — inclusive os cartazes com QR que você imprime ' +
     'antes de sair de casa.']
  ];
  return '<section id="perguntas"><div class="env">' +
    '<div class="cab sobe"><span class="rot">Perguntas</span><h2>O que costumam perguntar</h2></div>' +
    '<div class="sobe">' + qs.map(function(q){
      return '<details class="pergunta"><summary>' + q[0] + '</summary><p>' + q[1] + '</p></details>';
    }).join('') + '</div>' +
  '</div></section>';
}

function chamadaFinalSite(){
  return '<section class="final"><div class="env sobe">' +
    '<h2>Comece hoje.<br>O bicho não tem pressa de esperar.</h2>' +
    '<p>Cadastre a sua organização em cinco minutos, ou entre e conheça quem está esperando um lar ' +
    'na sua cidade.</p>' +
    '<div class="acoes">' +
      '<button class="bt" onclick="entrarNoPortal()">Entrar no sistema →</button>' +
      '<button class="bt bt-2" onclick="entrarNoPortal();setTimeout(function(){entrar(\'adotante\')},60)">' +
        'Ver os animais</button>' +
    '</div>' +
  '</div></section>';
}

function rodapeSite(){
  var ano = isoHoje().slice(0,4);
  return '<footer class="pe-site"><div class="env">' +
    '<div class="g">' +
      '<div><span class="logo-placa marca-pe">' + logoTrava(34) + '</span>' +
        '<p class="lema">' + MARCA.lema + '</p>' +
        '<p style="color:#9C8D80;font-size:13.5px;max-width:26em">' +
        'Adoção, gestão e conexão no mesmo lugar. Uma empresa que existe para que quem cuida possa cuidar — ' +
        'e para que ninguém precise confiar no acaso na hora de doar.</p></div>' +
      '<div><b>Produto</b>' +
        '<a href="#para-quem">Para quem é</a><a href="#diferenca">O que muda</a>' +
        '<a href="#planos">Planos</a><a href="#fundo">Fundo de Impacto</a></div>' +
      '<div><b>Entrar</b>' +
        '<a href="#" onclick="entrarNoPortal();return false">Sou ONG ou protetor</a>' +
        '<a href="#" onclick="entrarNoPortal();setTimeout(function(){entrar(\'adotante\')},60);return false">Quero adotar</a>' +
        '<a href="#" onclick="entrarNoPortal();setTimeout(function(){entrar(\'adotante\');ir(\'apoiar\')},80);return false">Sou empresa</a></div>' +
      '<div><b>Transparência</b>' +
        '<a href="#" onclick="entrarNoPortal();setTimeout(function(){entrar(\'adotante\');ir(\'fundo\')},80);return false">Extrato do Fundo</a>' +
        '<a href="#perguntas">Como nos sustentamos</a>' +
        '<a href="#perguntas">Privacidade e LGPD</a></div>' +
    '</div>' +
    '<div class="fim"><span>© ' + ano + ' P de PATA · ' + esc(DB.plataforma.cidade) + '/' + DB.plataforma.uf + '</span>' +
      '<span>O P de PATA é uma empresa, não uma ONG. Doações vão para as organizações; ' +
      'patrocínio e apoio mantêm a plataforma.</span></div>' +
  '</div></footer>';
}
