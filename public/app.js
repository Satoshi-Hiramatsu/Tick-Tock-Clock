// ハッシュルーターと画面の切り替え。

import { loadSettings } from './lib/storage.js';
import { renderHome } from './screens/home.js';
import { renderLearn } from './screens/learn.js';

const settings = loadSettings();
const root = document.getElementById('app');

function placeholder(title) {
  return (container) => {
    container.innerHTML = `
      <section class="placeholder">
        <h1 class="placeholder__title">${title}</h1>
        <p>じゅんびちゅう です。</p>
        <a class="btn btn--ghost" href="#home">ホームへ もどる</a>
      </section>`;
  };
}

const routes = {
  home: renderHome,
  learn: renderLearn,
  practice: placeholder('れんしゅう'),
  print: placeholder('プリント'),
  settings: placeholder('せってい'),
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

document.documentElement.dataset.font = settings.font;
window.addEventListener('hashchange', render);
render();
