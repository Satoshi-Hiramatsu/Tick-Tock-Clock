// S07〜S08 プリント：設定と A4 プレビュー、印刷

import { generateSet, PATTERNS, PRESETS, answerLabel } from '../lib/problems/index.js';
import { createClock } from '../lib/clock-svg.js';
import { randomSeed } from '../lib/rng.js';
import { hour12 } from '../lib/time.js';

const COUNTS = [6, 8, 10];
const OUTPUTS = { q: 'もんだいのみ', a: 'こたえのみ', both: 'もんだい＋こたえ' };
const DIFFICULTY_LABELS = { 1: 'やさしい', 2: 'ふつう', 3: 'むずかしい', 4: 'はってん' };

function readParams(params, settings) {
  const d = Number(params.get('d')) || settings.lastDifficulty || 2;
  const preset = PRESETS[d];
  const p = (params.get('p') || '').split(',').filter((id) => PATTERNS[id] && preset.patterns.includes(id));
  return {
    d,
    p: p.length ? p : preset.patterns,
    n: COUNTS.includes(Number(params.get('n'))) ? Number(params.get('n')) : 8,
    pages: Math.min(10, Math.max(1, Number(params.get('pages')) || 1)),
    out: OUTPUTS[params.get('out')] ? params.get('out') : 'both',
    name: params.get('name') !== '0',
    seed: Number(params.get('seed')) || 0,
  };
}

function toHash(s) {
  return `#print?d=${s.d}&p=${s.p.join(',')}&n=${s.n}&pages=${s.pages}&out=${s.out}&name=${s.name ? 1 : 0}&seed=${s.seed}`;
}

