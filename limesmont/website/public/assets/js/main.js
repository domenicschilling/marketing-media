// LIMES MONT – Interaktionen. Funktioniert ohne Abhängigkeiten; 3D-Szenen werden bei Bedarf nachgeladen.
const root = document.documentElement;
root.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- Header & Navigation ---------- */
const header = $('[data-header]');
const onScroll = () => header?.classList.toggle('scrolled', scrollY > 30);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const burger = $('[data-burger]');
const setMenu = (open) => {
  header.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  document.body.style.overflow = open ? 'hidden' : '';
};
burger?.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (header.classList.contains('menu-open')) setMenu(false);
    $$('.nav__item--mega.open').forEach((li) => li.classList.remove('open'));
  }
});

// Mega-Menü: auf Touch/Mobil per Klick aufklappen, auf Desktop per Hover (CSS)
const mobileNav = matchMedia('(max-width: 1023px)');
$$('[data-mega-toggle]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const li = a.parentElement;
    const coarse = matchMedia('(hover: none)').matches;
    if (mobileNav.matches || coarse) {
      if (!li.classList.contains('open')) {
        e.preventDefault();
        li.classList.add('open');
        a.setAttribute('aria-expanded', 'true');
      }
    }
  });
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav__item--mega')) $$('.nav__item--mega.open').forEach((li) => { li.classList.remove('open'); li.firstElementChild.setAttribute('aria-expanded', 'false'); });
});

/* ---------- Einblenden beim Scrollen ---------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
$$('.reveal').forEach((el) => io.observe(el));

/* ---------- Zähler ---------- */
const fmt = new Intl.NumberFormat('de-DE');
const countIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    countIO.unobserve(e.target);
    const el = e.target, to = +el.dataset.count;
    if (reduced) { el.textContent = fmt.format(to); continue; }
    const t0 = performance.now(), dur = 1600;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - p, 4)));
      el.textContent = fmt.format(v);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}, { threshold: 0.6 });
$$('[data-count]').forEach((el) => { el.textContent = '0'; countIO.observe(el); });

/* ---------- 3D-Neigen der Karten ---------- */
if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  $$('.tilt').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--ry', `${(x - 0.5) * 8}deg`);
      card.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  });
}

/* ---------- Scroll-Story: Fortschritt & Schritte ---------- */
$$('[data-story]').forEach((story) => {
  const steps = $$('.story__step', story), labels = $$('.scene-label', story), hud = $('[data-hud-step]', story);
  let last = -1;
  const update = () => {
    const r = story.getBoundingClientRect(), total = r.height - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / total));
    story.style.setProperty('--p', p.toFixed(4));
    story.dataset.progress = p;
    const active = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999));
    if (active !== last) {
      last = active;
      steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
      labels.forEach((l) => l.classList.toggle('is-on', active >= +l.dataset.from));
      if (hud) hud.textContent = `0${active + 1} / 0${steps.length}`;
    }
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
});

/* ---------- Sandwich-Konfigurator (UI, funktioniert auch ohne WebGL) ---------- */
$$('[data-configurator]').forEach((box) => {
  const stage = $('[data-scene]', box), out = $('[data-u]', box), colorName = $('[data-color-name]', box);
  const state = { type: 'wall', thickness: 100, color: $('.swatch.is-active', box)?.dataset.color, exploded: false };
  const uValue = (mm) => 1 / (0.13 + 0.04 + mm / 1000 / 0.022); // Rsi + Rse + d/λ (PIR)
  const emit = () => {
    out.textContent = uValue(state.thickness).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    stage.dispatchEvent(new CustomEvent('config', { detail: { ...state } }));
    stage.dataset.config = JSON.stringify(state);
  };
  const pick = (sel, btn) => $$(sel, box).forEach((b) => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', b === btn); });
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.type) { state.type = b.dataset.type; pick('[data-type]', b); }
    else if (b.dataset.thickness) { state.thickness = +b.dataset.thickness; pick('[data-thickness]', b); }
    else if (b.dataset.color) { state.color = b.dataset.color; pick('[data-color]', b); colorName.textContent = b.dataset.name; }
    else if ('explode' in b.dataset) { state.exploded = !state.exploded; b.setAttribute('aria-pressed', state.exploded); b.lastChild.textContent = state.exploded ? ' Paneel zusammenfügen' : ' Schichtaufbau zeigen'; }
    else return;
    emit();
  });
  emit();
});

/* ---------- Referenzen filtern ---------- */
$$('.ref-filter').forEach((bar) => {
  const items = $$('.ref');
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    $$('[data-filter]', bar).forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', x === b); });
    items.forEach((it) => { it.hidden = b.dataset.filter !== 'Alle' && it.dataset.cat !== b.dataset.filter; });
  });
});

