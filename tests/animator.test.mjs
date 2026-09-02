import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnimator } from '../public/lib/animator.js';
import { crossings } from '../public/lib/time.js';

function run(opts) {
  const events = [];
  const frames = [];
  let done = 0;
  const a = createAnimator({
    speed: 'instant',
    onFrame: (e) => frames.push(e),
    onEvent: (ev) => events.push(ev),
    onDone: () => (done += 1),
    ...opts,
  });
  a.play();
  return { a, events, frames, done };
}

test('いっき: 最後まで進んで onDone が1回', () => {
  const { frames, done } = run({ total: 80, direction: 1, crossingsAt: crossings({ h: 3, m: 10 }, 80) });
  assert.deepEqual(frames, [80]);
  assert.equal(done, 1);
});

test('進む: 12到達の瞬間（>=）に carry が発火する', () => {
  const { events } = run({ total: 50, direction: 1, crossingsAt: crossings({ h: 3, m: 10 }, 50) });
  assert.deepEqual(
    events.filter((e) => e.type === 'carry').map((e) => e.at),
    [50],
  );
});

test('戻る: 12を離れた瞬間（>）に carry が発火する', () => {
  // 3:10 から 10 分戻ると 3:00。12 にはまだ触れていないので発火しない
  const stay = run({ total: 10, direction: -1, crossingsAt: crossings({ h: 3, m: 10 }, -10) });
  assert.equal(stay.events.filter((e) => e.type === 'carry').length, 0);

  // 3:10 から 30 分戻ると 2:40。経過 10 を超えた時点で発火する
  const cross = run({ total: 30, direction: -1, crossingsAt: crossings({ h: 3, m: 10 }, -30) });
  assert.deepEqual(
    cross.events.filter((e) => e.type === 'carry').map((e) => e.at),
    [10],
  );
});

test('戻る: 開始が 0 分なら経過 0 の閾値が動き出しで発火する', () => {
  const { events } = run({ total: 5, direction: -1, crossingsAt: crossings({ h: 4, m: 0 }, -5) });
  assert.deepEqual(events.filter((e) => e.type === 'carry').map((e) => e.at), [0]);
});

test('lap と tick の節目', () => {
  const { events } = run({ total: 80, direction: 1, tickEvery: 10 });
  assert.deepEqual(events.filter((e) => e.type === 'lap').map((e) => e.lap), [1]);
  assert.deepEqual(
    events.filter((e) => e.type === 'tick').map((e) => e.at),
    [10, 20, 30, 40, 50, 60, 70, 80],
  );
});

test('seek は節目を発火させずに位置だけ動かす', () => {
  const events = [];
  const frames = [];
  const a = createAnimator({ total: 80, direction: 1, onFrame: (e) => frames.push(e), onEvent: (ev) => events.push(ev) });
  a.seek(0.5);
  assert.deepEqual(frames, [40]);
  assert.equal(events.length, 0);
  assert.equal(a.playing, false);
});
