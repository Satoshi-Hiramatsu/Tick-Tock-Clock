// P3 〜分後（繰り上がりなし）、P4 〜分後（繰り上がりあり）、P5 〜分前、P6 〜時間後・前

import { multiples, randomTime } from './index.js';
import { addMinutes } from '../time.js';
import { timeHtml, minutesHtml, hoursHtml, ATO, MAE, NANJI_NANPUN, NANJI, plain } from '../text.js';

function make(pattern, start, delta, o, { hours = false } = {}) {
  const lvl = o.kanjiLevel || 'kana';
  const end = addMinutes(start, delta).time;
  const dir = delta > 0 ? ATO : MAE;
  const amount = hours ? hoursHtml(Math.abs(delta) / 60) : minutesHtml(Math.abs(delta));
  const ask = hours && end.m === 0 ? NANJI : NANJI_NANPUN;
  const tail = delta > 0 ? 'ですか' : 'でしたか';
  const nowWord = lvl === 'adult' ? '現在' : (lvl === 'grade3' ? '今' : 'いま');

  const html = `${nowWord} ${timeHtml(start, { ampm: o.ampmInText })} です。${amount}${dir} は ${ask} ${tail}。`;

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
  names: { kana: 'なんぷん あと（くりあがり なし）', grade3: '何分後（繰り上がりなし）', adult: '〜分後（繰り上がりなし）' },
  descs: { kana: '〜ふんご の じこくを もとめる', grade3: '〜分後の 時こくを 求める', adult: '繰り上がりのない〜分後の時刻' },
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
  names: { kana: 'なんぷん あと（くりあがり あり）', grade3: '何分後（繰り上がりあり）', adult: '〜分後（繰り上がりあり）' },
  descs: { kana: '12を こえて つぎの じに なる', grade3: '12を こえて 次の 時に なる', adult: '時をまたぐ〜分後の時刻' },
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
  names: { kana: 'なんぷん まえ', grade3: '何分前', adult: '〜分前' },
  descs: { kana: '〜ふんまえ の じこくを もとめる', grade3: '〜分前の 時こくを 求める', adult: '時間をさかのぼる〜分前の時刻' },
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
  names: { kana: 'なんじかん あと・まえ', grade3: '何時間後・前', adult: '〜時間後・前' },
  descs: { kana: '〜じかんご、〜じかんまえ の じこく', grade3: '〜時間後、〜時間前の 時こく', adult: '1時間以上の単位で進む・戻る時刻' },
  answerModes: ['choice', 'hand', 'input'],
  generate(rng, o) {
    const start = { h: rng.int(0, 23), m: rng.chance(0.6) ? 0 : rng.pick(multiples(o.step, 0, 59)) };
    const k = rng.int(1, Math.max(1, o.maxHours));
    const sign = rng.chance(0.65) ? 1 : -1;
    return make('P6', start, sign * k * 60, o, { hours: true });
  },
};
