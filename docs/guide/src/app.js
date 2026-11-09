import { renderMarkdown } from './md.js';
import { parts, meta } from './content/index.js';

/* ---------------------------------------------------------------- state -- */
const STORE = { lang: 'lc-lang', theme: 'lc-theme' };
const state = {
  lang: localStorage.getItem(STORE.lang) || (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en',
  theme: localStorage.getItem(STORE.theme) || 'light',
};
state.lang = localStorage.getItem(STORE.lang) || ((navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------------------------------------ chrome svg -- */
const SVG = {
  brick: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V3.8h10V9"/><rect x="3.5" y="9" width="17" height="7.5" rx="1.6"/><path d="M7 14h10v6.2H7z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 11.5 12 5.5l6 6"/></svg>',
};

/* ------------------------------------------------------------------ build -- */
function buildChrome() {
  $('.brand-mark').innerHTML = SVG.brick;
  $('#searchIcon').innerHTML = SVG.search;
  $('#themeToggle').innerHTML = state.theme === 'dark' ? SVG.sun : SVG.moon;
  $('#printBtn').innerHTML = SVG.print;
  $('#menuToggle').innerHTML = SVG.menu;
  $('#totop').innerHTML = SVG.up;
}

function buildNav() {
  const nav = $('#nav');
  nav.innerHTML = '';
  for (const p of parts) {
    const g = document.createElement('div');
    g.className = 'nav-group';
    g.innerHTML = `<div class="nav-part"><span class="num">${p.num}</span><span>${p.title[state.lang]}</span></div>`;
    for (const s of p.sections) {
      const a = document.createElement('a');
      a.className = 'nav-link';
      a.href = '#s-' + s.id;
      a.dataset.target = 's-' + s.id;
      a.textContent = s.title[state.lang];
      a.addEventListener('click', () => document.body.classList.remove('nav-open'));
      g.appendChild(a);
    }
    nav.appendChild(g);
  }
  const foot = document.createElement('div');
  foot.className = 'nav-foot';
  foot.innerHTML = meta.navFoot[state.lang];
  nav.appendChild(foot);
}

function buildBody() {
  const main = $('#main');
  main.innerHTML = '';
  for (const p of parts) {
    const sec = document.createElement('section');
    sec.className = 'part';
    sec.id = 'part-' + p.id;
    let h = `<div class="part-head"><div class="part-badge">${p.num}</div><div>
      <h2>${p.title[state.lang]}</h2>
      ${p.sub[state.lang] ? `<p class="part-sub">${p.sub[state.lang]}</p>` : ''}
    </div></div>`;
    for (const s of p.sections) {
      const rendered = renderMarkdown(s.body[state.lang], { idPrefix: 's-' + s.id + '-' });
      const anchor = `<h3 id="s-${s.id}" class="sec-anchor">${s.title[state.lang]}</h3>`;
      h += anchor + rendered;
    }
    sec.innerHTML = h;
    main.appendChild(sec);
  }
  const foot = document.createElement('div');
  foot.className = 'pagefoot';
  foot.innerHTML = meta.pageFoot[state.lang];
  main.appendChild(foot);
  wireMedia();
}

function wireMedia() {
  $$('img[data-zoom]').forEach((img) => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => openLightbox(img.src));
  });
  $$('.mediacard img').forEach((img) => img.addEventListener('click', () => openLightbox(img.dataset.full || img.src)));
}

function openLightbox(src) {
  const lb = $('#lightbox');
  $('#lightboxImg').src = src;
  lb.classList.add('open');
}

/* ------------------------------------------------------------------ paint -- */
function render() {
  document.documentElement.lang = state.lang === 'ru' ? 'ru' : 'en';
  document.documentElement.dataset.theme = state.theme;
  $('#t-title').textContent = meta.title[state.lang];
  $('#t-sub').textContent = meta.subtitle[state.lang];
  $('#heroTitle').textContent = meta.hero.title[state.lang];
  $('#heroText').textContent = meta.hero.text[state.lang];
  $('#heroKicker').innerHTML = `<span class="dot"></span>${meta.hero.kicker[state.lang]}`;
  $('#heroMeta').innerHTML = meta.hero.chips[state.lang].map((c) => `<span class="chip">${c}</span>`).join('');
  $('#heroImg').src = meta.hero.image;
  $('#heroImg').alt = meta.hero.title[state.lang];
  document.title = meta.docTitle[state.lang];
  buildNav();
  buildBody();
  applyFilter($('#search').value || '');
  spy();
}

/* ------------------------------------------------------------- nav filter -- */
function applyFilter(q) {
  q = q.trim().toLowerCase();
  let any = false;
  $$('.nav-link').forEach((a) => {
    const hit = !q || a.textContent.toLowerCase().includes(q) || (a.dataset.keywords || '').includes(q);
    a.classList.toggle('hidden', !hit);
    if (hit) any = true;
  });
  $$('.nav-group').forEach((g) => {
    const visible = $$('.nav-link:not(.hidden)', g).length > 0;
    g.style.display = visible ? '' : 'none';
  });
  if (!q) return;
  $$('.part').forEach((p) => {
    const text = p.textContent.toLowerCase();
    p.style.display = text.includes(q) ? '' : 'none';
  });
  any = any || $$('.part').some((p) => p.style.display !== 'none');
  $('#noresult').style.display = any ? 'none' : 'block';
}

/* -------------------------------------------------------------- scrollspy -- */
let anchors = [];
function spy() {
  anchors = $$('.sec-anchor');
}
function onScroll() {
  const y = window.scrollY;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  $('#progress').style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  $('#totop').classList.toggle('show', y > 700);

  let current = null;
  for (const a of anchors) {
    if (a.getBoundingClientRect().top <= 120) current = a;
  }
  $$('.nav-link').forEach((l) => l.classList.toggle('active', !!current && l.dataset.target === current.id));
  if (current) {
    const link = $(`.nav-link[data-target="${current.id}"]`);
    const sb = $('#sidebar');
    if (link) {
      const r = link.getBoundingClientRect(), sr = sb.getBoundingClientRect();
      if (r.top < sr.top + 40 || r.bottom > sr.bottom - 40) link.scrollIntoView({ block: 'center' });
    }
  }
}

/* ------------------------------------------------------------------ boot --- */
buildChrome();
render();

let scrollTick = false;
window.addEventListener('scroll', () => {
  if (scrollTick) return;
  scrollTick = true;
  requestAnimationFrame(() => { onScroll(); scrollTick = false; });
}, { passive: true });

$('#search').addEventListener('input', (e) => applyFilter(e.target.value));
$('#langEn').addEventListener('click', () => setLang('en'));
$('#langRu').addEventListener('click', () => setLang('ru'));
function setLang(l) {
  state.lang = l;
  localStorage.setItem(STORE.lang, l);
  $('#langEn').setAttribute('aria-pressed', String(l === 'en'));
  $('#langRu').setAttribute('aria-pressed', String(l === 'ru'));
  render();
}
$('#langEn').setAttribute('aria-pressed', String(state.lang === 'en'));
$('#langRu').setAttribute('aria-pressed', String(state.lang === 'ru'));

$('#themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORE.theme, state.theme);
  $('#themeToggle').innerHTML = state.theme === 'dark' ? SVG.sun : SVG.moon;
  document.documentElement.dataset.theme = state.theme;
});
$('#printBtn').addEventListener('click', () => window.print());
$('#menuToggle').addEventListener('click', () => document.body.classList.toggle('nav-open'));
$('#totop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
$('#lightbox').addEventListener('click', (e) => { if (e.target.id !== 'lightboxImg') $('#lightbox').classList.remove('open'); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { $('#lightbox').classList.remove('open'); document.body.classList.remove('nav-open'); }
  if (e.key === '/' && document.activeElement !== $('#search')) { e.preventDefault(); $('#search').focus(); }
});
onScroll();
