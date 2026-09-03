// P7 何分間？（2つの時刻の間）

import { multiples, randomTime } from './index.js';
import { addMinutes } from '../time.js';
import { timeHtml, ruby, JIKAN, NANPUN, plain } from '../text.js';

export const P7 = {
  id: 'P7',
  name: 'なんぷんかん',
  desc: 'ふたつの じこくの あいだの じかん',
  names: { kana: 'なんぷんかん', grade3: '何分間', adult: '所要時間（何分間）' },
  descs: { kana: 'ふたつの じこくの あいだの じかん', grade3: '2つの 時こくの 間の 時間', adult: '開始から終了までの経過時間の計算' },
  answerModes: ['choice', 'input'],
  generate(rng, o) {
    const lvl = o.kanjiLevel || 'kana';
    const start = randomTime(rng, o.step);
    const choices = multiples(o.step, o.step, o.maxDelta);
    const delta = rng.pick(choices);
    const end = addMinutes(start, delta).time;

    let html = '';
    if (lvl === 'adult') {
      html = `${timeHtml(start)} に出発し、${timeHtml(end)} に到着しました。所要時間は ${NANPUN} ですか。`;
    } else if (lvl === 'grade3') {
      html = `${timeHtml(start)} に ${ruby('出発', 'しゅっぱつ')}して、${timeHtml(end)} に ${ruby('到着', 'とうちゃく')}しました。かかった ${JIKAN}は ${NANPUN} ですか。`;
    } else {
      html = `${timeHtml(start)} に ${ruby('出', 'で')}て、${timeHtml(end)} に つきました。かかった ${JIKAN}は ${NANPUN} ですか。`;
    }

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
