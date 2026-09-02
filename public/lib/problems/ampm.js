// P8 午前・午後・正午をまたぐ

import { addMinutes } from '../time.js';
import { timeHtml, hoursHtml, ATO, MAE, GOZEN, GOGO, NANJI, plain } from '../text.js';

export const P8 = {
  id: 'P8',
  name: 'ごぜん・ごご',
  desc: 'ひるの12じや よるの12じを またぐ',
  answerModes: ['choice', 'input'],
  generate(rng, o) {
    // 正午（12時）か真夜中（0時）をまたぐように、境界の手前から進める（または先から戻る）
    // 正午は「午後0時」、真夜中は「午前0時」なので、境界ちょうどに着くのは
    // 進む場合は午前→午後（またぐ）、戻る場合は同じ側（またがない）。
    // 戻る場合は境界を越えて先へ行くよう、境界までの時間 gap を k より小さくする。
    const boundary = rng.chance(0.7) ? 12 : 0;
    const forward = rng.chance(0.7);
    const maxK = Math.max(2, o.maxHours);
    const k = forward ? rng.int(1, maxK) : rng.int(2, maxK);
    const gap = forward ? rng.int(1, k) : rng.int(1, k - 1); // 境界までの時間
    const startH = forward ? (boundary - gap + 24) % 24 : (boundary + gap) % 24;
    const start = { h: startH, m: 0 };
    const delta = (forward ? 1 : -1) * k * 60;
    const end = addMinutes(start, delta).time;
    const dir = forward ? ATO : MAE;
    const html = `いま ${timeHtml(start, { ampm: true })} です。${hoursHtml(k)}${dir} は、${GOZEN}・${GOGO} の どちらの ${NANJI} ですか。`;
    return {
      pattern: 'P8',
      start,
      delta,
      end,
      answer: { type: 'time', time: end, ampm: true },
      textHtml: html,
      text: plain(html),
      options: { step: o.step, ampm: true },
    };
  },
};
