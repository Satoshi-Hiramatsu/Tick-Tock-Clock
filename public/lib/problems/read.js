// P1 時計をよむ、P2 時計にかく

import { multiples, randomTime } from './index.js';
import { timeHtml, NANJI_NANPUN, plain } from '../text.js';

function make(pattern, start, o, answerType) {
  const html =
    pattern === 'P1'
      ? `とけいは ${NANJI_NANPUN} ですか。`
      : `${timeHtml(start, { ampm: false })} に なるように、はりを うごかしましょう。`;
  return {
    pattern,
    start,
    delta: 0,
    answer: { type: answerType, time: start },
    textHtml: html,
    text: plain(html),
    printHtml: pattern === 'P2' ? `${timeHtml(start)} の はりを かきましょう。` : html,
    options: { step: o.step },
  };
}

export const P1 = {
  id: 'P1',
  name: 'とけいを よむ',
  desc: 'とけいを みて、なんじなんぷんか こたえる',
  answerModes: ['choice', 'input'],
  generate(rng, o) {
    return make('P1', randomTime(rng, o.step), o, 'time');
  },
};

export const P2 = {
  id: 'P2',
  name: 'とけいに かく',
  desc: 'じこくに あわせて はりを うごかす',
  answerModes: ['hand'],
  generate(rng, o) {
    const start = { h: rng.int(0, 23), m: rng.pick(multiples(o.step, 0, 59)) };
    return make('P2', start, o, 'draw');
  },
};
