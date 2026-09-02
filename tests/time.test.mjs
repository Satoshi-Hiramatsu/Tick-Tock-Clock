import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMinutes,
  diffMinutes,
  splitAtHour,
  splitByHour,
  crossings,
  formatTime,
  mod,
} from '../public/lib/time.js';

test('mod は負の値を正規化する', () => {
  assert.equal(mod(-50, 60), 10);
  assert.equal(mod(70, 60), 10);
  assert.equal(mod(0, 60), 0);
});

test('addMinutes: 繰り上がり', () => {
  assert.deepEqual(addMinutes({ h: 3, m: 10 }, 80).time, { h: 4, m: 30 });
  assert.deepEqual(addMinutes({ h: 11, m: 50 }, 20).time, { h: 12, m: 10 });
});

test('addMinutes: 繰り下がり', () => {
  assert.deepEqual(addMinutes({ h: 12, m: 0 }, -1).time, { h: 11, m: 59 });
  assert.deepEqual(addMinutes({ h: 4, m: 0 }, -40).time, { h: 3, m: 20 });
});

test('addMinutes: 日をまたぐ', () => {
  assert.deepEqual(addMinutes({ h: 23, m: 30 }, 60), { time: { h: 0, m: 30 }, dayShift: 1 });
  assert.deepEqual(addMinutes({ h: 0, m: 0 }, -1), { time: { h: 23, m: 59 }, dayShift: -1 });
});

test('diffMinutes', () => {
  assert.equal(diffMinutes({ h: 8, m: 40 }, { h: 9, m: 20 }), 40);
  assert.equal(diffMinutes({ h: 23, m: 50 }, { h: 0, m: 10 }), 20);
});

test('splitAtHour: ちょうどの時刻で区切る', () => {
  const segs = splitAtHour({ h: 3, m: 10 }, 80);
  assert.deepEqual(segs.map((s) => s.len), [50, 30]);
  assert.deepEqual(segs[0].to, { h: 4, m: 0 });
  assert.deepEqual(segs[1].to, { h: 4, m: 30 });
});

test('splitAtHour: 区切り不要', () => {
  assert.deepEqual(splitAtHour({ h: 3, m: 0 }, 30).map((s) => s.len), [30]);
  assert.deepEqual(splitAtHour({ h: 4, m: 0 }, -40).map((s) => s.len), [40]);
});

test('splitAtHour: 戻る方向で区切る', () => {
  const segs = splitAtHour({ h: 3, m: 20 }, -40);
  assert.deepEqual(segs.map((s) => s.len), [20, 20]);
  assert.deepEqual(segs[1].to, { h: 2, m: 40 });
});

test('splitByHour', () => {
  assert.deepEqual(splitByHour(80), { hours: 1, minutes: 20 });
  assert.deepEqual(splitByHour(60), { hours: 1, minutes: 0 });
  assert.deepEqual(splitByHour(-70), { hours: 1, minutes: 10 });
});

test('crossings: 進む', () => {
  assert.deepEqual(crossings({ h: 3, m: 10 }, 80), [50]);
  assert.deepEqual(crossings({ h: 3, m: 0 }, 120), [60, 120]);
  assert.deepEqual(crossings({ h: 3, m: 10 }, 40), []);
});

test('crossings: 戻る（非対称を固定）', () => {
  assert.deepEqual(crossings({ h: 4, m: 0 }, -40), [0]);
  assert.deepEqual(crossings({ h: 3, m: 10 }, -10), []);
  assert.deepEqual(crossings({ h: 3, m: 10 }, -70), [10]);
});

test('formatTime', () => {
  assert.equal(formatTime({ h: 15, m: 10 }), '3時10分');
  assert.equal(formatTime({ h: 15, m: 10 }, { ampm: true }), '午後3時10分');
  assert.equal(formatTime({ h: 12, m: 5 }, { ampm: true, pad: true }), '午後0時05分');
  assert.equal(formatTime({ h: 0, m: 5 }), '12時5分');
  assert.equal(formatTime({ h: 15, m: 10 }, { use24h: true }), '15:10');
});
