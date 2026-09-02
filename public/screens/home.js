// S01 ホーム：4つの入口と、今の時刻の時計。

import { createClock } from '../lib/clock-svg.js';

const ENTRIES = [
  { route: 'learn', title: 'まなぶ', desc: 'とけいを うごかして みよう' },
  { route: 'practice', title: 'れんしゅう', desc: 'もんだいに こたえよう' },
  { route: 'print', title: 'プリント', desc: 'テストを いんさつする' },
  { route: 'settings', title: 'せってい', desc: 'ひょうじを かえる' },
];

export function renderHome(root, { settings }) {
  root.innerHTML = `
    <section class="home">
      <div class="home__clock">
        <div class="home__clock-svg"></div>
        <p class="home__now">いまの じこく</p>
      </div>
      <nav class="home__grid" aria-label="メニュー">
        ${ENTRIES.map(
          (e) => `
          <a class="card card--${e.route}" href="#${e.route}">
            <span class="card__title">${e.title}</span>
            <span class="card__desc">${e.desc}</span>
          </a>`,
        ).join('')}
      </nav>
    </section>`;

  const clock = createClock(root.querySelector('.home__clock-svg'), {
    minuteNumbers: settings.minuteNumbers,
    seconds: settings.showSeconds,
    markers: false,
  });

  function tick() {
    const now = new Date();
    clock.setTime({ h: now.getHours(), m: now.getMinutes() + now.getSeconds() / 60 }, now.getSeconds());
  }
  tick();
  const timer = setInterval(tick, settings.showSeconds ? 1000 : 10000);
  return () => clearInterval(timer);
}