/* ---------- Mehrstufiges Anfrageformular ---------- */
$$('form[data-steps]').forEach((form) => {
  const steps = $$('[data-step]', form), labels = $$('.inquiry__labels li', form);
  const prev = $('[data-prev]', form), next = $('[data-next]', form), submit = $('[data-submit]', form);
  const bar = $('[data-progress]', form), err = $('[data-error]', form);
  let i = 0;
  const show = (n) => {
    i = n;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    labels.forEach((l, k) => { l.classList.toggle('is-active', k === i); l.classList.toggle('is-done', k < i); });
    bar.style.width = `${((i + 1) / steps.length) * 100}%`;
    prev.hidden = i === 0;
    next.hidden = i === steps.length - 1;
    submit.hidden = i !== steps.length - 1;
    err.hidden = true;
  };
  const validate = () => {
    const fields = $$('input, textarea, select', steps[i]);
    let bad = null;
    fields.forEach((f) => {
      f.classList.remove('is-invalid');
      if (!f.checkValidity()) { if (f.type !== 'radio') f.classList.add('is-invalid'); bad ||= f; }
    });
    // Dateigröße prüfen (Netlify: max. 8 MB je Übermittlung)
    const size = $$('input[type=file]', form).reduce((s, f) => s + (f.files[0]?.size || 0), 0);
    if (size > 8 * 1024 * 1024) { bad = $('input[type=file]', form); err.textContent = 'Die Dateien sind zusammen größer als 8 MB. Bitte kleinere Fotos wählen oder später per E-Mail/WhatsApp senden.'; err.hidden = false; return false; }
    if (bad) {
      err.textContent = bad.type === 'radio' ? 'Bitte wählen Sie eine Option aus.' : bad.type === 'checkbox' ? 'Bitte bestätigen Sie die Datenschutzhinweise.' : bad.name === 'plz' ? 'Bitte geben Sie eine gültige fünfstellige PLZ ein.' : 'Bitte füllen Sie die markierten Pflichtfelder aus.';
      err.hidden = false;
      bad.focus({ preventScroll: true });
      return false;
    }
    return true;
  };
  const scrollTop = () => { const t = form.getBoundingClientRect().top + scrollY - 110; if (t < scrollY) scrollTo({ top: t, behavior: reduced ? 'auto' : 'smooth' }); };
  next.addEventListener('click', () => { if (validate()) { show(i + 1); scrollTop(); } });
  prev.addEventListener('click', () => { show(i - 1); scrollTop(); });
  // Auswahl per Klick führt automatisch weiter (nur bei reinen Auswahl-Schritten)
  steps.forEach((s, k) => s.addEventListener('change', (e) => {
    if (e.target.type === 'radio' && k === 0) setTimeout(() => { if (i === 0) next.click(); }, 220);
  }));
  form.addEventListener('submit', (e) => { if (!validate()) e.preventDefault(); });
  $$('input[type=file]', form).forEach((f) => f.addEventListener('change', () => {
    const lbl = f.closest('.upload'), name = $('[data-file-name]', lbl);
    lbl.classList.toggle('has-file', !!f.files[0]);
    name.textContent = f.files[0] ? f.files[0].name : name.dataset.default || 'optional';
  }));
  $$('[data-file-name]', form).forEach((n) => (n.dataset.default = n.textContent));
  // Vorauswahl aus Leistungsseite (?leistung=...)
  const pre = new URLSearchParams(location.search).get('leistung');
  if (pre) $$('input[name=leistung]', form).find((r) => r.value === pre)?.click();
  show(0);
});

/* ---------- Lamellenfassade: Neigung folgt Maus bzw. Scrollposition ---------- */
$$('[data-lamellas]').forEach((el) => {
  const set = (deg) => el.style.setProperty('--a', `${deg.toFixed(1)}deg`);
  if (reduced) return set(28);
  let hover = false;
  el.addEventListener('pointermove', (e) => { hover = true; const r = el.getBoundingClientRect(); set(((e.clientX - r.left) / r.width - 0.5) * 140); });
  el.addEventListener('pointerleave', () => { hover = false; onScroll(); });
  const onScroll = () => { if (hover) return; const r = el.getBoundingClientRect(); set(((r.top + r.height / 2) / innerHeight - 0.5) * -120 + 20); };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

/* ---------- Jahr im Footer ---------- */
$$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

/* ---------- 3D-Szenen nachladen ---------- */
const webgl = (() => {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
})();
const saveData = navigator.connection?.saveData;
if (webgl && !saveData) {
  const load = (el) => import(`./scenes/${el.dataset.scene}.js`).then((m) => m.default(el)).catch((e) => console.warn('3D-Szene nicht geladen:', e));
  const sceneIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { sceneIO.unobserve(e.target); load(e.target); }
  }, { rootMargin: '300px 0px' });
  const start = () => $$('[data-scene]').forEach((el) => sceneIO.observe(el));
  // Erst nach dem ersten Rendern starten, damit Text und Bilder sofort da sind
  const idle = () => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 1200 }) : setTimeout(start, 300));
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle);
}
