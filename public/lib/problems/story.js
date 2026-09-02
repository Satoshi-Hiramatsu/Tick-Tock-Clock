// P10 文章題（P3〜P7 の組み合わせ）

import { multiples, randomTime } from './index.js';
import { addMinutes } from '../time.js';
import { timeHtml, minutesHtml, ruby, JIKAN, NANJI_NANPUN, NANPUN, MAE, plain } from '../text.js';

const PLACES = [
  { from: 'いえ', to: 'がっこう', verb: 'あるきました' },
  { from: 'いえ', to: 'こうえん', verb: 'あるきました' },
  { from: 'がっこう', to: 'としょかん', verb: 'あるきました' },
  { from: 'えき', to: 'おばあちゃんの いえ', verb: 'バスに のりました' },
];

const ACTIVITIES = ['ほんを よみました', 'えを かきました', 'そうじを しました', 'おふろに はいっていました'];

export const P10 = {
  id: 'P10',
  name: 'ぶんしょうだい',
  desc: 'おはなしを よんで こたえる',
  answerModes: ['choice', 'hand', 'input'],
  generate(rng, o) {
    const kind = rng.pick(['after', 'before', 'duration']);
    const start = randomTime(rng, o.step);
    const deltas = multiples(o.step, o.step, o.maxDelta);
    const delta = rng.pick(deltas);
    const place = rng.pick(PLACES);
    const de = ruby('出', 'で');

    if (kind === 'after') {
      const end = addMinutes(start, delta).time;
      const html = `${place.from}を ${timeHtml(start)} に ${de}て、${minutesHtml(delta)} ${place.verb}。${place.to}に ついたのは ${NANJI_NANPUN} ですか。`;
      return base('after', start, delta, end, { type: 'time', time: end }, html, o);
    }
    if (kind === 'before') {
      const end = addMinutes(start, -delta).time;
      const html = `${timeHtml(start)} に ${place.to}に つきました。${place.from}を ${de}たのは、その ${minutesHtml(delta)}${MAE} です。${place.from}を ${de}たのは ${NANJI_NANPUN} ですか。`;
      return base('before', start, -delta, end, { type: 'time', time: end }, html, o);
    }
    const end = addMinutes(start, delta).time;
    const act = rng.pick(ACTIVITIES);
    const html = `${timeHtml(start)} から ${timeHtml(end)} まで ${act}。かかった ${JIKAN}は ${NANPUN} ですか。`;
    return base('duration', start, delta, end, { type: 'minutes', value: delta }, html, o);
  },
};

function base(variant, start, delta, end, answer, html, o) {
  return {
    pattern: 'P10',
    variant,
    start,
    delta,
    end,
    answer,
    textHtml: html,
    text: plain(html),
    options: { step: o.step },
  };
}
