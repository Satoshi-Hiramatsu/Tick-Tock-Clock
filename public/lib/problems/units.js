// P9 単位の変換（1時間20分 ⇄ 80分）

import { multiples } from './index.js';
import { hoursHtml, minutesHtml, NANPUN, NANJIKAN_NANPUN, plain } from '../text.js';

export const P9 = {
  id: 'P9',
  name: 'じかんと ふん',
  desc: '1じかん = 60ぷん の かんけい',
  answerModes: ['choice', 'input'],
  generate(rng, o) {
    const hours = rng.int(1, Math.max(1, Math.min(3, o.maxHours)));
    const minutes = rng.chance(0.25) ? 0 : rng.pick(multiples(o.step, o.step, 55));
    const total = hours * 60 + minutes;
    const toMinutes = rng.chance(0.5);
    const hm = { hours, minutes };
    if (toMinutes) {
      const html = `${hoursHtml(hours)}${minutes ? minutesHtml(minutes) : ''} は ${NANPUN} ですか。`;
      return {
        pattern: 'P9',
        variant: 'toMinutes',
        start: { h: 0, m: 0 },
        hm,
        answer: { type: 'minutes', value: total },
        textHtml: html,
        text: plain(html),
        options: { step: o.step },
      };
    }
    const html = `${minutesHtml(total)} は ${NANJIKAN_NANPUN} ですか。`;
    return {
      pattern: 'P9',
      variant: 'toHm',
      start: { h: 0, m: 0 },
      totalMinutes: total,
      hm,
      answer: { type: 'hm', hours, minutes },
      textHtml: html,
      text: plain(html),
      options: { step: o.step },
    };
  },
};
