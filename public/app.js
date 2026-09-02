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

function render() {
  cleanup?.();
  cleanup = null;
  const { name, params } = parseHash();
  document.body.dataset.route = name;
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
  // 新しい Service Worker が有効になったら一度だけ再読み込みし、古いキャッシュの画面を残さない。
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !navigator.serviceWorker.controller) return;
    reloading = true;
    location.reload();
  });
}
