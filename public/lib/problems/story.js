// P10 文章題（P3〜P7 の組み合わせ）

import { multiples, randomTime } from './index.js';
import { addMinutes } from '../time.js';
import { timeHtml, minutesHtml, ruby, JIKAN, NANJI_NANPUN, NANPUN, MAE, plain } from '../text.js';

const PLACES = [
  { from: 'いえ', to: 'がっこう', verb: 'あるきました', from3: '家', to3: '学校', verb3: '歩きました', fromA: '自宅', toA: '学校', verbA: '徒歩で移動しました' },
  { from: 'いえ', to: 'こうえん', verb: 'あるきました', from3: '家', to3: '公園', verb3: '歩きました', fromA: '自宅', toA: '公園', verbA: '徒歩で移動しました' },
  { from: 'がっこう', to: 'としょかん', verb: 'あるきました', from3: '学校', to3: '図書館', verb3: '歩きました', fromA: '学校', toA: '図書館', verbA: '徒歩で移動しました' },
  { from: 'えき', to: 'おばあちゃんの いえ', verb: 'バスに のりました', from3: '駅', to3: '祖母の 家', verb3: 'バスに 乗りました', fromA: '駅', toA: '祖母宅', verbA: 'バスに乗車しました' },
];

const ACTIVITIES = [
  { kana: 'ほんを よみました', grade3: '本を 読みました', adult: '読書をしました' },
  { kana: 'えを かきました', grade3: '絵を かきました', adult: '絵画を描きました' },
  { kana: 'そうじを しました', grade3: 'そうじを しました', adult: '掃除をしました' },
  { kana: 'おふろに はいっていました', grade3: 'お風呂に 入っていました', adult: '入浴していました' },
];

export const P10 = {
  id: 'P10',
  name: 'ぶんしょうだい',
  desc: 'おはなしを よんで こたえる',
  names: { kana: 'ぶんしょうだい', grade3: '文章題', adult: '文章題（総合問題）' },
  descs: { kana: 'おはなしを よんで こたえる', grade3: 'お話を 読んで 答える', adult: '日常生活のシチュエーション文章題' },
  answerModes: ['choice', 'hand', 'input'],
  generate(rng, o) {
    const lvl = o.kanjiLevel || 'kana';
    const kind = rng.pick(['after', 'before', 'duration']);
    const start = randomTime(rng, o.step);
    const deltas = multiples(o.step, o.step, o.maxDelta);
    const delta = rng.pick(deltas);
    const place = rng.pick(PLACES);

    const fromText = lvl === 'adult' ? place.fromA : (lvl === 'grade3' ? place.from3 : place.from);
    const toText = lvl === 'adult' ? place.toA : (lvl === 'grade3' ? place.to3 : place.to);
    const verbText = lvl === 'adult' ? place.verbA : (lvl === 'grade3' ? place.verb3 : place.verb);
    const deText = lvl === 'adult' ? 'を出発し' : (lvl === 'grade3' ? `を ${ruby('出発', 'しゅっぱつ')}して` : `を ${ruby('出', 'で')}て`);
    const detaText = lvl === 'adult' ? 'を出発したのは' : (lvl === 'grade3' ? `を ${ruby('出発', 'しゅっぱつ')}したのは` : `を ${ruby('出', 'で')}たのは`);
    const tsuitaText = lvl === 'adult' ? 'に到着したのは' : (lvl === 'grade3' ? 'に 到着したのは' : 'に ついたのは');
    const tsukimashitaText = lvl === 'adult' ? 'に到着しました' : (lvl === 'grade3' ? 'に 到着しました' : 'に つきました');

    if (kind === 'after') {
      const end = addMinutes(start, delta).time;
      const html = `${fromText}${deText}、${timeHtml(start)} から ${minutesHtml(delta)} ${verbText}。${toText}${tsuitaText} ${NANJI_NANPUN} ですか。`;
      return base('after', start, delta, end, { type: 'time', time: end }, html, o);
    }
    if (kind === 'before') {
      const end = addMinutes(start, -delta).time;
      const html = `${timeHtml(start)} に ${toText}${tsukimashitaText}。${fromText}${detaText}、その ${minutesHtml(delta)}${MAE} です。${fromText}${detaText} ${NANJI_NANPUN} ですか。`;
      return base('before', start, -delta, end, { type: 'time', time: end }, html, o);
    }
    const end = addMinutes(start, delta).time;
    const act = rng.pick(ACTIVITIES);
    const actText = lvl === 'adult' ? act.adult : (lvl === 'grade3' ? act.grade3 : act.kana);
    const html = `${timeHtml(start)} から ${timeHtml(end)} まで ${actText}。かかった ${JIKAN}は ${NANPUN} ですか。`;
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
