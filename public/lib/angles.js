// 角度と SVG パス（純粋関数）
// viewBox 0 0 200 200、中心 (100,100)。12時方向を 0°、時計回りを正とする。

import { mod } from './time.js';

export const CENTER = 100;

/** 半径の割り当て。計画書 9.3 章。 */
export const R = {
  face: 94,
  minuteNumbers: 87,
  tickOuter: 84,
  tickInner: 79,
  tickFiveInner: 76,
  hourArcOuter: 74.5,
  hourArcInner: 72,
  hourNumbers: 64,
  minuteHand: 78,
  hourHand: 52,
  secondHand: 84,
  cap: 4,
};

/** 移動の帯（年輪）。1周ごとに内側へ。 */
export const RINGS = [
  { ri: 44, ro: 56 },
  { ri: 30, ro: 42 },
  { ri: 16, ro: 28 },
];

export const minuteAngle = (m) => m * 6;
export const hourAngle = (h, m) => (h % 12) * 30 + m * 0.5;
export const secondAngle = (s) => s * 6;

const rad = (deg) => (deg * Math.PI) / 180;
const fix = (n) => Number(n.toFixed(3));

/** 角度 theta（度）と半径 r から座標を得る。 */
export function point(theta, r) {
  return {
    x: CENTER + r * Math.sin(rad(theta)),
    y: CENTER - r * Math.cos(rad(theta)),
  };
}

/**
 * ドーナツ状の帯（アニュラスセクター）のパス。
 * |t2 - t1| が 360 以上のときは使えない。呼び出し側で <circle> に切り替える。
 */
export function annularPath(t1, t2, ri, ro) {
  const largeArc = Math.abs(t2 - t1) > 180 ? 1 : 0;
  const sweep = t2 > t1 ? 1 : 0;
  const a = point(t1, ro);
  const b = point(t2, ro);
  const c = point(t2, ri);
  const d = point(t1, ri);
  return [
    `M ${fix(a.x)} ${fix(a.y)}`,
    `A ${ro} ${ro} 0 ${largeArc} ${sweep} ${fix(b.x)} ${fix(b.y)}`,
    `L ${fix(c.x)} ${fix(c.y)}`,
    `A ${ri} ${ri} 0 ${largeArc} ${1 - sweep} ${fix(d.x)} ${fix(d.y)}`,
    'Z',
  ].join(' ');
}

/** 中心からの扇形のパス。 */
export function sectorPath(t1, t2, r) {
  const largeArc = Math.abs(t2 - t1) > 180 ? 1 : 0;
  const sweep = t2 > t1 ? 1 : 0;
  const a = point(t1, r);
  const b = point(t2, r);
  return `M ${CENTER} ${CENTER} L ${fix(a.x)} ${fix(a.y)} A ${r} ${r} 0 ${largeArc} ${sweep} ${fix(b.x)} ${fix(b.y)} Z`;
}

/**
 * 移動量を周回ごとに分割する。
 * 例: (10, 80)  → [{lap:0, from:10, len:60}, {lap:1, from:10, len:20}]
 *     (10, -80) → [{lap:0, from:10, len:-60}, {lap:1, from:10, len:-20}]
 * from は常に 0〜59 に正規化する。
 */
export function lapSegments(startMinute, delta) {
  const sign = Math.sign(delta);
  const total = Math.abs(delta);
  const out = [];
  let done = 0;
  let lap = 0;
  while (done < total) {
    const len = Math.min(60, total - done);
    out.push({ lap, from: mod(startMinute + sign * done, 60), len: sign * len });
    done += len;
    lap += 1;
  }
  return out;
}
