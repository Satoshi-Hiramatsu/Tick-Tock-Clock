import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSet, PRESETS, PATTERN_IDS, validate, optionsFor, answersEqual } from '../public/lib/problems/index.js';
import { minuteReading, plain, timeLabel } from '../public/lib/text.js';

test('同じシードから同じ問題列が出る', () => {
  const a = generateSet({ patterns: [], difficulty: 3, count: 10, seed: 1234 });
  const b = generateSet({ patterns: [], difficulty: 3, count: 10, seed: 1234 });
  assert.deepEqual(a, b);
  assert.equal(a.length, 10);
});

test('★1〜★4 で各100問生成し、すべて検証を通る', () => {
  for (const d of [1, 2, 3, 4]) {
    const o = optionsFor(d);
    const set = generateSet({ patterns: [], difficulty: d, count: 100, seed: 42 + d });
    assert.ok(set.length >= 95, `★${d}: ${set.length} 問しか作れなかった`);
    for (const p of set) {
      assert.ok(validate(p, o), `★${d} ${p.id} が検証に落ちた: ${JSON.stringify(p)}`);
      assert.ok(PRESETS[d].patterns.includes(p.pattern), `★${d} に含まれないパターン ${p.pattern}`);
      assert.ok(p.text.length > 0);
      assert.ok(!/</.test(p.text), 'plain に HTML が残っている');
    }
  }
});

test('不正なパターン ID はプリセットに戻り、無限ループしない', () => {
  const set = generateSet({ patterns: ['foo'], difficulty: 2, count: 10, seed: 1 });
  assert.equal(set.length, 10);
  assert.ok(set.every((p) => PRESETS[2].patterns.includes(p.pattern)));
  assert.deepEqual(generateSet({ patterns: ['P1'], difficulty: 2, count: 0, seed: 1 }), []);
});

test('各パターンを単独で生成できる', () => {
  for (const id of PATTERN_IDS) {
    const set = generateSet({ patterns: [id], difficulty: 4, count: 20, seed: 7 });
    assert.ok(set.length >= 15, `${id}: ${set.length}`);
    assert.ok(set.every((p) => p.pattern === id));
  }
});

test('P3 は繰り上がりなし、P4 は繰り上がりあり', () => {
  const p3 = generateSet({ patterns: ['P3'], difficulty: 2, count: 50, seed: 3 });
  assert.ok(p3.every((p) => p.start.m + p.delta < 60));
  const p4 = generateSet({ patterns: ['P4'], difficulty: 2, count: 50, seed: 4 });
  assert.ok(p4.every((p) => p.start.m + p.delta >= 60));
});

test('P5 は負の移動量、P6 は60の倍数', () => {
  const p5 = generateSet({ patterns: ['P5'], difficulty: 3, count: 30, seed: 5 });
  assert.ok(p5.every((p) => p.delta < 0));
  const p6 = generateSet({ patterns: ['P6'], difficulty: 3, count: 30, seed: 6 });
  assert.ok(p6.every((p) => p.delta % 60 === 0 && p.delta !== 0));
});

test('P8 は午前・午後をまたぐ', () => {
  const p8 = generateSet({ patterns: ['P8'], difficulty: 3, count: 30, seed: 8 });
  assert.ok(p8.every((p) => (p.start.h < 12) !== (p.end.h < 12)));
  assert.ok(p8.every((p) => p.answer.ampm === true));
});

test('4択：重複なし、正解が1つ、位置が偏らない', () => {
  const set = generateSet({ patterns: [], difficulty: 4, count: 200, seed: 99 });
  const positions = [0, 0, 0, 0];
  for (const p of set) {
    assert.equal(p.choices.length, 4, `${p.id} の選択肢が4つでない`);
    const labels = p.choices.map((c) => c.label);
    assert.equal(new Set(labels).size, 4, `${p.id} の選択肢が重複: ${labels}`);
    const correctIdx = p.choices.findIndex((c) => c.tag === null);
    assert.ok(correctIdx >= 0);
    assert.ok(answersEqual(p.choices[correctIdx].answer, p.answer));
    assert.equal(p.choices.filter((c) => answersEqual(c.answer, p.answer)).length, 1, `${p.id} に正解が複数`);
    positions[correctIdx] += 1;
  }
  assert.ok(positions.every((n) => n > 20), `正解の位置が偏っている: ${positions}`);
});

test('answersEqual: 午前午後なしは12時間で比較', () => {
  assert.ok(answersEqual({ type: 'time', time: { h: 15, m: 10 } }, { type: 'time', time: { h: 3, m: 10 } }));
  assert.ok(!answersEqual({ type: 'time', time: { h: 15, m: 10 }, ampm: true }, { type: 'time', time: { h: 3, m: 10 } }));
  assert.ok(answersEqual({ type: 'draw', time: { h: 3, m: 10 } }, { type: 'time', time: { h: 3, m: 10 } }));
});

test('文言のふりがな', () => {
  assert.equal(minuteReading(10), 'ぷん');
  assert.equal(minuteReading(15), 'ふん');
  assert.equal(minuteReading(2), 'ふん');
  assert.equal(minuteReading(8), 'ぷん');
  assert.equal(plain('<ruby>時<rt>じ</rt></ruby>10<ruby>分<rt>ぷん</rt></ruby>'), '時10分');
  assert.equal(timeLabel({ h: 15, m: 0 }), '3時');
  assert.equal(timeLabel({ h: 12, m: 30 }, { ampm: true }), '午後0時30分');
});
