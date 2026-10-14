(() => {
  'use strict';

  /* Anclas de la home anterior, por si llegan links viejos */
  const anclasViejas = { inicio: 'top', conocenos: 'que-es', beneficios: 'funcionalidades', valores: 'compromiso', confianza: 'top' };
  const hash = location.hash.slice(1);
  if (anclasViejas[hash]) {
    history.replaceState(null, '', '#' + anclasViejas[hash]);
    const destino = document.getElementById(anclasViejas[hash]);
    if (destino) destino.scrollIntoView();
  }

  /* ---------- Header: sombra al hacer scroll ---------- */
  const header = document.getElementById('site-header');
  const marcarScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 4);
  marcarScroll();
  window.addEventListener('scroll', marcarScroll, { passive: true });

  /* ---------- Menú mobile ---------- */
  const menu = document.getElementById('menu-mobile');
  const toggle = document.querySelector('.menu-toggle');
  const cerrar = menu.querySelector('.menu-mobile__close');
  const escritorio = window.matchMedia('(min-width: 1200px)');

  const focusables = () => menu.querySelectorAll('a[href], button:not([disabled])');

  function abrirMenu() {
    menu.hidden = false;
    document.body.classList.add('menu-abierto');
    toggle.setAttribute('aria-expanded', 'true');
    cerrar.focus();
  }

  function cerrarMenu({ devolverFoco = true } = {}) {
    if (menu.hidden) return;
    menu.hidden = true;
    document.body.classList.remove('menu-abierto');
    toggle.setAttribute('aria-expanded', 'false');
    if (devolverFoco) toggle.focus();
  }

  toggle.addEventListener('click', abrirMenu);
  cerrar.addEventListener('click', () => cerrarMenu());
  menu.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => cerrarMenu({ devolverFoco: false }));
  });

  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cerrarMenu();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    const primero = items[0];
    const ultimo = items[items.length - 1];
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  });

  escritorio.addEventListener('change', (e) => {
    if (e.matches) cerrarMenu({ devolverFoco: false });
  });

  /* ---------- Carrusel de instituciones ---------- */
  const carrusel = document.querySelector('.clientes__carrusel');
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (carrusel && !sinMovimiento.matches) {
    const lista = carrusel.querySelector('.clientes__list');
    const copia = lista.cloneNode(true);
    copia.setAttribute('aria-hidden', 'true');
    copia.querySelectorAll('img').forEach((img) => { img.alt = ''; });
    carrusel.appendChild(copia);
    carrusel.classList.add('is-animado');
  }

  /* ---------- Formulario de demo ---------- */
  const form = document.getElementById('demo-form');
  const estado = form.querySelector('.demo-form__status');
  const boton = form.querySelector('.demo-form__submit');
  const textoBoton = boton.querySelector('.demo-form__submit-text');
  const EMAIL_DESTINO = 'hctoledano@odonapp.com';
  const MSJ_ERROR = 'No pudimos enviar tu solicitud. Probá de nuevo o escribinos a <a href="mailto:' + EMAIL_DESTINO + '">' + EMAIL_DESTINO + '</a>.';

  function mostrarEstado(tipo, html) {
    estado.className = 'demo-form__status' + (tipo ? ' is-' + tipo : '');
    estado.innerHTML = html;
  }

  const MSJ_EXITO = '¡Gracias! Recibimos tu solicitud y te vamos a contactar a la brevedad.';

  /* Vuelta del envío sin JavaScript (el servicio redirige con ?consulta=...) */
  const resultado = new URLSearchParams(location.search).get('consulta');
  if (resultado) {
    mostrarEstado(resultado === 'enviada' ? 'success' : 'error', resultado === 'enviada' ? MSJ_EXITO : MSJ_ERROR);
    history.replaceState(null, '', location.pathname + location.hash);
  }

  /* Captcha propio: el servicio da un desafío firmado y el navegador busca el número
     cuyo SHA-256 coincide. Se empieza a resolver apenas la persona entra al formulario. */
  const endpoint = form.dataset.endpoint || form.action;
  const VIGENCIA_CAPTCHA_MS = 50 * 60 * 1000;
  let captcha = null;

  const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

  async function resolverDesafio() {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ accion: 'desafio' }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const enc = new TextEncoder();
    const LOTE = 500;
    for (let i = 0; i <= d.max; i += LOTE) {
      const pruebas = [];
      for (let n = i; n < i + LOTE && n <= d.max; n++) {
        pruebas.push(crypto.subtle.digest('SHA-256', enc.encode(d.salt + n)));
      }
      const j = (await Promise.all(pruebas)).findIndex((h) => hex(h) === d.desafio);
      if (j >= 0) return { salt: d.salt, numero: i + j, firma: d.firma };
    }
    throw new Error('Captcha sin solución');
  }

  function prepararCaptcha() {
    if (!captcha || Date.now() - captcha.desde > VIGENCIA_CAPTCHA_MS) {
      const promesa = resolverDesafio();
      const actual = { promesa, desde: Date.now() };
      promesa.catch(() => { if (captcha === actual) captcha = null; });
      captcha = actual;
    }
    return captcha.promesa;
  }

  form.addEventListener('focusin', prepararCaptcha, { once: true });

  function datosDelForm() {
    const fd = new FormData(form);
    return {
      nombre: (fd.get('nombre') || '').trim(),
      cargo: (fd.get('cargo') || '').trim(),
      institucion: (fd.get('institucion') || '').trim(),
      email: (fd.get('email') || '').trim(),
      telefono: (fd.get('telefono') || '').trim(),
      perfil: fd.get('perfil') || '',
      mensaje: (fd.get('mensaje') || '').trim(),
      sitio_web: fd.get('sitio_web') || '',
    };
  }

  async function enviarAEndpoint(url, d) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(d),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const d = datosDelForm();

    boton.disabled = true;
    textoBoton.textContent = 'Enviando…';
    mostrarEstado('sending', 'Enviando tu solicitud…');

    try {
      d.captcha = await prepararCaptcha();
      await enviarAEndpoint(endpoint, d);
      form.reset();
      mostrarEstado('success', MSJ_EXITO);
    } catch (err) {
      mostrarEstado('error', MSJ_ERROR);
    } finally {
      captcha = null; // cada desafío sirve para un solo envío
      boton.disabled = false;
      textoBoton.textContent = 'Quiero conocer Odonapp';
    }
  });
})();
