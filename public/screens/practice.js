// S03〜S06 れんしゅう：設定 → 出題 → 解説 → 結果

import { generateSet, PATTERNS, PRESETS, answersEqual, answerLabel, movementOf } from '../lib/problems/index.js';
import { createClock } from '../lib/clock-svg.js';
import { createMovementView } from '../components/movement-view.js';
import { createNumpad } from '../components/numpad.js';
import { randomSeed } from '../lib/rng.js';
import { splitAtHour, addMinutes, hour12 } from '../lib/time.js';
import { timeLabel, getText } from '../lib/text.js';
import { recordResult } from '../lib/storage.js';

const COUNT = 10;
const DIFFICULTY_LABELS = { 1: 'やさしい', 2: 'ふつう', 3: 'むずかしい', 4: 'はってん' };
const MODE_LABELS = { choice: '4つから えらぶ', hand: 'はりを うごかす', input: 'かずを いれる' };

export function renderPractice(root, ctx) {
  if (!ctx.params.get('seed')) return renderSetup(root, ctx);
  return renderSession(root, ctx);
}

// ---------- S03 設定 ----------
function renderSetup(root, { settings, params }) {
  const lvl = settings.kanjiLevel || 'kana';
  const difficulty = Number(params.get('d')) || settings.lastDifficulty || 2;
  const mode = params.get('mode') || settings.answerMode;

  const title = getText('practice.title', lvl, 'れんしゅう');
  const diffLegend = getText('practice.diffLegend', lvl, 'むずかしさ');
  const patternsLegend = getText('practice.patternsLegend', lvl, 'もんだいの しゅるい');
  const modeLegend = getText('practice.modeLegend', lvl, 'こたえかた');
  const modeNote = getText('practice.modeNote', lvl, 'もんだいに よっては、こたえかたが かわります。');
  const startBtn = getText('practice.startBtn', lvl, 'はじめる');

  root.innerHTML = `
    <section class="setup">
      <h1 class="setup__title">${title}</h1>
      <fieldset class="setup__group">
        <legend>${diffLegend}</legend>
        <div class="setup__options">
          ${[1, 2, 3, 4]
            .map(
              (d) => `<label class="chip"><input type="radio" name="difficulty" value="${d}" ${d === difficulty ? 'checked' : ''}><span>★${d} ${getText(`practice.diff.${d}`, lvl, DIFFICULTY_LABELS[d])}</span></label>`,
            )
            .join('')}
        </div>
      </fieldset>
      <fieldset class="setup__group">
        <legend>${patternsLegend}</legend>
        <div class="setup__patterns">
          ${Object.values(PATTERNS)
            .map(
              (p) => `<label class="pattern-chip"><input type="checkbox" name="pattern" value="${p.id}"><span class="pattern-chip__name">${p.names?.[lvl] || p.name}</span><span class="pattern-chip__desc">${p.descs?.[lvl] || p.desc}</span></label>`,
            )
            .join('')}
        </div>
      </fieldset>
      <fieldset class="setup__group">
        <legend>${modeLegend}</legend>
        <div class="setup__options">
          ${Object.entries(MODE_LABELS)
            .map(
              ([id, label]) => `<label class="chip"><input type="radio" name="mode" value="${id}" ${id === mode ? 'checked' : ''}><span>${getText(`practice.modes.${id}`, lvl, label)}</span></label>`,
            )
            .join('')}
        </div>
        <p class="setup__note">${modeNote}</p>
      </fieldset>
      <div class="setup__actions">
        <button type="button" class="btn btn--primary btn--big" data-action="start">${startBtn}</button>
      </div>
    </section>`;

  const section = root.querySelector('.setup');
  const patternInputs = [...section.querySelectorAll('input[name=pattern]')];

  function applyDifficulty(d) {
    const allowed = PRESETS[d].patterns;
    for (const input of patternInputs) {
      const ok = allowed.includes(input.value);
      input.disabled = !ok;
      input.checked = ok;
      input.closest('.pattern-chip').classList.toggle('is-disabled', !ok);
    }
  }
  applyDifficulty(difficulty);

  section.addEventListener('change', (e) => {
    if (e.target.name === 'difficulty') applyDifficulty(Number(e.target.value));
  });

  section.addEventListener('click', (e) => {
    if (e.target.closest('[data-action=start]')) {
      const d = Number(section.querySelector('input[name=difficulty]:checked').value);
      const m = section.querySelector('input[name=mode]:checked').value;
      const patterns = patternInputs.filter((i) => i.checked && !i.disabled).map((i) => i.value);
      if (!patterns.length) {
        section.querySelector('.setup__patterns').classList.add('is-error');
        return;
      }
      settings.lastDifficulty = d;
      settings.answerMode = m;
      location.hash = `#practice?d=${d}&p=${patterns.join(',')}&mode=${m}&seed=${randomSeed()}`;
    }
  });
}

