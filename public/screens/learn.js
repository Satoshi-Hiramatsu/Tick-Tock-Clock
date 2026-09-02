// S02 まなぶ：時計を自由に動かし、動いた量を帯・デジタル時計・カウンターで見る。

import { createClock } from '../lib/clock-svg.js';
import { createAnimator } from '../lib/animator.js';
import { addMinutes, toMinutes, crossings, splitByHour, hour12, mod, MINUTES_PER_DAY } from '../lib/time.js';
import { saveSettings } from '../lib/storage.js';

const DELTAS = [5, 10, 30, 60];
const START = { h: 15, m: 0 };

const SPEEDS = [
  { id: 'slow', label: 'ゆっくり' },
  { id: 'normal', label: 'ふつう' },
  { id: 'instant', label: 'いっき' },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 要素を一度大きくして戻す。連続で呼んでも毎回動く。 */
function pulse(node) {
  node.classList.remove('is-pulse');
  void node.offsetWidth;
  node.classList.add('is-pulse');
}

/** 通算分（小数可）から針用の時刻を作る。 */
function fractionalTime(start, signedElapsed) {
  const total = mod(toMinutes(start) + signedElapsed, MINUTES_PER_DAY);
  const h = Math.floor(total / 60);
  return { h, m: total - h * 60 };
}

function buttonRow(direction) {
  const sign = direction > 0 ? '+' : '−';
  return DELTAS.map(
    (d) =>
      `<button type="button" class="btn btn--delta" data-delta="${direction * d}">${sign}${d}<small>分</small></button>`,
  ).join('');
}

export function renderLearn(root, { settings }) {
  root.innerHTML = `
    <section class="learn">
      <div class="learn__stage">
        <div class="learn__clock"></div>
        <div class="learn__readout">
          <div class="digital" aria-live="polite">
            <span class="digital__prefix"></span><span class="digital__h">0</span><span class="digital__unit digital__unit--h">時</span><span class="digital__m">00</span><span class="digital__unit digital__unit--m">分</span>
          </div>
          <div class="counter">
            <div class="counter__main">
              <span class="counter__dir" aria-hidden="true">⟳</span>
              <span class="counter__label">すすんだ時間</span>
              <span class="counter__n">0</span><span class="counter__unit">分</span>
            </div>
            <div class="counter__breakdown" hidden></div>
          </div>
        </div>
      </div>
      <div class="learn__controls">
        <div class="btn-row btn-row--forward">
          <span class="btn-row__title"><span aria-hidden="true">⟳</span> すすむ</span>
          ${buttonRow(1)}
        </div>
        <div class="btn-row btn-row--backward">
          <span class="btn-row__title"><span aria-hidden="true">⟲</span> もどる</span>
          ${buttonRow(-1)}
        </div>
        <div class="learn__options">
          <fieldset class="speed">
            <legend>はやさ</legend>
            ${SPEEDS.map(
              (s) => `
              <label class="speed__item">
                <input type="radio" name="speed" value="${s.id}" ${settings.speed === s.id ? 'checked' : ''}>
                <span>${s.label}</span>
              </label>`,
            ).join('')}
          </fieldset>
          <button type="button" class="btn btn--ghost" data-action="reset">はじめから</button>
        </div>
      </div>
    </section>`;

  // リスナーは画面ごとの要素に付ける。root に付けると画面を離れても残ってしまう。
  const section = root.querySelector('.learn');
  const $ = (sel) => section.querySelector(sel);
  const clock = createClock($('.learn__clock'), {
    minuteNumbers: settings.minuteNumbers,
    seconds: false,
    markers: settings.bandMarkers,
  });
  const prefixEl = $('.digital__prefix');
  const hEl = $('.digital__h');
  const mEl = $('.digital__m');
  const unitHEl = $('.digital__unit--h');
  const unitMEl = $('.digital__unit--m');
  const counterEl = $('.counter');
  const dirEl = $('.counter__dir');
  const labelEl = $('.counter__label');
  const nEl = $('.counter__n');
  const breakdownEl = $('.counter__breakdown');
  const buttons = [...section.querySelectorAll('.btn--delta')];

  const reduceMotion =
    settings.reduceMotion ?? (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);

  let current = START;
  let animator = null;
  let lastShown = -1;

  function showDigital(time) {
    if (settings.use24h) {
      prefixEl.textContent = '';
      hEl.textContent = pad2(time.h);
      unitHEl.textContent = ':';
      mEl.textContent = pad2(time.m);
      unitMEl.textContent = '';
      return;
    }
    const { hour, prefix } = hour12(time, settings.ampm);
    prefixEl.textContent = prefix;
    hEl.textContent = String(hour);
    unitHEl.textContent = '時';
    mEl.textContent = pad2(time.m);
    unitMEl.textContent = '分';
  }

  function showCounter(shown, direction) {
    nEl.textContent = String(shown);
    if (shown >= 60) {
      const { hours, minutes } = splitByHour(shown);
      breakdownEl.textContent = `= ${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
      breakdownEl.hidden = false;
    } else {
      breakdownEl.hidden = true;
      breakdownEl.textContent = '';
    }
    counterEl.classList.toggle('is-backward', direction < 0);
    dirEl.textContent = direction < 0 ? '⟲' : '⟳';
    labelEl.textContent = direction < 0 ? 'もどった時間' : 'すすんだ時間';
  }

  function setBusy(busy) {
    for (const b of buttons) b.disabled = busy;
  }

  function draw(start, direction, elapsed) {
    clock.setTime(fractionalTime(start, direction * elapsed));
    clock.setMovement({ start, elapsed, direction });
    const shown = direction > 0 ? Math.floor(elapsed) : Math.ceil(elapsed);
    if (shown === lastShown) return;
    lastShown = shown;
    showDigital(addMinutes(start, direction * shown).time);
    showCounter(shown, direction);
  }

  function move(delta) {
    if (animator?.playing) return;
    const start = current;
    const direction = Math.sign(delta);
    lastShown = -1;
    clock.clearMovement();
    animator = createAnimator({
      total: Math.abs(delta),
      direction,
      speed: settings.speed,
      reduceMotion,
      tickEvery: settings.tickEvery,
      crossingsAt: crossings(start, delta),
      onFrame: (elapsed) => draw(start, direction, elapsed),
      onEvent: (ev) => {
        if (ev.type === 'carry') {
          clock.flashTwelve();
          pulse(hEl);
        } else if (ev.type === 'lap') {
          clock.setLapLabel(ev.lap);
          pulse(breakdownEl);
        } else if (ev.type === 'tick') {
          pulse(nEl);
        }
      },
      onDone: () => {
        current = addMinutes(start, delta).time;
        setBusy(false);
      },
    });
    setBusy(true);
    animator.play();
  }

  function reset() {
    animator?.pause();
    animator = null;
    current = START;
    lastShown = -1;
    clock.clearMovement();
    clock.setTime(START);
    showDigital(START);
    showCounter(0, 1);
    setBusy(false);
  }

  section.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.delta) move(Number(btn.dataset.delta));
    if (btn.dataset.action === 'reset') reset();
  });

  section.addEventListener('change', (e) => {
    if (e.target.name !== 'speed') return;
    settings.speed = e.target.value;
    saveSettings(settings);
    animator?.setSpeed(settings.speed);
  });

  reset();

  return () => animator?.pause();
}
