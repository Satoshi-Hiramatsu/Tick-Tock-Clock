// P8 午前・午後・正午をまたぐ

import { addMinutes } from '../time.js';
import { timeHtml, hoursHtml, ATO, MAE, GOZEN, GOGO, NANJI, plain } from '../text.js';

export const P8 = {
  id: 'P8',
  name: 'ごぜん・ごご',
  desc: 'ひるの12じや よるの12じを またぐ',
  names: { kana: 'ごぜん・ごご', grade3: '午前・午後', adult: '午前・午後（12時またぎ）' },
  descs: { kana: 'ひるの12じや よるの12じを またぐ', grade3: '昼の12時や 夜の12時を またぐ', adult: '正午や真夜中をまたぐ時刻の計算' },
  answerModes: ['choice', 'input'],
  generate(rng, o) {
    const lvl = o.kanjiLevel || 'kana';
    const boundary = rng.chance(0.7) ? 12 : 0;
    const forward = rng.chance(0.7);
    const maxK = Math.max(2, o.maxHours);
    const k = forward ? rng.int(1, maxK) : rng.int(2, maxK);
    const gap = forward ? rng.int(1, k) : rng.int(1, k - 1);
    const startH = forward ? (boundary - gap + 24) % 24 : (boundary + gap) % 24;
    const start = { h: startH, m: 0 };
    const delta = (forward ? 1 : -1) * k * 60;
    const end = addMinutes(start, delta).time;
    const dir = forward ? ATO : MAE;
    const nowWord = lvl === 'adult' ? '現在' : (lvl === 'grade3' ? '今' : 'いま');

    const html = `${nowWord} ${timeHtml(start, { ampm: true })} です。${hoursHtml(k)}${dir} は、${GOZEN}・${GOGO} の どちらの ${NANJI} ですか。`;

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
