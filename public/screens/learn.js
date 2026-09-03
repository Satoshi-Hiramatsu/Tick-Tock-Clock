// まなぶ画面：時計を自由に動かし、動いた量を帯・デジタル時計・カウンター・数直線・ブロックで見る。
// 漢字レベル（kana / grade3 / adult）に応じたテキスト切り替えに対応。

import { createMovementView } from '../components/movement-view.js';
import { createNumpad } from '../components/numpad.js';
import { addMinutes } from '../lib/time.js';
import { saveSettings } from '../lib/storage.js';
import { getText } from '../lib/text.js';

const DELTAS = [1, 5, 10, 30, 60];
const START = { h: 15, m: 0 };
const DRAG_STEP = 1;

function buttonRow(direction) {
  const sign = direction > 0 ? '+' : '−';
  return DELTAS.map(
    (d) => `<button type="button" class="btn btn--delta" data-delta="${direction * d}">${sign}${d}<small>分</small></button>`,
  ).join('');
}

export function renderLearn(root, { settings }) {
  const lvl = settings.kanjiLevel || 'kana';

  const t = {
    dragHint: getText('learn.dragHint', lvl, 'ながい はりを ゆびで うごかすことも できます。'),
    forward: getText('learn.forward', lvl, 'すすむ'),
    backward: getText('learn.backward', lvl, 'もどる'),
    teachTitle: getText('learn.teachTitle', lvl, 'じこくを きめて うごかす（せんせいモード）'),
    teachHint: getText('learn.teachHint', lvl, 'テストの もんだいと おなじ じこく・おなじ 分すうを 入れて、そのまま うごかせます。'),
    teachStep1: getText('learn.teachStep1', lvl, '1. じこくを きめる'),
    btnJump: getText('learn.btnJump', lvl, 'この じこくに する'),
    teachStep2: getText('learn.teachStep2', lvl, '2. 分すうを きめて うごかす'),
    teachForward: getText('learn.teachForward', lvl, 'すすむ（〜分後）'),
    teachBackward: getText('learn.teachBackward', lvl, 'もどる（〜分前）'),
    teachNote: getText('learn.teachNote', lvl, '90分の ように 60分より 大きい 数も 入れられます。'),
    btnMove: getText('learn.btnMove', lvl, 'うごかす'),
    explainSplit: getText('learn.explainSplit', lvl, 'くぎって かんがえる'),
    explainChunk: getText('learn.explainChunk', lvl, '1じかんの かたまりで かんがえる'),
    reset: getText('learn.reset', lvl, 'はじめから'),
  };

  root.innerHTML = `
    <section class="learn">
      <div class="learn__view"></div>
      <div class="learn__controls">
        <p class="learn__hint">${t.dragHint}</p>
        <div class="btn-row btn-row--forward">
          <span class="btn-row__title"><span aria-hidden="true">⟳</span> ${t.forward}</span>
          ${buttonRow(1)}
        </div>
        <div class="btn-row btn-row--backward">
          <span class="btn-row__title"><span aria-hidden="true">⟲</span> ${t.backward}</span>
          ${buttonRow(-1)}
        </div>
        <details class="teach">
          <summary class="teach__summary">${t.teachTitle}</summary>
          <div class="teach__body">
            <p class="teach__hint">${t.teachHint}</p>
            <div class="teach__block">
              <h2 class="teach__label">${t.teachStep1}</h2>
              <div class="teach__pad teach__pad--time"></div>
              <button type="button" class="btn btn--primary" data-action="jump">${t.btnJump}</button>
              <p class="teach__error" data-error="jump" hidden></p>
            </div>
            <div class="teach__block">
              <h2 class="teach__label">${t.teachStep2}</h2>
              <div class="teach__dir">
                <label class="toggle"><input type="radio" name="teachDir" value="1" checked><span><span aria-hidden="true">⟳</span> ${t.teachForward}</span></label>
                <label class="toggle"><input type="radio" name="teachDir" value="-1"><span><span aria-hidden="true">⟲</span> ${t.teachBackward}</span></label>
              </div>
              <div class="teach__pad teach__pad--minutes"></div>
              <p class="teach__note">${t.teachNote}</p>
              <button type="button" class="btn btn--primary" data-action="move-custom">${t.btnMove}</button>
              <p class="teach__error" data-error="move-custom" hidden></p>
            </div>
          </div>
        </details>
        <div class="learn__options">
          <label class="toggle"><input type="radio" name="explain" value="split" ${settings.explainMode === 'split' ? 'checked' : ''}><span>${t.explainSplit}</span></label>
          <label class="toggle"><input type="radio" name="explain" value="chunk" ${settings.explainMode === 'chunk' ? 'checked' : ''}><span>${t.explainChunk}</span></label>
          <button type="button" class="btn btn--ghost" data-action="reset">${t.reset}</button>
        </div>
      </div>
    </section>`;

  const section = root.querySelector('.learn');
  const view = createMovementView(section.querySelector('.learn__view'), { settings });
  const buttons = [...section.querySelectorAll('.btn--delta, [data-action="jump"], [data-action="move-custom"]')];
  const timePad = createNumpad(section.querySelector('.teach__pad--time'), { kind: 'time', ampm: settings.ampm });
  const minutesPad = createNumpad(section.querySelector('.teach__pad--minutes'), { kind: 'minutes' });

  let current = START;
  let busy = false;
  let teachDirection = 1;

  const drag = view.clock.enableDrag({
    step: DRAG_STEP,
    time: current,
    onChange: (t) => {
      current = t;
      view.setTime(t);
    },
  });

  function setBusy(b) {
    busy = b;
    for (const btn of buttons) btn.disabled = b;
    drag.setEnabled(!b);
  }

  async function move(delta) {
    if (busy) return;
    const start = current;
    setBusy(true);
    const completed = await view.play({ start, delta });
    if (completed) {
      current = addMinutes(start, delta).time;
      drag.setTime(current);
    }
    setBusy(false);
  }

  /** 動きを打ち切って、指定の時刻に合わせ直す。view.setTime が再生中の play() も解決する。 */
  function jumpTo(time) {
    current = time;
    drag.setTime(current);
    view.setTime(current);
    setBusy(false);
  }

  function reset() {
    jumpTo(START);
  }

  function showError(key, message) {
    const el = section.querySelector(`[data-error="${key}"]`);
    el.textContent = message;
    el.hidden = !message;
  }

  /** せんせいモード：入力された時刻に合わせる。 */
  function applyTime() {
    const answer = timePad.getAnswer();
    if (!answer) {
      showError('jump', settings.ampm ? getText('learn.errTime', lvl, '午前・午後と、時・分を 入れてください。') : getText('learn.errTimeSimple', lvl, '時・分を 入れてください。'));
      return;
    }
    showError('jump', '');
    jumpTo(answer.time);
  }

  /** せんせいモード：入力された分だけ、選んだ向きに動かす。60分以上も受け付ける。 */
  function applyMinutes() {
    const answer = minutesPad.getAnswer();
    if (!answer || answer.value <= 0) {
      showError('move-custom', getText('learn.errMinutes', lvl, '1いじょうの 分すうを 入れてください。'));
      return;
    }
    showError('move-custom', '');
    move(teachDirection * answer.value);
  }

  section.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.delta) move(Number(btn.dataset.delta));
    if (btn.dataset.action === 'reset') reset();
    if (btn.dataset.action === 'jump') applyTime();
    if (btn.dataset.action === 'move-custom') applyMinutes();
  });

  section.addEventListener('change', (e) => {
    if (e.target.name === 'explain') {
      settings.explainMode = e.target.value;
      saveSettings(settings);
    }
    if (e.target.name === 'teachDir') teachDirection = Number(e.target.value);
  });
  section.addEventListener('settingschange', () => saveSettings(settings));

  reset();

  return () => {
    view.stop();
    drag.dispose();
  };
}
