/* =====================================================================
   EEEEEEEITA Protagonista, Daniel
   Interacoes da landing page (JavaScript puro, sem dependencias)
   ---------------------------------------------------------------------
   Para trocar o numero de WhatsApp, altere apenas a constante WA_NUMBER
   abaixo. Todos os botoes montam o link a partir dela.
   ===================================================================== */
(function () {
  'use strict';

  /* ---- Configuracao central ---------------------------------------- */
  var WA_NUMBER = '5511980291196'; // formato internacional, so digitos

  /* ---- WhatsApp: monta os links com mensagem pre-preenchida --------
     Cada elemento com a classe .js-wa carrega um data-msg. O link final
     fica: https://wa.me/NUMERO?text=MENSAGEM (codificada).
     Se o JavaScript nao rodar, o href basico ja aponta para o WhatsApp. */
  function montarLinksWhats() {
    var links = document.querySelectorAll('.js-wa');
    links.forEach(function (el) {
      var msg = el.getAttribute('data-msg') || '';
      var url = 'https://wa.me/' + WA_NUMBER;
      if (msg) { url += '?text=' + encodeURIComponent(msg); }
      el.setAttribute('href', url);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    });
  }

  /* ---- Header: estado ao rolar ------------------------------------- */
  function headerAoRolar() {
    var header = document.querySelector('.site-header');
    if (!header) { return; }
    var aplicar = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    aplicar();
    window.addEventListener('scroll', aplicar, { passive: true });
  }

  /* ---- Menu mobile ------------------------------------------------- */
  function menuMobile() {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav__links');
    if (!toggle || !links) { return; }

    var fechar = function () {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', function () {
      var aberto = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
    // fecha ao clicar em um link ou apertar Esc
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', fechar);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { fechar(); }
    });
  }

  /* ---- Scrollspy: destaca a secao ativa no menu -------------------- */
  function scrollspy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) { return; }

    var mapa = {};
    var alvos = [];
    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var sec = document.getElementById(id);
      if (sec) { mapa[id] = a; alvos.push(sec); }
    });

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          links.forEach(function (a) { a.classList.remove('is-active'); });
          var ativo = mapa[entrada.target.id];
          if (ativo) { ativo.classList.add('is-active'); }
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    alvos.forEach(function (s) { obs.observe(s); });
  }

  /* ---- Reveal: fade e subida suave ao entrar na tela --------------- */
  function revelarAoRolar() {
    var itens = document.querySelectorAll('.reveal');
    if (!itens.length) { return; }
    if (!('IntersectionObserver' in window)) {
      itens.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas, o) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('is-in');
          o.unobserve(entrada.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    itens.forEach(function (el) { obs.observe(el); });
  }

  /* ---- Parallax discreto na foto do hero --------------------------- */
  function parallaxHero() {
    var alvo = document.querySelector('[data-parallax]');
    if (!alvo) { return; }
    var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzir) { return; }

    var ticking = false;
    var atualizar = function () {
      var y = window.scrollY;
      if (y < 800) {
        alvo.style.transform = 'translateY(' + (y * 0.06) + 'px)';
      }
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(atualizar); ticking = true; }
    }, { passive: true });
  }

  /* ---- Newsletter: valida e confirma (sem backend) ----------------
     Conecte a um servico real (ex.: Mailchimp, Brevo, RD Station)
     trocando o corpo desta funcao. Veja o README. */
  function newsletter() {
    var form = document.querySelector('.news__form');
    if (!form) { return; }
    var input = form.querySelector('input[type="email"]');
    var msg = document.querySelector('.news__msg');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valor = (input.value || '').trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
      if (!ok) {
        msg.textContent = 'Confira o e-mail digitado, por favor.';
        input.focus();
        return;
      }
      // Aqui entraria o envio real para o seu servico de e-mail.
      msg.textContent = 'Pronto! Você entrou na lista. Em breve chega a primeira dica.';
      form.reset();
    });
  }

  /* ---- Ano atual no rodape ----------------------------------------- */
  function anoRodape() {
    var el = document.querySelector('[data-ano]');
    if (el) { el.textContent = new Date().getFullYear(); }
  }

  /* ---- Inicializacao ----------------------------------------------- */
  function iniciar() {
    montarLinksWhats();
    headerAoRolar();
    menuMobile();
    scrollspy();
    revelarAoRolar();
    parallaxHero();
    newsletter();
    anoRodape();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
