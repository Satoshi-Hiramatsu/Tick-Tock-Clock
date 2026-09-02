// 子ども向けの文言。漢字にはふりがな（ruby）を付け、設定で表示を切り替える。

import { hour12 } from './time.js';

export const ruby = (kanji, reading) => `<ruby>${kanji}<rt>${reading}</rt></ruby>`;

/** 「分」の読み。1・3・4・6・8・0 で終わる数は「ぷん」、それ以外は「ふん」。 */
export function minuteReading(m) {
  const last = m % 10;
  return [1, 3, 4, 6, 8, 0].includes(last) ? 'ぷん' : 'ふん';
}

export const JI = ruby('時', 'じ');
export const FUN = (m) => ruby('分', minuteReading(m));
export const JIKAN = ruby('時間', 'じかん');
export const NAN = ruby('何', 'なん');
export const GOZEN = ruby('午前', 'ごぜん');
export const GOGO = ruby('午後', 'ごご');
export const ATO = ruby('後', 'ご');
export const MAE = ruby('前', 'まえ');

export const NANJI_NANPUN = `${NAN}${JI}${NAN}${ruby('分', 'ぷん')}`;
export const NANJI = `${NAN}${JI}`;
export const NANPUN = `${NAN}${ruby('分', 'ぷん')}`;
export const NANJIKAN_NANPUN = `${NAN}${JIKAN}${NAN}${ruby('分', 'ぷん')}`;

/** 時刻の HTML。分が 0 なら「3時」、そうでなければ「3時10分」。 */
export function timeHtml(time, { ampm = false } = {}) {
  const { hour, prefix } = hour12(time, ampm);
  const prefixHtml = prefix === '午前' ? GOZEN : prefix === '午後' ? GOGO : '';
  const minutes = time.m === 0 ? '' : `${time.m}${FUN(time.m)}`;
  return `${prefixHtml}${hour}${JI}${minutes}`;
}

/** 時刻のプレーン文字列（選択肢や印刷の解答用）。 */
export function timeLabel(time, { ampm = false } = {}) {
  const { hour, prefix } = hour12(time, ampm);
  return `${prefix}${hour}時${time.m === 0 ? '' : `${time.m}分`}`;
}

export function minutesHtml(n) {
  return `${n}${FUN(n)}`;
}

export function hoursHtml(h) {
  return `${h}${JIKAN}`;
}

/** 「80分」を「1時間20分」の形にも書けるラベル。 */
export function durationLabel(minutes, { asHours = false } = {}) {
  if (!asHours || minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export function durationHtml(minutes, { asHours = false } = {}) {
  if (!asHours || minutes < 60) return minutesHtml(minutes);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? hoursHtml(h) : `${hoursHtml(h)}${minutesHtml(m)}`;
}

/** HTML からタグを除いた文字列（読み上げ・印刷の代替テキスト用）。 */
export function plain(html) {
  return html.replace(/<rt>.*?<\/rt>/g, '').replace(/<[^>]+>/g, '');
}
