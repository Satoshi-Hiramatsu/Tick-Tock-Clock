// P3 〜分後（繰り上がりなし）、P4 〜分後（繰り上がりあり）、P5 〜分前、P6 〜時間後・前

import { multiples, randomTime } from './index.js';
import { addMinutes } from '../time.js';
import { timeHtml, minutesHtml, hoursHtml, ATO, MAE, NANJI_NANPUN, NANJI, plain } from '../text.js';

function make(pattern, start, delta, o, { hours = false } = {}) {
  const end = addMinutes(start, delta).time;
  const dir = delta > 0 ? ATO : MAE;
  const amount = hours ? hoursHtml(Math.abs(delta) / 60) : minutesHtml(Math.abs(delta));
  const ask = hours && end.m === 0 ? NANJI : NANJI_NANPUN;
  const tail = delta > 0 ? 'ですか' : 'でしたか';
  const html = `いま ${timeHtml(start, { ampm: o.ampmInText })} です。${amount}${dir} は ${ask} ${tail}。`;
  return {
    pattern,
    start,
    delta,
    end,
    answer: { type: 'time', time: end },
    textHtml: html,
    text: plain(html),
    options: { step: o.step },
  };
}

export const P3 = {
  id: 'P3',
  name: 'なんぷん あと（くりあがり なし）',
  desc: '〜ふんご の じこくを もとめる',
  answerModes: ['choice', 'hand', 'input'],
  generate(rng, o) {
    const start = randomTime(rng, o.step);
    const choices = multiples(o.step, o.step, Math.min(o.maxDelta, 59 - start.m));
    if (!choices.length) return null;
    return make('P3', start, rng.pick(choices), o);
  },
};

export const P4 = {
  id: 'P4',
  name: 'なんぷん あと（くりあがり あり）',
  desc: '12を こえて つぎの じに なる',
  answerModes: ['choice', 'hand', 'input'],
  generate(rng, o) {
    const start = randomTime(rng, o.step);
    const choices = multiples(o.step, Math.max(o.step, 60 - start.m), o.maxDelta);
    if (!choices.length) return null;
    return make('P4', start, rng.pick(choices), o);
  },
};

export const P5 = {
  id: 'P5',
  name: 'なんぷん まえ',
  desc: '〜ふんまえ の じこくを もとめる',
  answerModes: ['choice', 'hand', 'input'],
  generate(rng, o) {
    const start = randomTime(rng, o.step);
    const borrow = o.carry && rng.chance(0.6);
    const choices = borrow
      ? multiples(o.step, Math.max(o.step, start.m + o.step), o.maxDelta)
      : multiples(o.step, o.step, Math.min(o.maxDelta, start.m));
    if (!choices.length) return null;
    return make('P5', start, -rng.pick(choices), o);
  },
};

export const P6 = {
  id: 'P6',
  name: 'なんじかん あと・まえ',
  desc: '〜じかんご、〜じかんまえ の じこく',
  answerModes: ['choice', 'hand', 'input'],
  generate(rng, o) {
    const start = { h: rng.int(0, 23), m: rng.chance(0.6) ? 0 : rng.pick(multiples(o.step, 0, 59)) };
    const k = rng.int(1, Math.max(1, o.maxHours));
    const sign = rng.chance(0.65) ? 1 : -1;
    return make('P6', start, sign * k * 60, o, { hours: true });
  },
};
