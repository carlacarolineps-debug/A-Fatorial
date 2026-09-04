/* =====================================================================
   O motor da proposta.

   Tres momentos: abrir pelo codigo, escolher o plano, assinar.

   Uma regra atravessa o arquivo inteiro: NADA que vem do servidor vira
   HTML. Tudo entra por textContent, inclusive as clausulas e o nome do
   cliente. O texto da proposta e escrito por gente da casa, mas o nome e
   o endereco de quem assina sao digitados por quem esta do outro lado, e
   e isso que este arquivo monta no contrato em tempo real.
   ===================================================================== */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var BRL = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  });
  var D = null;      // a proposta aberta
  var SEL = null;    // o plano escolhido

  function fmtDoc(d) {
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return d;
  }

  function dadosDoCliente() {
    return {
      nome: $('a-nome').value.trim(),
      documento: $('a-doc').value.replace(/\D/g, ''),
      whatsapp: $('a-tel').value.replace(/\D/g, ''),
      email: $('a-mail').value.trim(),
      endereco: $('a-end').value.trim(),
    };
  }

  /* A linha de identificacao do CONTRATANTE. Ela entra no contrato
     enquanto a pessoa digita: ver o proprio nome dentro do texto antes de
     assinar e o que faz o documento parecer o documento dela, e nao um
     modelo com um botao no fim. */
  function linhaDoContratante(c) {
    if (!c || !c.nome) {
      return 'CONTRATANTE: a pessoa física ou jurídica identificada no aceite eletrônico '
        + 'desta página (nome ou razão social, CPF/CNPJ, e-mail e WhatsApp).';
    }
    return 'CONTRATANTE: ' + c.nome
      + (c.documento ? ', CPF/CNPJ ' + fmtDoc(c.documento) : ', CPF/CNPJ a informar no aceite')
      + (c.email ? ', e-mail ' + c.email : '')
      + (c.whatsapp ? ', WhatsApp ' + c.whatsapp : '')
      + (c.endereco ? ', com endereço em ' + c.endereco : '') + '.';
  }

  /* O contrato e desenhado do zero a cada mudanca. As clausulas vem do
     SERVIDOR, com quatro marcadores; aqui elas so recebem o plano, o
     valor, as condicoes e a identificacao. O texto que vale e o que o
     servidor grava no aceite, com as mesmas substituicoes: se um dia os
     dois discordarem, o que vale e o do servidor, e nao esta tela. */
  function desenharContrato() {
    if (!D) return;
    var plano = SEL !== null ? D.planos[SEL] : null;
    var onde = $('p-contract');
    onde.textContent = '';
    D.clausulas.forEach(function (cl) {
      var h = document.createElement('h4');
      h.textContent = cl[0];
      var p = document.createElement('p');
      p.textContent = cl[1]
        .split('{PLANO}').join(plano ? plano.t : '[o plano que você escolher acima]')
        .split('{VALOR}').join(plano ? BRL.format(plano.val) : '[o valor do plano escolhido]')
        .split('{CONDICOES}').join(plano && plano.cond ? ' Condições: ' + plano.cond + '.' : '')
        .split('{CONTRATANTE}').join(linhaDoContratante(dadosDoCliente()));
      onde.appendChild(h);
      onde.appendChild(p);
    });
  }

  ['a-nome', 'a-doc', 'a-tel', 'a-mail', 'a-end'].forEach(function (id) {
    $(id).addEventListener('input', desenharContrato);
  });

  function escolher(i) {
    SEL = i;
    var caixas = $('p-opts').querySelectorAll('.opt');
    for (var j = 0; j < caixas.length; j++) caixas[j].classList.toggle('sel', j === i);
    desenharContrato();
    $('a-err').textContent = '';
  }

  function desenharProposta(d, expirada) {
    D = d; SEL = null;
    $('gate').hidden = true;
    $('proposal').hidden = false;
    document.title = 'Proposta ' + d.codigo + ' | Ideia Que Vende';

    $('p-cod').textContent = 'Proposta ' + d.codigo;
    var titulo = $('p-title');
    titulo.textContent = 'Seu conhecimento vira produto, ';
    var em = document.createElement('em');
    em.textContent = d.cliente;
    titulo.appendChild(em);
    titulo.appendChild(document.createTextNode('.'));

    $('p-sub').textContent = (d.empresa ? d.empresa + ' · ' : '')
      + 'Proposta preparada por ' + (d.contratada.rs || 'Ideia Que Vende') + '.';

    if (d.diagnostico) $('p-diag').textContent = d.diagnostico;
    else $('p-diag-sec').hidden = true;

    $('f-contratada').textContent = (d.contratada.rs || '')
      + (d.contratada.cnpj ? ' · CNPJ ' + d.contratada.cnpj : '');
    $('f-cod').textContent = d.codigo;
    $('f-valid').textContent = d.valida_ate
      ? new Date(d.valida_ate + 'T12:00:00').toLocaleDateString('pt-BR')
      : 'sem prazo';

    if (expirada) {
      $('p-expired').hidden = false;
      $('p-accept-sec').hidden = true;
    }

    // O titulo dizia "Tres formas de fazer" com dois planos na tela. Quem
    // recebe uma proposta de quarenta mil reais nota, e o que ela nota e
    // que a casa mandou um modelo sem conferir.
    var quantos = d.planos.length;
    var porExtenso = ['Nenhuma', 'Uma', 'Duas', 'Três', 'Quatro', 'Cinco'][quantos] || String(quantos);
    var tituloPlanos = $('p-opts-titulo');
    if (tituloPlanos) {
      tituloPlanos.textContent = quantos === 1
        ? 'Uma forma de fazer.'
        : porExtenso + ' formas de fazer. Você escolhe uma.';
    }

    var caixa = $('p-opts');
    caixa.textContent = '';
    d.planos.forEach(function (o, i) {
      var lab = document.createElement('label');
      lab.className = 'opt';
      var inp = document.createElement('input');
      inp.type = 'radio'; inp.name = 'plano'; inp.value = String(i);
      lab.appendChild(inp);
      if (o.selo) {
        var selo = document.createElement('span');
        selo.className = 'selo'; selo.textContent = o.selo;
        lab.appendChild(selo);
      }
      var t = document.createElement('div');
      t.className = 't'; t.textContent = o.t;
      lab.appendChild(t);
      var pr = document.createElement('div');
      pr.className = 'price'; pr.textContent = BRL.format(o.val);
      lab.appendChild(pr);
      var ul = document.createElement('ul');
      (o.esc || []).forEach(function (linha) {
        var li = document.createElement('li');
        li.textContent = linha;
        ul.appendChild(li);
      });
      lab.appendChild(ul);
      var esc = document.createElement('div');
      esc.className = 'escolhido'; esc.textContent = 'Este é o seu plano';
      lab.appendChild(esc);
      if (o.cond) {
        var cond = document.createElement('div');
        cond.className = 'cond'; cond.textContent = o.cond;
        lab.appendChild(cond);
      }
      inp.addEventListener('change', function () { escolher(i); });
      caixa.appendChild(lab);
    });

    // Com um plano so nao existe escolha a fazer: ele ja vem marcado.
    if (d.planos.length === 1) {
      caixa.querySelector('input').checked = true;
      escolher(0);
    } else {
      desenharContrato();
    }
    window.scrollTo({ top: 0 });
  }

  /* ------------------------------------------------------------ abrir */

  function abrir() {
    var codigo = $('g-code').value.toUpperCase().trim();
    var erro = $('g-err');
    if (!codigo) { erro.textContent = 'Digite o código que você recebeu.'; return; }
    erro.textContent = 'Abrindo...';

    fetch('/api/proposta?codigo=' + encodeURIComponent(codigo), {
      headers: { accept: 'application/json' }, cache: 'no-store',
    })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        if (!res.j || !res.j.ok) {
          erro.textContent = (res.j && res.j.erro)
            || 'Código não encontrado. Confira com quem te enviou.';
          return;
        }
        desenharProposta(res.j.proposta, res.j.expirada);
      })
      .catch(function () { erro.textContent = 'Não consegui falar com o servidor. Tente de novo.'; });
  }

  $('g-go').addEventListener('click', abrir);
  $('g-code').addEventListener('keydown', function (e) { if (e.key === 'Enter') abrir(); });

  // O codigo tambem pode vir no endereco, para o link do WhatsApp abrir
  // direto. Quem chegar sem ele ve a tela de digitar.
  (function doEndereco() {
    var achou = /[?&]c(?:odigo)?=([A-Za-z0-9-]+)/.exec(location.search);
    if (!achou) return;
    $('g-code').value = decodeURIComponent(achou[1]).toUpperCase();
    abrir();
  })();

  /* ----------------------------------------------------------- assinar */

  $('a-btn').addEventListener('click', function () {
    var c = dadosDoCliente();
    var erro = $('a-err');
    var botao = $('a-btn');

    if (SEL === null) { erro.textContent = 'Escolha um dos planos acima.'; return; }
    if (c.nome.length < 5 || c.nome.indexOf(' ') < 1) { erro.textContent = 'Escreva o seu nome completo.'; return; }
    if (c.documento.length !== 11 && c.documento.length !== 14) {
      erro.textContent = 'CPF tem 11 dígitos e CNPJ tem 14. Confira.'; return;
    }
    if (c.whatsapp.length < 10 || c.whatsapp.length > 13) { erro.textContent = 'Confira o WhatsApp, com DDD.'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) { erro.textContent = 'Confira o e-mail.'; return; }
    if (!$('a-li').checked) { erro.textContent = 'Marque a caixa confirmando que leu e aceita o contrato.'; return; }

    erro.textContent = '';
    botao.disabled = true;
    botao.textContent = 'Registrando...';

    fetch('/api/aceite', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        codigo: D.codigo, plano_indice: SEL, li_e_aceito: true,
        nome: c.nome, documento: c.documento, email: c.email,
        whatsapp: c.whatsapp, endereco: c.endereco,
      }),
    })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        if (!res.j || !res.j.ok) {
          erro.textContent = (res.j && res.j.erro) || 'Não consegui registrar. Tente de novo.';
          botao.disabled = false;
          botao.textContent = 'Aceitar e assinar o contrato';
          return;
        }
        mostrarComprovante(res.j, c);
      })
      .catch(function () {
        erro.textContent = 'Não consegui falar com o servidor. Tente de novo.';
        botao.disabled = false;
        botao.textContent = 'Aceitar e assinar o contrato';
      });
  });

  function mostrarComprovante(a, c) {
    var quando = new Date(String(a.aceito_em || '').replace(' ', 'T') + 'Z');
    var carimbo = isNaN(quando)
      ? a.aceito_em
      : quando.toLocaleDateString('pt-BR') + ' às ' + quando.toLocaleTimeString('pt-BR');

    $('r-nome').textContent = c.nome + ' · ' + fmtDoc(c.documento) + ' · ' + c.email;
    $('r-opt').textContent = a.plano.t + ', ' + BRL.format(a.plano.val);
    $('r-data').textContent = carimbo;
    $('r-hash').textContent = a.hash_curto;

    var msg = 'ACEITE DE PROPOSTA, IDEIA QUE VENDE\n'
      + 'Proposta: ' + a.codigo + '\n'
      + 'Plano aceito: ' + a.plano.t + ', ' + BRL.format(a.plano.val) + '\n'
      + 'Contratante: ' + c.nome + ', CPF/CNPJ ' + fmtDoc(c.documento) + '\n'
      + 'E-mail: ' + c.email + ', WhatsApp: ' + c.whatsapp
      + (c.endereco ? '\nEndereço: ' + c.endereco : '') + '\n'
      + 'Data e hora: ' + carimbo + '\n'
      + 'Código de verificação: ' + a.hash_curto + '\n\n'
      + 'Declaro que li e aceito integralmente o contrato de prestação de serviços '
      + 'apresentado na página da proposta, incluindo escopo, valor e condições do plano acima.';

    $('r-zap').href = 'https://wa.me/' + a.whatsapp_destino + '?text=' + encodeURIComponent(msg);

    // O comprovante que a pessoa baixa leva o contrato INTEIRO, e nao um
    // resumo: daqui a um ano o que vale e o texto, e nao a lembranca dele.
    var comprovante = msg
      + '\n\nResumo SHA-256 do conteúdo aceito: ' + a.hash
      + '\n\n----- CONTRATO ACEITO -----\n\n' + a.contrato;

    $('r-down').onclick = function () {
      var blob = new Blob([comprovante], { type: 'text/plain;charset=utf-8' });
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'aceite-' + a.codigo + '.txt';
      document.body.appendChild(link);
      link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 500);
    };

    $('a-receipt').hidden = false;
    $('a-btn').textContent = 'Aceite registrado';
    $('a-receipt').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
})();
