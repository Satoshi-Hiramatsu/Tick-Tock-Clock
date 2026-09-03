// 子ども向けの文言。漢字にはふりがな（ruby）を付け、設定で表示を切り替える。
// 漢字レベル（kana / grade3 / adult）に応じた語彙・UI文字列を提供する。

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

/** UIおよび問題文で使用する各漢字レベルの辞書 */
export const UI_TEXT = {
  nav: {
    learn: { kana: 'まなぶ', grade3: '学ぶ', adult: '学ぶ' },
    practice: { kana: 'れんしゅう', grade3: '練習', adult: '練習' },
    print: { kana: 'プリント', grade3: 'プリント', adult: 'プリント' },
    settings: { kana: 'せってい', grade3: '設定', adult: '設定' },
  },
  home: {
    now: { kana: 'いまの じこく', grade3: `今の ${ruby('時こく', 'じこく')}`, adult: `現在の${ruby('時刻', 'じこく')}` },
    learnDesc: { kana: 'とけいを うごかして みよう', grade3: `${ruby('時計', 'とけい')}を ${ruby('動', 'うご')}かして みよう`, adult: '時計を動かして学習する' },
    practiceDesc: { kana: 'もんだいに こたえよう', grade3: `${ruby('問題', 'もんだい')}に ${ruby('答', 'こた')}えよう`, adult: '練習問題を解く' },
    printDesc: { kana: 'テストを いんさつする', grade3: 'テストプリントを 印刷する', adult: 'テストプリントの作成・印刷' },
    settingsDesc: { kana: 'ひょうじを かえる', grade3: '設定を 変える', adult: '表示・操作設定の変更' },
  },
  learn: {
    dragHint: {
      kana: 'ながい はりを ゆびで うごかすことも できます。',
      grade3: `長い ${ruby('針', 'はり')}を 指で ${ruby('動', 'うご')}かすことも できます。`,
      adult: '長針をドラッグして動かすこともできます。',
    },
    forward: { kana: 'すすむ', grade3: ruby('進', 'すす') + 'む', adult: '進む' },
    backward: { kana: 'もどる', grade3: ruby('戻', 'もど') + 'る', adult: '戻る' },
    teachTitle: {
      kana: 'じこくを きめて うごかす（せんせいモード）',
      grade3: `${ruby('時こく', 'じこく')}を ${ruby('決', 'き')}めて ${ruby('動', 'うご')}かす（先生モード）`,
      adult: '時刻を指定して動かす（先生モード）',
    },
    teachHint: {
      kana: 'テストの もんだいと おなじ じこく・おなじ 分すうを 入れて、そのまま うごかせます。',
      grade3: `テストの ${ruby('問題', 'もんだい')}と 同じ ${ruby('時こく', 'じこく')}・同じ 分数を 入れて、そのまま ${ruby('動', 'うご')}かせます。`,
      adult: '手元のテスト・問題集と同じ時刻・分数を入力して動かせます。',
    },
    teachStep1: { kana: '1. じこくを きめる', grade3: `1. ${ruby('時こく', 'じこく')}を ${ruby('決', 'き')}める`, adult: '1. 時刻を指定する' },
    btnJump: { kana: 'この じこくに する', grade3: `この ${ruby('時こく', 'じこく')}にする`, adult: 'この時刻にする' },
    teachStep2: { kana: '2. 分すうを きめて うごかす', grade3: `2. 分数を ${ruby('決', 'き')}めて ${ruby('動', 'うご')}かす`, adult: '2. 分数を指定して動かす' },
    teachForward: { kana: 'すすむ（〜分後）', grade3: `${ruby('進', 'すす')}む（〜分後）`, adult: '進む（〜分後）' },
    teachBackward: { kana: 'もどる（〜分前）', grade3: `${ruby('戻', 'もど')}る（〜分前）`, adult: '戻る（〜分前）' },
    teachNote: {
      kana: '90分の ように 60分より 大きい 数も 入れられます。',
      grade3: '90分の ように 60分より 大きい 数も 入力できます。',
      adult: '90分のように60分を超える分数も入力可能です。',
    },
    btnMove: { kana: 'うごかす', grade3: ruby('動', 'うご') + 'かす', adult: '動かす' },
    explainSplit: { kana: 'くぎって かんがえる', grade3: `区切って ${ruby('考', 'かんが')}える`, adult: '段階的に考える' },
    explainChunk: { kana: '1じかんの かたまりで かんがえる', grade3: `1時間の まとまりで ${ruby('考', 'かんが')}える`, adult: '1時間の塊で考える' },
    reset: { kana: 'はじめから', grade3: '初めから', adult: '最初から' },
    errTime: {
      kana: '午前・午後と、時・分を 入れてください。',
      grade3: '午前・午後と、時・分を 入れてください。',
      adult: '午前・午後および時・分を入力してください。',
    },
    errTimeSimple: {
      kana: '時・分を 入れてください。',
      grade3: '時・分を 入れてください。',
      adult: '時・分を入力してください。',
    },
    errMinutes: {
      kana: '1いじょうの 分すうを 入れてください。',
      grade3: '1以上の 分数を 入れてください。',
      adult: '1以上の分数を入力してください。',
    },
  },
  practice: {
    title: { kana: 'れんしゅう', grade3: '練習', adult: '練習' },
    diffLegend: { kana: 'むずかしさ', grade3: '難しさ', adult: '難易度' },
    diff: {
      1: { kana: 'やさしい', grade3: '初級', adult: '初級' },
      2: { kana: 'ふつう', grade3: '普通', adult: '中級' },
      3: { kana: 'むずかしい', grade3: '上級', adult: '上級' },
      4: { kana: 'はってん', grade3: '発展', adult: '発展' },
    },
    patternsLegend: { kana: 'もんだいの しゅるい', grade3: `${ruby('問題', 'もんだい')}の 種類`, adult: '出題形式' },
    modeLegend: { kana: 'こたえかた', grade3: `${ruby('答', 'こた')}え方`, adult: '解答方法' },
    modes: {
      choice: { kana: '4つから えらぶ', grade3: `4つから ${ruby('選', 'えら')}ぶ`, adult: '4択から選択' },
      hand: { kana: 'はりを うごかす', grade3: `${ruby('針', 'はり')}を ${ruby('動', 'うご')}かす`, adult: '針を操作' },
      input: { kana: 'かずを いれる', grade3: '数を 入力', adult: '数値を入力' },
    },
    modeNote: {
      kana: 'もんだいに よっては、こたえかたが かわります。',
      grade3: `${ruby('問題', 'もんだい')}に よっては、${ruby('答', 'こた')}え方が 変わります。`,
      adult: '問題の種類によっては解答方法が固定されます。',
    },
    startBtn: { kana: 'はじめる', grade3: `${ruby('始', 'はじ')}める`, adult: '開始する' },
    hintBtn: { kana: 'ヒントを みる', grade3: `ヒントを ${ruby('見', 'み')}る`, adult: 'ヒント' },
    submitBtn: { kana: 'こたえる', grade3: `${ruby('答', 'こた')}える`, adult: '回答する' },
    handGuide: {
      kana: 'ながい はりを ゆびで うごかして、こたえの じこくに あわせよう。',
      grade3: `長い ${ruby('針', 'はり')}を 指で ${ruby('動', 'うご')}かして、${ruby('答', 'こた')}えの ${ruby('時こく', 'じこく')}に 合わせよう。`,
      adult: '長針をドラッグして、解答の時刻に合わせてください。',
    },
    correctTitle: { kana: 'できた！', grade3: `${ruby('正解', 'せいかい')}！`, adult: '正解！' },
    retryTitle: { kana: 'おしい。もういちど みてみよう', grade3: `おしい。もう一度 ${ruby('見', 'み')}てみよう`, adult: '不正解。もう一度確認してみよう' },
    ansLabel: { kana: 'こたえ', grade3: ruby('答', 'こた') + 'え', adult: '正解' },
    yoursLabel: { kana: 'あなたの こたえ', grade3: `あなたの ${ruby('答', 'こた')}え`, adult: 'あなたの回答' },
    nextBtn: { kana: 'つぎへ', grade3: '次へ', adult: '次へ' },
    reviewBtn: { kana: 'うごきを みる', grade3: `${ruby('動', 'うご')}きを ${ruby('見', 'み')}る`, adult: '動きを見る' },
    retrySetBtn: { kana: 'もういちど', grade3: 'もう一度', adult: 'もう一度解く' },
    selectPatternBtn: { kana: 'もんだいを えらぶ', grade3: `${ruby('問題', 'もんだい')}を ${ruby('選', 'えら')}ぶ`, adult: '問題を選び直す' },
    homeBtn: { kana: 'ホームへ', grade3: 'ホームへ', adult: 'ホームへ' },
  },
  movement: {
    forward: { kana: 'すすんだ時間', grade3: `${ruby('進', 'すす')}んだ時間`, adult: '経過時間（進む）' },
    backward: { kana: 'もどった時間', grade3: `${ruby('戻', 'もど')}った時間`, adult: '経過時間（戻る）' },
    replay: { kana: 'もういちど うごかす', grade3: `もう一度 ${ruby('動', 'うご')}かす`, adult: 'もう一度再生' },
    speed: { kana: 'はやさ', grade3: `${ruby('速', 'はや')}さ`, adult: '速度' },
    speeds: {
      slow: { kana: 'ゆっくり', grade3: 'ゆっくり', adult: '低速' },
      normal: { kana: 'ふつう', grade3: 'ふつう', adult: '標準' },
      instant: { kana: 'いっき', grade3: '一気に', adult: '即時' },
    },
    blocks: { kana: 'じかんの ブロック', grade3: '時間の ブロック', adult: '時間のブロック' },
  },
};

/** 漢字レベルに応じたテキストを取得するヘルパー */
export function getText(path, level = 'kana', fallback = '') {
  const parts = path.split('.');
  let cur = UI_TEXT;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return fallback;
    cur = cur[p];
  }
  if (!cur || typeof cur !== 'object') return fallback;
  return cur[level] || cur.kana || fallback;
}
