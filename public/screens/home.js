// ホーム画面：4つの入口と、現在の時刻のアナログ・デジタル時計。
// 漢字レベル（kana / grade3 / adult）に応じたテキスト切り替えに対応。

import { createClock } from '../lib/clock-svg.js';
import { hour12 } from '../lib/time.js';
import { getText } from '../lib/text.js';

const pad2 = (n) => String(n).padStart(2, '0');

export function renderHome(root, { settings }) {
  const lvl = settings.kanjiLevel || 'kana';

  const entries = [
    { route: 'learn', title: getText('nav.learn', lvl, 'まなぶ'), desc: getText('home.learnDesc', lvl, 'とけいを うごかして みよう') },
    { route: 'practice', title: getText('nav.practice', lvl, 'れんしゅう'), desc: getText('home.practiceDesc', lvl, 'もんだいに こたえよう') },
    { route: 'print', title: getText('nav.print', lvl, 'プリント'), desc: getText('home.printDesc', lvl, 'テストを いんさつする') },
    { route: 'settings', title: getText('nav.settings', lvl, '設定'), desc: getText('home.settingsDesc', lvl, 'ひょうじを かえる') },
  ];

  const nowText = getText('home.now', lvl, 'いまの じこく');

  root.innerHTML = `
    <section class="home">
      <div class="home__clock">
        <div class="home__clock-svg"></div>
        <div class="home__time">
          <p class="home__now">${nowText}</p>
          <div class="digital home__digital" aria-live="polite">
            <span class="digital__prefix"></span><span class="digital__h"></span><span class="digital__unit digital__unit--h">時</span><span class="digital__m"></span><span class="digital__unit digital__unit--m">分</span>
          </div>
        </div>
      </div>
      <nav class="home__grid" aria-label="メニュー">
        ${entries.map(
          (e) => `
          <a class="card card--${e.route}" href="#${e.route}">
            <span class="card__title">${e.title}</span>
            <span class="card__desc">${e.desc}</span>
          </a>`
        ).join('')}
      </nav>
    </section>`;

  const clock = createClock(root.querySelector('.home__clock-svg'), {
    minuteNumbers: settings.minuteNumbers,
    seconds: settings.showSeconds,
    markers: false,
  });

  const prefixEl = root.querySelector('.digital__prefix');
  const hEl = root.querySelector('.digital__h');
  const mEl = root.querySelector('.digital__m');
  const unitHEl = root.querySelector('.digital__unit--h');
  const unitMEl = root.querySelector('.digital__unit--m');

  function tick() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    clock.setTime({ h, m: m + s / 60 }, s);

    if (settings.use24h) {
      prefixEl.textContent = '';
      hEl.textContent = pad2(h);
      unitHEl.textContent = ':';
      mEl.textContent = pad2(m);
      unitMEl.textContent = '';
    } else {
      const { hour, prefix } = hour12({ h, m }, settings.ampm);
      prefixEl.textContent = prefix;
      hEl.textContent = String(hour);
      unitHEl.textContent = '時';
      mEl.textContent = pad2(m);
      unitMEl.textContent = '分';
    }
  }
  tick();
  const timer = setInterval(tick, settings.showSeconds ? 1000 : 10000);
  return () => clearInterval(timer);
}
