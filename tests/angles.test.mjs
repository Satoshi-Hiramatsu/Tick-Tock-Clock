import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  minuteAngle,
  hourAngle,
  point,
  annularPath,
  sectorPath,
  lapSegments,
  RINGS,
  R,
} from '../public/lib/angles.js';

test('針の角度', () => {
  assert.equal(minuteAngle(15), 90);
  assert.equal(hourAngle(3, 30), 105);
  assert.equal(hourAngle(12, 0), 0);
  assert.equal(hourAngle(15, 0), 90);
});

test('point: 12時・3時・6時', () => {
  const p12 = point(0, 78);
  assert.ok(Math.abs(p12.x - 100) < 1e-9 && Math.abs(p12.y - 22) < 1e-9);
  const p3 = point(90, 78);
  assert.ok(Math.abs(p3.x - 178) < 1e-9 && Math.abs(p3.y - 100) < 1e-9);
  const p6 = point(180, 78);
  assert.ok(Math.abs(p6.x - 100) < 1e-9 && Math.abs(p6.y - 178) < 1e-9);
});

test('annularPath / sectorPath は NaN を含まない', () => {
  const f = annularPath(60, 300, 44, 56);
  const b = annularPath(0, -240, 44, 56);
  const s = sectorPath(90, 105, 30);
  assert.doesNotMatch(f + b + s, /NaN/);
  assert.match(f, /A 56 56 0 1 1 /);
  assert.match(b, /A 56 56 0 1 0 /);
});

test('lapSegments: 進む', () => {
  assert.deepEqual(lapSegments(10, 80), [
    { lap: 0, from: 10, len: 60 },
    { lap: 1, from: 10, len: 20 },
  ]);
});

test('lapSegments: 戻る（from は正規化される）', () => {
  assert.deepEqual(lapSegments(10, -80), [
    { lap: 0, from: 10, len: -60 },
    { lap: 1, from: 10, len: -20 },
  ]);
});

test('lapSegments: 3周', () => {
  const segs = lapSegments(0, 180);
  assert.equal(segs.length, 3);
  assert.ok(segs.every((s) => s.len === 60));
});

test('半径が重ならない', () => {
  // 年輪は外から内へ、隙間を持って並ぶ
  for (let i = 1; i < RINGS.length; i += 1) {
    assert.ok(RINGS[i].ro < RINGS[i - 1].ri);
  }
  // 帯は時の数字より内側、時針の弧は数字と目盛りの間
  assert.ok(RINGS[0].ro < R.hourNumbers - 6);
  assert.ok(R.hourArcInner > R.hourNumbers + 6);
  assert.ok(R.hourArcOuter < R.tickFiveInner);
});