export function renderPrint(root, { settings, params }) {
  const state = readParams(params, settings);
  root.innerHTML = `
    <section class="print">
      <form class="print__form" aria-label="プリントの せってい">
        <h1 class="print__title">プリント</h1>
        <fieldset class="setup__group">
          <legend>むずかしさ</legend>
          <div class="setup__options">
            ${[1, 2, 3, 4].map((d) => `<label class="chip"><input type="radio" name="d" value="${d}" ${d === state.d ? 'checked' : ''}><span>★${d} ${DIFFICULTY_LABELS[d]}</span></label>`).join('')}
          </div>
        </fieldset>
        <fieldset class="setup__group">
          <legend>もんだいの しゅるい</legend>
          <div class="setup__patterns setup__patterns--compact">
            ${Object.values(PATTERNS).map((pt) => `<label class="pattern-chip"><input type="checkbox" name="p" value="${pt.id}"><span class="pattern-chip__name">${pt.name}</span><span class="pattern-chip__desc">${pt.desc}</span></label>`).join('')}
          </div>
        </fieldset>
        <fieldset class="setup__group">
          <legend>まいすう と もんだいすう</legend>
          <div class="setup__options">
            <label class="field">もんだいすう
              <select name="n">${COUNTS.map((n) => `<option value="${n}" ${n === state.n ? 'selected' : ''}>${n}もん</option>`).join('')}</select>
            </label>
            <label class="field">まいすう
              <select name="pages">${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<option value="${n}" ${n === state.pages ? 'selected' : ''}>${n}まい</option>`).join('')}</select>
            </label>
            <label class="field">しゅつりょく
              <select name="out">${Object.entries(OUTPUTS).map(([k, v]) => `<option value="${k}" ${k === state.out ? 'selected' : ''}>${v}</option>`).join('')}</select>
            </label>
            <label class="chip"><input type="checkbox" name="name" ${state.name ? 'checked' : ''}><span>なまえ・日づけ らん</span></label>
          </div>
        </fieldset>
        <div class="print__buttons">
          <button type="submit" class="btn btn--primary">つくる</button>
          <button type="button" class="btn" data-action="print" ${state.seed ? '' : 'disabled'}>いんさつ / PDF</button>
        </div>
        <p class="setup__note" data-seed>${state.seed ? `シード ${state.seed}（この URL を ひらくと おなじ プリントに なります）／ プレビューを クリックすると 大きく なります。` : '「つくる」を おすと プレビューが でます。'}</p>
      </form>
      <div class="print__preview">
        <div class="print__sheets" data-sheets></div>
      </div>
      <div class="print__toolbar">
        <button type="button" class="btn btn--primary" data-action="print" ${state.seed ? '' : 'disabled'}>いんさつ / PDF</button>
      </div>
    </section>`;

  const section = root.querySelector('.print');
  const form = section.querySelector('.print__form');
  const patternInputs = [...form.querySelectorAll('input[name=p]')];

  function applyDifficulty(d, selected) {
    const allowed = PRESETS[d].patterns;
    for (const input of patternInputs) {
      const ok = allowed.includes(input.value);
      input.disabled = !ok;
      input.checked = ok && (selected ? selected.includes(input.value) : true);
      input.closest('.pattern-chip').classList.toggle('is-disabled', !ok);
    }
  }
  applyDifficulty(state.d, state.p);

  form.addEventListener('change', (e) => {
    if (e.target.name === 'd') applyDifficulty(Number(e.target.value));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const next = {
      d: Number(fd.get('d')),
      p: patternInputs.filter((i) => i.checked && !i.disabled).map((i) => i.value),
      n: Number(fd.get('n')),
      pages: Number(fd.get('pages')),
      out: fd.get('out'),
      name: fd.get('name') === 'on',
      seed: randomSeed(),
    };
    if (!next.p.length) {
      form.querySelector('.setup__patterns').classList.add('is-error');
      return;
    }
    settings.lastDifficulty = next.d;
    location.hash = toHash(next);
  });

  const zoom = createZoom();

  section.addEventListener('click', (e) => {
    if (e.target.closest('[data-action=print]')) {
      window.print();
      return;
    }
    const sheet = e.target.closest('.print__preview .sheet');
    if (sheet) zoom.open(sheet);
  });

  section.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const sheet = e.target.closest('.print__preview .sheet');
    if (!sheet) return;
    e.preventDefault();
    zoom.open(sheet);
  });

  const sheetsEl = section.querySelector('[data-sheets]');
  const preview = section.querySelector('.print__preview');
  if (state.seed) {
    renderSheets(sheetsEl, state, settings);
    preview.classList.add('is-ready');
  }
  const fit = fitSheets(section, preview, sheetsEl);
  return () => {
    fit?.destroy();
    zoom.close();
  };
}

/** プレビューを画面に合わせて縮小する（印刷時は CSS で等倍に戻す）。
    ワイド画面では 1 枚がウィンドウの高さいっぱいに入る大きさにし、残りは枠の中でスクロールする。 */
function fitSheets(section, preview, sheetsEl) {
  const apply = () => {
    const sheet = sheetsEl.firstElementChild;
    if (!sheet) return;
    sheetsEl.style.width = '';
    sheetsEl.style.height = '';
    const sheetWidth = sheet.offsetWidth;
    const sheetHeight = sheet.offsetHeight;
    if (!sheetWidth || !sheetHeight) return;
    const wide = window.innerWidth > 760;
    // .print は position: static なので、スクロール位置に関係なく同じ上端が得られる。
    const top = section.getBoundingClientRect().top + window.scrollY;
    const paneHeight = Math.max(360, window.innerHeight - top - 16);
    preview.style.height = wide ? `${paneHeight}px` : '';
    const scale = wide
      ? Math.min(preview.clientWidth / sheetWidth, paneHeight / sheetHeight)
      : Math.min(1, preview.clientWidth / sheetWidth);
    sheetsEl.style.setProperty('--scale', scale);
    sheetsEl.style.width = `${sheetWidth * scale}px`;
    sheetsEl.style.height = `${sheetsEl.scrollHeight * scale}px`;
  };
  const ro = globalThis.ResizeObserver ? new ResizeObserver(apply) : null;
  ro?.observe(preview);
  window.addEventListener('resize', apply);
  apply();
  return {
    destroy() {
      ro?.disconnect();
      window.removeEventListener('resize', apply);
    },
  };
}

/** プレビューのシートをクリックしたときの拡大表示。画面ぴったり ⇄ 等倍 を切り替えられる。 */
function createZoom() {
  let overlay = null;
  let opener = null;
  let mode = 'fit';

  function layout() {
    if (!overlay) return;
    const sheet = overlay.querySelector('.sheet');
    const stage = overlay.querySelector('[data-stage]');
    const pad = 48;
    const fit = Math.min(
      (overlay.clientWidth - pad) / sheet.offsetWidth,
      (overlay.clientHeight - pad) / sheet.offsetHeight,
    );
    const scale = mode === 'fit' ? fit : 1;
    sheet.style.setProperty('--zoom', scale);
    stage.style.width = `${sheet.offsetWidth * scale}px`;
    stage.style.height = `${sheet.offsetHeight * scale}px`;
    overlay.dataset.mode = mode;
    overlay.querySelector('[data-zoom]').textContent = mode === 'fit' ? '等倍で みる' : '画面に あわせる';
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  function open(source) {
    close();
    opener = source;
    mode = 'fit';
    overlay = document.createElement('div');
    overlay.className = 'print__zoom';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'プリントの プレビュー');
    overlay.innerHTML = `
      <div class="print__zoom-stage" data-stage></div>
      <div class="print__zoom-bar">
        <button type="button" class="btn" data-zoom>等倍で みる</button>
        <button type="button" class="btn btn--primary" data-close>とじる</button>
      </div>`;
    const clone = source.cloneNode(true);
    for (const attr of ['tabindex', 'role', 'aria-label']) clone.removeAttribute(attr);
    overlay.querySelector('[data-stage]').appendChild(clone);
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) {
        close();
      } else if (e.target.closest('[data-zoom]') || e.target.closest('.sheet')) {
        mode = mode === 'fit' ? 'full' : 'fit';
        layout();
      } else {
        close();
      }
    });
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', layout);
    layout();
    overlay.querySelector('[data-close]').focus();
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', layout);
    opener?.focus();
    opener = null;
  }

  return { open, close };
}

function renderSheets(container, state, settings) {
  container.replaceChildren();
  for (let page = 0; page < state.pages; page += 1) {
    const problems = generateSet({ patterns: state.p, difficulty: state.d, count: state.n, seed: state.seed + page });
    if (state.out !== 'a') container.appendChild(buildSheet(problems, { ...state, page, answer: false, settings }));
    if (state.out !== 'q') container.appendChild(buildSheet(problems, { ...state, page, answer: true, settings }));
  }
}

function buildSheet(problems, { n, page, pages, answer, name, settings }) {
  const sheet = document.createElement('article');
  sheet.className = `sheet sheet--n${n} ${answer ? 'sheet--answer' : ''}`;
  sheet.tabIndex = 0;
  sheet.setAttribute('role', 'button');
  sheet.setAttribute('aria-label', `${answer ? 'こたえ' : 'もんだい'}の プレビューを 大きく みる`);
  sheet.innerHTML = `
    <header class="sheet__head">
      <h2 class="sheet__title">とけいの ${answer ? 'こたえ' : 'テスト'}${pages > 1 ? ` <small>${page + 1} / ${pages}</small>` : ''}</h2>
      ${
        name && !answer
          ? `<div class="sheet__fields"><span>なまえ</span><span class="sheet__line"></span><span>日づけ</span><span class="sheet__line sheet__line--short"></span><span>てん</span><span class="sheet__line sheet__line--short"></span></div>`
          : ''
      }
    </header>
    <ol class="sheet__grid"></ol>`;
  const grid = sheet.querySelector('.sheet__grid');
  problems.forEach((p, i) => grid.appendChild(buildItem(p, i, answer, settings)));
  return sheet;
}

function buildItem(p, i, answer, settings) {
  const li = document.createElement('li');
  li.className = `q q--${p.pattern.toLowerCase()}`;
  const hasClock = p.pattern !== 'P9';
  li.innerHTML = `
    <div class="q__num">${i + 1}</div>
    <p class="q__text">${p.printHtml || p.textHtml}</p>
    <div class="q__row">
      ${hasClock ? '<div class="q__clock"></div>' : ''}
      <p class="q__answer">${answerLine(p, answer)}</p>
    </div>`;
  if (hasClock) {
    const clock = createClock(li.querySelector('.q__clock'), {
      minuteNumbers: settings.minuteNumbers,
      seconds: false,
      markers: false,
      print: true,
    });
    const showsEnd = answer && (typeof p.delta === 'number' && p.delta !== 0);
    if (p.pattern === 'P2') {
      clock.setTime(p.start);
      clock.showHands(answer);
    } else if (showsEnd && p.answer.type === 'time') {
      clock.setTime(p.end);
      clock.setMovement({ start: p.start, elapsed: Math.abs(p.delta), direction: Math.sign(p.delta) });
    } else if (p.end && (p.pattern === 'P7' || p.variant === 'duration')) {
      clock.setTime(p.start);
      clock.setGhostTime(p.end);
      if (answer) clock.setMovement({ start: p.start, elapsed: p.delta, direction: 1 });
    } else {
      clock.setTime(p.start);
    }
  }
  return li;
}

function answerLine(p, answer) {
  const a = p.answer;
  const blank = (v, w = 'w2') => `<span class="blank ${w}">${answer ? v : ''}</span>`;
  if (a.type === 'draw') return answer ? `<span class="q__filled">${answerLabel(a)}</span>` : '';
  if (a.type === 'time') {
    const { hour, prefix } = hour12(a.time, !!a.ampm);
    const ampm = a.ampm ? `<span class="ampm">${answer ? `<b>${prefix}</b>` : '午前・午後'}</span>` : '';
    return `${ampm}${blank(hour)}時${blank(String(a.time.m))}分`;
  }
  if (a.type === 'minutes') return `${blank(String(a.value), 'w3')}分`;
  if (a.type === 'hm') return `${blank(String(a.hours))}時間${blank(String(a.minutes))}分`;
  return '';
}