// ---------- S04〜S06 セッション ----------
function renderSession(root, { settings, params }) {
  const lvl = settings.kanjiLevel || 'kana';
  const difficulty = Number(params.get('d')) || 2;
  const patterns = (params.get('p') || '').split(',').filter(Boolean);
  const mode = params.get('mode') || settings.answerMode;
  const seed = Number(params.get('seed'));
  const problems = generateSet({ patterns, difficulty, count: COUNT, seed, options: { kanjiLevel: lvl } });
  const results = []; // { problem, user, correct, tag, hints }
  let index = 0;
  let hints = 0;
  let cleanupPhase = null;
  let recorded = false; // 結果は1セットにつき1回だけ保存する

  function setPhase(fn) {
    cleanupPhase?.();
    cleanupPhase = null;
    root.replaceChildren();
    cleanupPhase = fn() || null;
    window.scrollTo(0, 0);
  }

  function resolveMode(problem) {
    const allowed = PATTERNS[problem.pattern].answerModes;
    return allowed.includes(mode) ? mode : allowed[0];
  }

  // ----- S04 出題 -----
  function ask() {
    const problem = problems[index];
    const answerMode = resolveMode(problem);
    hints = 0;
    root.innerHTML = `
      <section class="quiz">
        <div class="quiz__head">
          <span class="quiz__progress">${index + 1} / ${problems.length}</span>
          <span class="quiz__pattern">${PATTERNS[problem.pattern].names?.[lvl] || PATTERNS[problem.pattern].name}</span>
        </div>
        <p class="quiz__text">${problem.textHtml}</p>
        <div class="quiz__body">
          <div class="quiz__clock" ${problem.pattern === 'P9' ? 'hidden' : ''}></div>
          <div class="quiz__answer"></div>
        </div>
        <div class="quiz__hint" hidden></div>
        <div class="quiz__actions">
          <button type="button" class="btn btn--ghost" data-action="hint">${getText('practice.hintBtn', lvl, 'ヒントを みる')}</button>
          <button type="button" class="btn btn--primary" data-action="submit" ${answerMode === 'choice' ? 'hidden' : ''}>${getText('practice.submitBtn', lvl, 'こたえる')}</button>
        </div>
      </section>`;
    const section = root.querySelector('.quiz');
    const clockEl = section.querySelector('.quiz__clock');
    const answerEl = section.querySelector('.quiz__answer');
    const hintEl = section.querySelector('.quiz__hint');
    const submitBtn = section.querySelector('[data-action=submit]');

    let clock = null;
    let drag = null;
    let getAnswer = () => null;
    let pickedTag;

    if (problem.pattern !== 'P9') {
      clock = createClock(clockEl, { minuteNumbers: settings.minuteNumbers, seconds: false, markers: settings.bandMarkers });
      const shown = problem.pattern === 'P2' ? { h: 12, m: 0 } : problem.start;
      clock.setTime(shown);
      if (problem.pattern === 'P7' || (problem.pattern === 'P10' && problem.variant === 'duration')) clock.setGhostTime(problem.end);
    }

    if (answerMode === 'choice') {
      answerEl.innerHTML = `<div class="choices">${problem.choices
        .map((c, i) => `<button type="button" class="btn btn--choice" data-choice="${i}">${c.label}</button>`)
        .join('')}</div>`;
      answerEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-choice]');
        if (!btn) return;
        const c = problem.choices[Number(btn.dataset.choice)];
        pickedTag = c.tag;
        submit(c.answer);
      });
    } else if (answerMode === 'hand') {
      answerEl.innerHTML = `<p class="quiz__guide">${getText('practice.handGuide', lvl, 'ながい はりを ゆびで うごかして、こたえの じこくに あわせよう。')}</p>
        <div class="digital digital--small"><span class="digital__prefix"></span><span class="digital__h"></span><span class="digital__unit">時</span><span class="digital__m"></span><span class="digital__unit">分</span></div>`;
      const hEl = answerEl.querySelector('.digital__h');
      const mEl = answerEl.querySelector('.digital__m');
      const pEl = answerEl.querySelector('.digital__prefix');
      const showTime = (t) => {
        const { hour, prefix } = hour12(t, !!problem.answer.ampm);
        pEl.textContent = prefix;
        hEl.textContent = hour;
        mEl.textContent = String(t.m).padStart(2, '0');
      };
      const initial = problem.pattern === 'P2' ? { h: 12, m: 0 } : problem.start;
      showTime(initial);
      drag = clock.enableDrag({ step: problem.options.step, time: initial, onChange: showTime });
      getAnswer = () => ({ type: 'time', time: drag.time, ampm: problem.answer.ampm });
    } else {
      const kind = problem.answer.type === 'hm' ? 'hm' : problem.answer.type === 'minutes' ? 'minutes' : 'time';
      const pad = createNumpad(answerEl, { kind, ampm: !!problem.answer.ampm });
      getAnswer = () => pad.getAnswer();
    }

    function showHint() {
      hints += 1;
      hintEl.hidden = false;
      // 針方式では drag の状態も一緒に動かす（表示と答えがずれないように）
      const setHands = (t) => (drag ? drag.setTime(t) : clock?.setTime(t));
      hintEl.innerHTML = hintText(problem, hints, clock, setHands);
      if (hints >= 3) section.querySelector('[data-action=hint]').disabled = true;
    }

    function submit(user) {
      if (!user) {
        answerEl.classList.add('is-shake');
        setTimeout(() => answerEl.classList.remove('is-shake'), 400);
        return;
      }
      const correct = answersEqual(user, problem.answer);
      results[index] = { problem, user, correct, tag: correct ? null : pickedTag || 'other', hints };
      explain(index, { next: () => (index + 1 < problems.length ? (index += 1, setPhase(ask)) : setPhase(result)) });
    }

    section.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'hint') showHint();
      if (btn.dataset.action === 'submit') submit(getAnswer());
    });
    submitBtn.hidden = answerMode === 'choice';

    return () => drag?.dispose();
  }

  // ----- S05 解説 -----
  function explain(i, { next, backLabel = getText('practice.nextBtn', lvl, 'つぎへ') }) {
    setPhase(() => {
      const r = results[i];
      const problem = r.problem;
      const correctTitle = getText('practice.correctTitle', lvl, 'できた！');
      const retryTitle = getText('practice.retryTitle', lvl, 'おしい。もういちど みてみよう');
      const ansLabel = getText('practice.ansLabel', lvl, 'こたえ');
      const yoursLabel = getText('practice.yoursLabel', lvl, 'あなたの こたえ');
      root.innerHTML = `
        <section class="explain ${r.correct ? 'explain--correct' : 'explain--retry'}">
          <h2 class="explain__title">${r.correct ? correctTitle : retryTitle}</h2>
          <p class="explain__answer">${ansLabel} <b>${answerLabel(problem.answer)}</b>${r.correct ? '' : `<span class="explain__yours">（${yoursLabel}：${answerLabel(r.user)}）</span>`}</p>
          <p class="quiz__text quiz__text--small">${problem.textHtml}</p>
          <div class="explain__view"></div>
          <ul class="explain__notes"></ul>
          <div class="quiz__actions">
            <button type="button" class="btn btn--primary btn--big" data-action="next">${backLabel}</button>
          </div>
        </section>`;
      const section = root.querySelector('.explain');
      const notes = section.querySelector('.explain__notes');
      const view = createMovementView(section.querySelector('.explain__view'), {
        settings,
        controls: true,
        ampm: !!problem.answer.ampm,
      });
      const mv = movementOf(problem);

      if (problem.pattern === 'P1' || problem.pattern === 'P2') {
        view.setTime(problem.start);
        const { hour } = hour12(problem.start, false);
        const nextHour = (hour % 12) + 1;
        notes.innerHTML = `
          <li><span class="swatch swatch--hour"></span> みじかい はり（あか）は <b>${hour}</b>${problem.start.m > 0 ? ` と ${nextHour} の あいだ` : ''} → <b>${hour}時</b></li>
          <li><span class="swatch swatch--minute"></span> ながい はり（あお）は <b>${problem.start.m / 5 === Math.floor(problem.start.m / 5) ? problem.start.m / 5 || 12 : problem.start.m}</b> の ところ → <b>${problem.start.m}分</b>（5とびで かぞえる）</li>`;
      } else if (problem.pattern === 'P9') {
        const total = problem.answer.type === 'minutes' ? problem.answer.value : problem.totalMinutes;
        view.play({ start: { h: 0, m: 0 }, delta: total });
        notes.innerHTML = `<li>1時間 = 60分。60分の ブロックが いくつ できるか かぞえよう。</li>`;
      } else if (mv) {
        view.play({ start: mv.start, delta: mv.delta });
        if (problem.pattern === 'P7' || (problem.pattern === 'P10' && problem.variant === 'duration')) {
          view.clock.setGhostTime(problem.end);
          notes.innerHTML = `<li>${timeLabel(problem.start)} から ${timeLabel(problem.end)} まで、ながい はりが うごいた ぶんが「かかった 時間」。</li>`;
        }
        if (problem.pattern === 'P8') {
          notes.innerHTML = `<li>ひるの 12時を こえると「午後」、よるの 12時を こえると「午前」に かわる。</li>`;
        }
      }

      section.addEventListener('click', (e) => {
        if (e.target.closest('[data-action=next]')) next();
      });
      return () => view.destroy();
    });
  }

  // ----- S06 結果 -----
  function result() {
    const done = results.filter(Boolean);
    const correct = done.filter((r) => r.correct).length;
    const wrong = results.map((r, i) => ({ r, i })).filter(({ r }) => r && !r.correct);
    const byPattern = {};
    const wrongTags = {};
    for (const r of done) {
      byPattern[r.problem.pattern] ??= { correct: 0, total: 0 };
      byPattern[r.problem.pattern].total += 1;
      if (r.correct) byPattern[r.problem.pattern].correct += 1;
      else wrongTags[r.tag] = (wrongTags[r.tag] || 0) + 1;
    }
    if (!recorded) {
      recorded = true;
      recordResult({ difficulty, patterns, seed, correct, total: done.length, byPattern, wrongTags });
    }

    const resTitle = lvl === 'adult'
      ? `${done.length}問中 <b>${correct}</b>問正解`
      : (lvl === 'grade3' ? `${done.length}問中 <b>${correct}</b>問 正解しました` : `${done.length}もんちゅう <b>${correct}</b>もん できました`);
    const resMsg = correct === done.length
      ? (lvl === 'adult' ? '全問正解です。素晴らしい！' : (lvl === 'grade3' ? '全問正解！ よくできました！' : 'ぜんぶ できた！ すごい！'))
      : (lvl === 'adult' ? '不正解だった問題のアニメーションを確認して復習しましょう。' : (lvl === 'grade3' ? '間違えた 問題の 動きを 見て、もう一度 考えてみよう。' : 'まちがえた もんだいの うごきを みて、もういちど かんがえてみよう。'));

    const ansLabel = getText('practice.ansLabel', lvl, 'こたえ');
    const reviewBtn = getText('practice.reviewBtn', lvl, 'うごきを みる');
    const retrySetBtn = getText('practice.retrySetBtn', lvl, 'もういちど');
    const selectPatternBtn = getText('practice.selectPatternBtn', lvl, 'もんだいを えらぶ');
    const homeBtn = getText('practice.homeBtn', lvl, 'ホームへ');

    root.innerHTML = `
      <section class="result">
        <h1 class="result__title">${resTitle}</h1>
        <p class="result__msg">${resMsg}</p>
        ${
          wrong.length
            ? `<ul class="result__list">${wrong
                .map(
                  ({ r, i }) => `<li class="result__item">
                    <span class="result__q">${i + 1}. ${r.problem.text}</span>
                    <span class="result__a">${ansLabel} ${answerLabel(r.problem.answer)}</span>
                    <button type="button" class="btn btn--ghost" data-review="${i}">${reviewBtn}</button>
                  </li>`,
                )
                .join('')}</ul>`
            : ''
        }
        <div class="result__actions">
          <a class="btn btn--primary" href="#practice?d=${difficulty}&p=${patterns.join(',')}&mode=${mode}&seed=${randomSeed()}">${retrySetBtn}</a>
          <a class="btn" href="#practice?d=${difficulty}&mode=${mode}">${selectPatternBtn}</a>
          <a class="btn btn--ghost" href="#home">${homeBtn}</a>
        </div>
      </section>`;
    root.querySelector('.result').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-review]');
      if (!btn) return;
      explain(Number(btn.dataset.review), { next: () => setPhase(result), backLabel: 'けっかに もどる' });
    });
  }

  if (!problems.length) {
    root.innerHTML = '<section class="placeholder"><p>もんだいを つくれませんでした。</p><a class="btn" href="#practice">もどる</a></section>';
    return;
  }
  setPhase(ask);
  return () => cleanupPhase?.();
}

