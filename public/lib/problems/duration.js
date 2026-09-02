// P7 何分間？（2つの時刻の間）

import { multiples, randomTime } from './index.js';
import { addMinutes } from '../time.js';
import { timeHtml, ruby, JIKAN, NANPUN, plain } from '../text.js';

export const P7 = {
  id: 'P7',
  name: 'なんぷんかん',
  desc: 'ふたつの じこくの あいだの じかん',
  answerModes: ['choice', 'input'],
  generate(rng, o) {
    const start = randomTime(rng, o.step);
    const choices = multiples(o.step, o.step, o.maxDelta);
    const delta = rng.pick(choices);
    const end = addMinutes(start, delta).time;
    const html = `${timeHtml(start)} に ${ruby('出', 'で')}て、${timeHtml(end)} に つきました。かかった ${JIKAN}は ${NANPUN} ですか。`;
    return {
      pattern: 'P7',
      start,
      end,
      delta,
      answer: { type: 'minutes', value: delta },
      textHtml: html,
      text: plain(html),
      options: { step: o.step },
    };
  },
};
