// ハッシュルーターと画面の切り替え。

import { loadSettings } from './lib/storage.js';
import { applySettings } from './lib/apply-settings.js';
import { renderHome } from './screens/home.js';
import { renderLearn } from './screens/learn.js';
import { renderPractice } from './screens/practice.js';
import { renderPrint } from './screens/print.js';
import { renderSettings } from './screens/settings.js';

const settings = loadSettings();
const root = document.getElementById('app');

const routes = {
  home: renderHome,
  learn: renderLearn,
  practice: renderPractice,
  print: renderPrint,
  settings: renderSettings,
};

let cleanup = null;

function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  const [name, query = ''] = raw.split('?');
  return { name: Object.hasOwn(routes, name) ? name : 'home', params: new URLSearchParams(query) };
}

function updateNav(level) {
  const titles = {
    kana: { title: 'とけいのれんしゅう', learn: 'まなぶ', practice: 'れんしゅう', print: 'プリント', settings: '設定' },
    grade3: { title: '時計のれんしゅう', learn: '学ぶ', practice: '練習', print: 'プリント', settings: '設定' },
    adult: { title: '時計の学習', learn: '学ぶ', practice: '練習', print: 'プリント', settings: '設定' },
  };
  const t = titles[level] || titles.kana;
  const titleEl = document.querySelector('.topbar__title');
  if (titleEl) titleEl.textContent = t.title;
  for (const link of document.querySelectorAll('.topbar__nav a[data-nav]')) {
    const key = link.dataset.nav;
    if (t[key]) link.textContent = t[key];
  }
}

function render() {
  cleanup?.();
  cleanup = null;
  const { name, params } = parseHash();
  document.body.dataset.route = name;
  updateNav(settings.kanjiLevel || 'kana');
  for (const link of document.querySelectorAll('.topbar__nav a')) {
    link.classList.toggle('is-active', link.getAttribute('href') === `#${name}`);
  }
  root.replaceChildren();
  cleanup = routes[name](root, { settings, params }) || null;
  window.scrollTo(0, 0);
}

applySettings(settings);
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !navigator.serviceWorker.controller) return;
    reloading = true;
    location.reload();
  });
}
