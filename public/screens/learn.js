// S02 まなぶ：時計を自由に動かし、動いた量を帯・デジタル時計・カウンター・数直線・ブロックで見る。

import { createMovementView } from '../components/movement-view.js';
import { addMinutes } from '../lib/time.js';
import { saveSettings } from '../lib/storage.js';

const DELTAS = [5, 10, 30, 60];
const START = { h: 15, m: 0 };
const DRAG_STEP = 5;

function buttonRow(direction) {
  const sign = direction > 0 ? '+' : '−';
  return DELTAS.map(
    (d) => `<button type="button" class="btn btn--delta" data-delta="${direction * d}">${sign}${d}<small>分</small></button>`,
  ).join('');
}

export function renderLearn(root, { settings }) {
  root.innerHTML = `
    <section class="learn">
      <div class="learn__view"></div>
      <p class="learn__hint">ながい はりを ゆびで うごかすことも できます。</p>
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
          <label class="toggle"><input type="radio" name="explain" value="split" ${settings.explainMode === 'split' ? 'checked' : ''}><span>くぎって かんがえる</span></label>
          <label class="toggle"><input type="radio" name="explain" value="chunk" ${settings.explainMode === 'chunk' ? 'checked' : ''}><span>1じかんの かたまりで かんがえる</span></label>
          <button type="button" class="btn btn--ghost" data-action="reset">はじめから</button>
        </div>
      </div>
    </section>`;

  const section = root.querySelector('.learn');
  const view = createMovementView(section.querySelector('.learn__view'), { settings });
  const buttons = [...section.querySelectorAll('.btn--delta')];

  let current = START;
  let busy = false;

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

  function reset() {
    view.stop();
    current = START;
    drag.setTime(current);
    view.setTime(current);
    setBusy(false);
  }

  section.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.delta) move(Number(btn.dataset.delta));
    if (btn.dataset.action === 'reset') reset();
  });

  section.addEventListener('change', (e) => {
    if (e.target.name === 'explain') {
      settings.explainMode = e.target.value;
      saveSettings(settings);
    }
  });
  section.addEventListener('settingschange', () => saveSettings(settings));

  reset();

  return () => {
    view.stop();
    drag.dispose();
  };
}
