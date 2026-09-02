// 「動きのビュー」：時計・デジタル時計・経過分カウンター・数直線・時間ブロック・式を
// 1つの「経過分」から描く。まなぶ画面と、れんしゅうの解説画面で共用する。

import { createClock } from '../lib/clock-svg.js';
import { createAnimator } from '../lib/animator.js';
import { addMinutes, toMinutes, crossings, splitAtHour, splitByHour, hour12, mod, MINUTES_PER_DAY } from '../lib/time.js';
import { timeLabel, durationLabel } from '../lib/text.js';

const SPEEDS = [
  { id: 'slow', label: 'ゆっくり' },
  { id: 'normal', label: 'ふつう' },
  { id: 'instant', label: 'いっき' },
];

const pad2 = (n) => String(n).padStart(2, '0');

/** 要素を一度大きくして戻す。連続で呼んでも毎回動く。 */
export function pulse(node) {
  node.classList.remove('is-pulse');
  void node.offsetWidth;
  node.classList.add('is-pulse');
}

function fractionalTime(start, signedElapsed) {
  const total = mod(toMinutes(start) + signedElapsed, MINUTES_PER_DAY);
  const h = Math.floor(total / 60);
  return { h, m: total - h * 60 };
}

const NS = 'http://www.w3.org/2000/svg';
function svgEl(name, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

/**
 * @param {HTMLElement} container
 * @param {{ settings: object, controls?: boolean, scrub?: boolean, formula?: boolean, extras?: boolean }} p
 */
export function createMovementView(
  container,
  { settings, controls = true, scrub = true, formula = true, extras = true, ampm = settings.ampm },
) {
  container.innerHTML = `
    <div class="mv">
      <div class="mv__clock"></div>
      <div class="mv__readout">
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
      <div class="mv__scrub" ${scrub ? '' : 'hidden'}>
        <button type="button" class="btn btn--icon mv__play" aria-label="もういちど うごかす" title="もういちど うごかす">▶</button>
        <input type="range" class="mv__range" min="0" max="1000" value="0" aria-label="うごきの いち">
        <fieldset class="speed speed--compact" ${controls ? '' : 'hidden'}>
          <legend>はやさ</legend>
          ${SPEEDS.map(
            (s) => `<label class="speed__item"><input type="radio" name="speed" value="${s.id}" ${settings.speed === s.id ? 'checked' : ''}><span>${s.label}</span></label>`,
          ).join('')}
        </fieldset>
      </div>
      <div class="mv__extras" ${extras ? '' : 'hidden'}>
        <div class="numberline"><svg class="numberline__svg" viewBox="0 0 400 44" preserveAspectRatio="none" aria-hidden="true"></svg></div>
        <div class="blocks" aria-label="じかんの ブロック"></div>
      </div>
      <ol class="formula" ${formula ? '' : 'hidden'}></ol>
    </div>`;

  const $ = (sel) => container.querySelector(sel);
  const clock = createClock($('.mv__clock'), {
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
  const playBtn = $('.mv__play');
  const rangeEl = $('.mv__range');
  const lineSvg = $('.numberline__svg');
  const blocksEl = $('.blocks');
  const formulaEl = $('.formula');

  const reduceMotion =
    settings.reduceMotion ?? (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);

  let movement = null; // { start, delta, direction, total, boundaries, steps }
  let animator = null;
  let lastShown = -1;
  let doneResolve = null;
  const listeners = { done: [] };

  // ---------- 表示 ----------
  function showDigital(time) {
    if (settings.use24h) {
      prefixEl.textContent = '';
      hEl.textContent = pad2(time.h);
      unitHEl.textContent = ':';
      mEl.textContent = pad2(time.m);
      unitMEl.textContent = '';
      return;
    }
    const { hour, prefix } = hour12(time, ampm);
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

  function buildNumberLine() {
    lineSvg.replaceChildren();
    if (!movement) return;
    const { total, direction, boundaries } = movement;
    const W = 400;
    const x = (min) => (direction > 0 ? (min / total) * W : W - (min / total) * W);
    svgEl('rect', { x: 0, y: 14, width: W, height: 16, class: 'numberline__track' }, lineSvg);
    svgEl('rect', { x: direction > 0 ? 0 : W, y: 14, width: 0, height: 16, class: 'numberline__fill' }, lineSvg);
    const labelEvery = total > 120 ? 60 : total > 60 ? 30 : 10;
    const ticks = [];
    for (let m = 0; m <= total; m += 10) ticks.push(m);
    if (total % 10 !== 0) ticks.push(total); // 端数の終わりにも目盛りと数字を置く
    for (const m of ticks) {
      const hour = m > 0 && m % 60 === 0;
      svgEl(
        'line',
        { x1: x(m), y1: hour ? 8 : 12, x2: x(m), y2: hour ? 36 : 32, class: hour ? 'numberline__tick numberline__tick--hour' : 'numberline__tick' },
        lineSvg,
      );
      if (m % labelEvery === 0 || m === total) {
        const t = svgEl('text', { x: x(m), y: 42, class: 'numberline__label', 'text-anchor': 'middle' }, lineSvg);
        t.textContent = m;
      }
    }
    for (const b of boundaries) {
      svgEl('polygon', { points: `${x(b) - 5},2 ${x(b) + 5},2 ${x(b)},10`, class: 'numberline__split' }, lineSvg);
    }
    svgEl('polygon', { points: '0,0 0,0 0,0', class: 'numberline__cursor' }, lineSvg);
  }

  function updateNumberLine(elapsed) {
    if (!movement) return;
    const { total, direction } = movement;
    const W = 400;
    const fill = lineSvg.querySelector('.numberline__fill');
    const cursor = lineSvg.querySelector('.numberline__cursor');
    if (!fill) return;
    const w = (elapsed / total) * W;
    fill.setAttribute('width', w);
    fill.setAttribute('x', direction > 0 ? 0 : W - w);
    const cx = direction > 0 ? w : W - w;
    cursor.setAttribute('points', `${cx - 6},44 ${cx + 6},44 ${cx},34`);
  }

  function updateBlocks(shown) {
    if (!movement) return;
    const { hours, minutes } = splitByHour(shown);
    const wantHours = hours;
    const rows = [];
    for (let i = 0; i < wantHours; i += 1) rows.push({ kind: 'hour', min: 60, label: '1時間' });
    if (minutes > 0) rows.push({ kind: 'rest', min: minutes, label: `${minutes}分` });
    const key = rows.map((r) => `${r.kind}:${r.min}`).join('|');
    if (blocksEl.dataset.key === key) return;
    blocksEl.dataset.key = key;
    blocksEl.replaceChildren();
    for (const r of rows) {
      const b = document.createElement('div');
      b.className = `block block--${r.kind}`;
      b.style.setProperty('--min', r.min);
      b.textContent = r.label;
      blocksEl.appendChild(b);
    }
  }

  function buildFormula() {
    formulaEl.replaceChildren();
    if (!movement) return;
    for (const step of movement.steps) {
      const li = document.createElement('li');
      li.className = 'formula__step';
      li.dataset.at = step.at;
      li.textContent = step.text;
      formulaEl.appendChild(li);
    }
  }

  function updateFormula(elapsed) {
    for (const li of formulaEl.children) {
      li.classList.toggle('is-done', elapsed >= Number(li.dataset.at) - 1e-9);
    }
  }

  // ---------- 解説の手順 ----------
  function buildSteps(start, delta) {
    const mode = settings.explainMode;
    const sign = delta > 0 ? '+' : '−';
    const label = (t) => timeLabel(t, { ampm });
    const steps = [];
    if (delta === 0) return steps;
    if (mode === 'chunk' || Math.abs(delta) < 60 && splitAtHour(start, delta).length === 1) {
      const { hours, minutes } = splitByHour(delta);
      if (hours === 0) {
        steps.push({ at: Math.abs(delta), text: `${label(start)} ${sign} ${minutes}分 = ${label(addMinutes(start, delta).time)}` });
        return steps;
      }
      const hoursMin = hours * 60;
      const afterHours = addMinutes(start, Math.sign(delta) * hoursMin).time;
      steps.push({
        at: 0,
        text:
          minutes > 0
            ? `${Math.abs(delta)}分 = ${hoursMin}分 + ${minutes}分 = ${hours}時間 + ${minutes}分`
            : `${Math.abs(delta)}分 = ${hours}時間`,
      });
      steps.push({ at: hoursMin, text: `${label(start)} ${sign} ${hours}時間 = ${label(afterHours)}` });
      if (minutes > 0) steps.push({ at: Math.abs(delta), text: `${label(afterHours)} ${sign} ${minutes}分 = ${label(addMinutes(start, delta).time)}` });
      return steps;
    }
    // くぎって考える
    const segs = splitAtHour(start, delta);
    let acc = 0;
    for (const s of segs) {
      acc += s.len;
      steps.push({ at: acc, text: `${label(s.from)} ${sign} ${s.len}分 = ${label(s.to)}` });
    }
    if (segs.length > 1) {
      steps.push({ at: Math.abs(delta), text: `${segs.map((s) => `${s.len}分`).join(' + ')} = ${durationLabel(Math.abs(delta), { asHours: Math.abs(delta) >= 60 })}` });
    }
    return steps;
  }

  // ---------- 描画（経過分から） ----------
  function draw(elapsed) {
    const { start, direction } = movement;
    clock.setTime(fractionalTime(start, direction * elapsed));
    clock.setMovement({ start, elapsed, direction });
    updateNumberLine(elapsed);
    updateFormula(elapsed);
    rangeEl.value = Math.round((elapsed / movement.total) * 1000);
    const shown = direction > 0 ? Math.floor(elapsed) : Math.ceil(elapsed);
    if (shown === lastShown) return;
    lastShown = shown;
    showDigital(addMinutes(start, direction * shown).time);
    showCounter(shown, direction);
    updateBlocks(shown);
  }

  function onEvent(ev) {
    if (ev.type === 'carry') {
      clock.flashTwelve();
      pulse(hEl);
    } else if (ev.type === 'lap') {
      clock.setLapLabel(ev.lap);
      pulse(breakdownEl);
    } else if (ev.type === 'tick') {
      pulse(nEl);
    }
  }

  function finish() {
    playBtn.textContent = '↻';
    listeners.done.forEach((fn) => fn());
    settle(true);
  }

  /** play() の Promise を解決する。completed=false は途中で打ち切られたことを表す。 */
  function settle(completed) {
    const resolve = doneResolve;
    doneResolve = null;
    resolve?.(completed);
  }

  // ---------- 公開 API ----------
  /** 動きなしで時刻を表示する。再生中なら打ち切る。 */
  function setTime(time) {
    animator?.pause();
    animator = null;
    settle(false);
    movement = null;
    lastShown = -1;
    clock.clearMovement();
    clock.setTime(time);
    showDigital(time);
    showCounter(0, 1);
    blocksEl.replaceChildren();
    blocksEl.dataset.key = '';
    lineSvg.replaceChildren();
    formulaEl.replaceChildren();
    rangeEl.value = 0;
    playBtn.textContent = '▶';
  }

  /**
   * 動きを設定して再生する。
   * @returns {Promise<boolean>} 最後まで再生したら true、setTime/destroy で打ち切られたら false
   */
  function play({ start, delta, autoplay = true }) {
    animator?.pause();
    settle(false);
    const direction = Math.sign(delta) || 1;
    const total = Math.abs(delta);
    const segs = splitAtHour(start, delta);
    const boundaries = [];
    let acc = 0;
    for (let i = 0; i < segs.length - 1; i += 1) {
      acc += segs[i].len;
      boundaries.push(acc);
    }
    movement = { start, delta, direction, total, boundaries, steps: buildSteps(start, delta) };
    lastShown = -1;
    container.firstElementChild.classList.toggle('is-backward', direction < 0);
    clock.clearMovement();
    buildNumberLine();
    buildFormula();
    blocksEl.replaceChildren();
    blocksEl.dataset.key = '';
    playBtn.textContent = '❚❚';
    animator = createAnimator({
      total,
      direction,
      speed: settings.speed,
      reduceMotion,
      tickEvery: settings.tickEvery,
      crossingsAt: crossings(start, delta),
      onFrame: draw,
      onEvent,
      onDone: finish,
    });
    return new Promise((resolve) => {
      doneResolve = resolve;
      if (autoplay) animator.play();
      else {
        draw(0);
        playBtn.textContent = '▶';
      }
    });
  }

  function onDone(fn) {
    listeners.done.push(fn);
  }

  function stop() {
    animator?.pause();
  }

  function destroy() {
    stop();
    settle(false);
    container.replaceChildren();
  }

  // ---------- 操作 ----------
  playBtn.addEventListener('click', () => {
    if (!animator) return;
    if (animator.playing) {
      animator.pause();
      playBtn.textContent = '▶';
    } else {
      if (animator.elapsed >= animator.total) clock.setLapLabel(0);
      animator.play();
      playBtn.textContent = '❚❚';
    }
  });

  rangeEl.addEventListener('input', () => {
    if (!animator) return;
    animator.seek(Number(rangeEl.value) / 1000);
    playBtn.textContent = '▶';
    const laps = Math.floor(animator.elapsed / 60);
    clock.setLapLabel(laps);
  });

  container.addEventListener('change', (e) => {
    if (e.target.name !== 'speed') return;
    settings.speed = e.target.value;
    animator?.setSpeed(settings.speed);
    container.dispatchEvent(new CustomEvent('settingschange', { bubbles: true }));
  });

  return { el: container.firstElementChild, clock, setTime, play, stop, onDone, destroy, get movement() { return movement; } };
}
