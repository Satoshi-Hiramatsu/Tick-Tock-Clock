// 問題生成の入口。パターン登録、難易度プリセット、セット生成、検証、4択の誤答生成。

import { createRng } from '../rng.js';
import { addMinutes, toMinutes } from '../time.js';
import { timeLabel, durationLabel } from '../text.js';
import { P1, P2 } from './read.js';
import { P3, P4, P5, P6 } from './after-before.js';
import { P7 } from './duration.js';
import { P8 } from './ampm.js';
import { P9 } from './units.js';
import { P10 } from './story.js';

export const PATTERNS = { P1, P2, P3, P4, P5, P6, P7, P8, P9, P10 };
export const PATTERN_IDS = Object.keys(PATTERNS);

/** 難易度プリセット（計画書 5.2 章） */
export const PRESETS = {
  1: { step: 15, maxDelta: 30, carry: false, maxHours: 2, patterns: ['P1', 'P2', 'P3'] },
  2: { step: 5, maxDelta: 60, carry: true, maxHours: 2, patterns: ['P1', 'P2', 'P3', 'P4', 'P5'] },
  3: { step: 5, maxDelta: 120, carry: true, maxHours: 3, patterns: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'] },
  4: { step: 1, maxDelta: 180, carry: true, maxHours: 6, patterns: PATTERN_IDS },
};

export function optionsFor(difficulty, overrides = {}) {
  const preset = PRESETS[difficulty] || PRESETS[2];
  return { ...preset, difficulty: Number(difficulty) || 2, kanjiLevel: overrides.kanjiLevel || 'kana', ...overrides };
}

/** step の倍数を min 以上 max 以下で列挙する。 */
export function multiples(step, min, max) {
  const out = [];
  const first = Math.ceil(min / step) * step;
  for (let v = first; v <= max; v += step) out.push(v);
  return out;
}

export function randomTime(rng, step) {
  return { h: rng.int(0, 23), m: rng.pick(multiples(step, 0, 59)) };
}

/** 生成された問題が制約を満たすか。 */
export function validate(p, o) {
  const okTime = (t) => t && t.h >= 0 && t.h <= 23 && t.m >= 0 && t.m <= 59 && Number.isInteger(t.m);
  if (!okTime(p.start)) return false;
  if (p.end && !okTime(p.end)) return false;
  if (p.start.m % o.step !== 0) return false;
  if (typeof p.delta === 'number') {
    if (Math.abs(p.delta) > Math.max(o.maxDelta, o.maxHours * 60)) return false;
    if (p.delta % o.step !== 0) return false;
  }
  if (p.pattern === 'P3' && p.start.m + p.delta >= 60) return false;
  if (p.pattern === 'P4' && p.start.m + p.delta < 60) return false;
  return true;
}

function problemKey(p) {
  return JSON.stringify([p.pattern, p.variant ?? '', p.start, p.delta ?? '', p.end ?? '', p.hm ?? '']);
}

/**
 * 問題セットを生成する。同じ seed・同じ引数からは同じ列が出る。
 * @param {{ patterns: string[], difficulty: number, count: number, seed: number, options?: object }} args
 */
export function generateSet({ patterns, difficulty, count, seed, options = {} }) {
  const o = optionsFor(difficulty, options);
  const rng = createRng(seed);
  // 不正な ID（古いリンクなど）を除き、残らなければプリセットに戻す
  const requested = (patterns || []).filter((id) => PATTERNS[id]);
  const ids = requested.length ? requested : o.patterns.filter((id) => PATTERNS[id]);
  if (!ids.length || count <= 0) return [];
  const order = [];
  while (order.length < count) order.push(...rng.shuffle(ids));
  const used = new Set();
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const gen = PATTERNS[order[i]];
    let problem = null;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidate = gen.generate(rng, o);
      if (candidate && validate(candidate, o) && !used.has(problemKey(candidate))) {
        problem = candidate;
        break;
      }
    }
    if (!problem) continue;
    used.add(problemKey(problem));
    problem.id = `${problem.pattern}-${seed}-${String(i + 1).padStart(2, '0')}`;
    problem.index = i;
    problem.difficulty = o.difficulty;
    problem.choices = makeChoices(problem, rng);
    out.push(problem);
  }
  return out;
}

/** 答えの表示ラベル。 */
export function answerLabel(answer) {
  switch (answer.type) {
    case 'time':
    case 'draw':
      return timeLabel(answer.time, { ampm: !!answer.ampm });
    case 'minutes':
      return durationLabel(answer.value, { asHours: answer.value >= 60 });
    case 'hm':
      return answer.minutes === 0 ? `${answer.hours}時間` : `${answer.hours}時間${answer.minutes}分`;
    default:
      return '';
  }
}