// ---------- ヒント ----------
function hintText(problem, stage, clock, setHands = (t) => clock?.setTime(t)) {
  const mv = movementOf(problem);
  if (problem.pattern === 'P1' || problem.pattern === 'P2') {
    const { hour } = hour12(problem.start, false);
    if (stage === 1) return `<span class="swatch swatch--hour"></span> まず みじかい はり（あか）を みよう。「${hour}」の ところに あるかな。`;
    if (stage === 2) return `<span class="swatch swatch--minute"></span> つぎに ながい はり（あお）。5とびで かぞえよう（5、10、15…）。`;
    return `こたえは <b>${hour}時</b> の なにかだよ。ながい はりは <b>${problem.start.m}分</b>。`;
  }
  if (problem.pattern === 'P9') {
    if (stage === 1) return '1時間は 60分だよ。';
    if (stage === 2) return '60分の かたまりが いくつ あるか かぞえよう。';
    return `のこりの 分を たそう。`;
  }
  if (!mv) return '';
  const dir = mv.delta > 0 ? '⟳ すすむ ほうへ' : '⟲ もどる ほうへ';
  if (stage === 1) return `ながい はりを <b>${dir}</b> うごかそう。`;
  const segs = splitAtHour(mv.start, mv.delta);
  if (stage === 2) {
    if (segs.length > 1) return `まず <b>${timeLabel(segs[0].to)}</b> まで <b>${segs[0].len}分</b>。のこりは ${Math.abs(mv.delta) - segs[0].len}分。`;
    return `ながい はりを <b>${Math.abs(mv.delta)}分</b> ぶん うごかそう。5とびで かぞえよう。`;
  }
  // 3段階目：途中まで針を動かして見せる
  const first = segs[0];
  setHands(first.to);
  clock?.setMovement({ start: mv.start, elapsed: first.len, direction: Math.sign(mv.delta) });
  const restText = segs.length > 1 ? `ここから あと ${Math.abs(mv.delta) - first.len}分。` : 'ここが こたえ！';
  return `<b>${timeLabel(first.to)}</b> まで うごかしたよ。${restText}`;
}
