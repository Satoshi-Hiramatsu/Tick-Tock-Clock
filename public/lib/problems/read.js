// P1 時計をよむ、P2 時計にかく

import { multiples, randomTime } from './index.js';
import { timeHtml, NANJI_NANPUN, plain, ruby } from '../text.js';

function make(pattern, start, o, answerType) {
  const lvl = o.kanjiLevel || 'kana';
  let html = '';
  if (pattern === 'P1') {
    if (lvl === 'adult') html = `時計は ${NANJI_NANPUN} を指していますか。`;
    else if (lvl === 'grade3') html = `${ruby('時計', 'とけい')}は ${NANJI_NANPUN} ですか。`;
    else html = `とけいは ${NANJI_NANPUN} ですか。`;
  } else {
    if (lvl === 'adult') html = `${timeHtml(start, { ampm: false })} を示すように針を動かしてください。`;
    else if (lvl === 'grade3') html = `${timeHtml(start, { ampm: false })} に なるように、${ruby('針', 'はり')}を ${ruby('動', 'うご')}かしましょう。`;
    else html = `${timeHtml(start, { ampm: false })} に なるように、はりを うごかしましょう。`;
  }

  const printHtml =
    pattern === 'P2'
      ? (lvl === 'adult' ? `${timeHtml(start)} の針をかき入れましょう。` : `${timeHtml(start)} の はりを かきましょう。`)
      : html;

  return {
    pattern,
    start,
    delta: 0,
    answer: { type: answerType, time: start },
    textHtml: html,
    text: plain(html),
    printHtml,
    options: { step: o.step },
  };
}

export const P1 = {
  id: 'P1',
  name: 'とけいを よむ',
  desc: 'とけいを みて、なんじなんぷんか こたえる',
  names: { kana: 'とけいを よむ', grade3: '時計を 読む', adult: '時計の読み取り' },
  descs: { kana: 'とけいを みて、なんじなんぷんか こたえる', grade3: '時計を 見て、何時何分か 答える', adult: '時計盤の針から時刻を読み取る' },
  answerModes: ['choice', 'input'],
  generate(rng, o) {
    return make('P1', randomTime(rng, o.step), o, 'time');
  },
};

export const P2 = {
  id: 'P2',
  name: 'とけいに かく',
  desc: 'じこくに あわせて はりを うごかす',
  names: { kana: 'とけいに かく', grade3: '時計に 書く', adult: '針の操作・描画' },
  descs: { kana: 'じこくに あわせて はりを うごかす', grade3: '時こくに 合わせて 針を 動かす', adult: '指定された時刻に合わせて針を動かす' },
  answerModes: ['hand'],
  generate(rng, o) {
    const start = { h: rng.int(0, 23), m: rng.pick(multiples(o.step, 0, 59)) };
    return make('P2', start, o, 'draw');
  },
};