export function answersEqual(a, b) {
  if (!a || !b || a.type !== b.type) {
    // draw と time は同じ比較でよい
    if (a && b && ['time', 'draw'].includes(a.type) && ['time', 'draw'].includes(b.type)) {
      return sameTime(a, b);
    }
    return false;
  }
  if (a.type === 'time' || a.type === 'draw') return sameTime(a, b);
  if (a.type === 'minutes') return a.value === b.value;
  if (a.type === 'hm') return a.hours === b.hours && a.minutes === b.minutes;
  return false;
}

function sameTime(a, b) {
  if (a.ampm) return a.time.h === b.time.h && a.time.m === b.time.m;
  return a.time.h % 12 === b.time.h % 12 && a.time.m === b.time.m;
}

/**
 * 4択の選択肢。典型的な誤りから誤答を作る（計画書 5.3 章）。
 * 各選択肢は { label, answer, tag }。正解の tag は null。
 */
export function makeChoices(p, rng) {
  const correct = { label: answerLabel(p.answer), answer: p.answer, tag: null };
  const candidates = distractors(p);
  const seen = new Set([correct.label]);
  const picked = [];
  for (const c of candidates) {
    const label = answerLabel(c.answer);
    if (seen.has(label)) continue;
    seen.add(label);
    picked.push({ label, answer: c.answer, tag: c.tag });
    if (picked.length === 3) break;
  }
  return rng.shuffle([correct, ...picked]);
}

function distractors(p) {
  const a = p.answer;
  const out = [];
  const timeAns = (time, tag) => out.push({ tag, answer: { type: 'time', time, ampm: a.ampm ? true : undefined } });
  const shift = (time, d) => addMinutes(time, d).time;

  if (a.type === 'time' || a.type === 'draw') {
    const end = a.time;
    if (typeof p.delta === 'number' && p.delta !== 0) {
      const dir = Math.sign(p.delta);
      // 繰り上がり（繰り下がり）忘れ：分は合っているが時が動いていない
      timeAns(shift(end, -dir * 60), 'no-carry');
      // 時だけ進めて分を動かし忘れる
      if (p.start.m !== end.m) timeAns({ h: end.h, m: p.start.m }, 'hour-only');
      // 向きの間違い
      timeAns(shift(p.start, -p.delta), 'reverse');
      // 時針を1つ手前に読む
      timeAns(shift(end, -60), 'hour-misread');
    } else {
      // P1/P2：時針の読み違い、時と分の取り違え
      timeAns(shift(end, 60), 'hour-misread');
      timeAns(shift(end, -60), 'hour-misread');
      const swappedH = end.m / 5;
      if (Number.isInteger(swappedH) && swappedH >= 1 && swappedH <= 12 && swappedH !== end.h % 12) {
        timeAns({ h: swappedH, m: (end.h % 12) * 5 }, 'swap');
      }
    }
    // 予備：分を少しずらす
    for (const d of [5, -5, 10, -10, 15, -15, 30]) timeAns(shift(end, d), 'offset');
  } else if (a.type === 'minutes') {
    const v = a.value;
    const push = (value, tag) => value > 0 && value !== v && out.push({ tag, answer: { type: 'minutes', value } });
    push(v - 60, 'no-carry');
    push(v + 60, 'no-carry');
    if (p.hm) push(p.hm.hours * 100 + p.hm.minutes, 'no-convert');
    if (p.hm) push(p.hm.hours * 60, 'hour-only');
    for (const d of [10, -10, 20, -20, 5, -5, 30]) push(v + d, 'offset');
  } else if (a.type === 'hm') {
    const push = (hours, minutes, tag) =>
      hours >= 0 && minutes >= 0 && minutes < 60 && !(hours === a.hours && minutes === a.minutes) &&
      out.push({ tag, answer: { type: 'hm', hours, minutes } });
    push(0, a.hours * 60 + a.minutes, 'no-convert');
    push(a.hours, a.minutes + 10, 'offset');
    push(a.hours, a.minutes - 10, 'offset');
    push(a.hours + 1, a.minutes, 'offset');
    push(a.hours - 1, a.minutes, 'offset');
    push(a.hours, Math.max(0, a.minutes - 20), 'offset');
  }
  return out;
}

/** 経過分（P7 の答え、P3〜P6 の delta）から解説に使う値をまとめる。 */
export function movementOf(p) {
  if (typeof p.delta === 'number' && p.start) return { start: p.start, delta: p.delta };
  if (p.start && p.end) return { start: p.start, delta: toMinutes(p.end) - toMinutes(p.start) };
  return null;
}
