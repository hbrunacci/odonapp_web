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

  /* ---------- Pestañas de Funcionalidades ---------- */
  const tabs = Array.from(document.querySelectorAll('.tabs [role="tab"]'));

  function activarTab(tab, enfocar) {
    tabs.forEach((t) => {
      const activa = t === tab;
      t.setAttribute('aria-selected', String(activa));
      t.tabIndex = activa ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !activa;
    });
    if (enfocar) tab.focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activarTab(tab, false));
    tab.addEventListener('keydown', (e) => {
      let destino = null;
      if (e.key === 'ArrowRight') destino = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') destino = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') destino = tabs[0];
      else if (e.key === 'End') destino = tabs[tabs.length - 1];
      if (destino) {
        e.preventDefault();
        activarTab(destino, true);
      }
    });
  });
  if (tabs.length) activarTab(tabs[0], false);

  /* ---------- Formulario de demo ---------- */
  const form = document.getElementById('demo-form');
  const estado = form.querySelector('.demo-form__status');
  const boton = form.querySelector('.demo-form__submit');
  const textoBoton = boton.querySelector('.demo-form__submit-text');
  const EMAIL_DESTINO = 'hctoledano@odonapp.com';

  function mostrarEstado(tipo, html) {
    estado.className = 'demo-form__status' + (tipo ? ' is-' + tipo : '');
    estado.innerHTML = html;
  }

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
    };
  }

  function enviarPorMail(d) {
    const cuerpo = [
      'Nombre y apellido: ' + d.nombre,
      'Cargo: ' + d.cargo,
      'Círculo / institución: ' + d.institucion,
      'Email: ' + d.email,
      'Teléfono: ' + d.telefono,
      'Soy: ' + d.perfil,
      '',
      d.mensaje,
    ].join('\n');
    const asunto = 'Solicitud de demo — ' + (d.institucion || d.nombre);
    window.location.href = 'mailto:' + EMAIL_DESTINO +
      '?subject=' + encodeURIComponent(asunto) +
      '&body=' + encodeURIComponent(cuerpo);
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
    const endpoint = form.dataset.endpoint;

    boton.disabled = true;
    textoBoton.textContent = 'Enviando…';
    mostrarEstado('sending', 'Enviando tu solicitud…');

    try {
      if (endpoint) {
        await enviarAEndpoint(endpoint, d);
        form.reset();
        mostrarEstado('success', '¡Gracias! Recibimos tu solicitud y te vamos a contactar a la brevedad.');
      } else {
        enviarPorMail(d);
        mostrarEstado('success', 'Abrimos tu programa de correo con la solicitud lista para enviar. Si no se abrió, escribinos a <a href="mailto:' + EMAIL_DESTINO + '">' + EMAIL_DESTINO + '</a>.');
      }
    } catch (err) {
      mostrarEstado('error', 'No pudimos enviar tu solicitud. Probá de nuevo o escribinos a <a href="mailto:' + EMAIL_DESTINO + '">' + EMAIL_DESTINO + '</a>.');
    } finally {
      boton.disabled = false;
      textoBoton.textContent = 'Quiero conocer Odonapp';
    }
  });
})();
