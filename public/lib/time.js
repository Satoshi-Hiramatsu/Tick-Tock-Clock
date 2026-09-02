// 時刻の計算（純粋関数）
// 時刻は { h: 0〜23, m: 0〜59 } で持つ。表示のときだけ12時間制に直す。

export const MINUTES_PER_DAY = 1440;

/** JavaScript の % は負の値に負を返すため、常に 0〜m-1 に正規化する。 */
export const mod = (n, m) => ((n % m) + m) % m;

/** 0時0分からの通算分に変換する。 */
export function toMinutes({ h, m }) {
  return h * 60 + m;
}

/** 通算分から時刻に戻す。範囲外は1日の周期で正規化する。 */
export function fromMinutes(total) {
  const t = mod(Math.round(total), MINUTES_PER_DAY);
  return { h: Math.floor(t / 60), m: t % 60 };
}

/**
 * 時刻に分を足す（負なら引く）。
 * @returns {{ time: {h, m}, dayShift: number }} dayShift は日をまたいだ回数
 */
export function addMinutes(time, delta) {
  const raw = toMinutes(time) + delta;
  return { time: fromMinutes(raw), dayShift: Math.floor(raw / MINUTES_PER_DAY) };
}

/** from から to までの経過分（0〜1439）。to が先なら翌日扱い。 */
export function diffMinutes(from, to) {
  return mod(toMinutes(to) - toMinutes(from), MINUTES_PER_DAY);
}

/** 分を「何時間何分」に分ける。符号は無視する。例: 80 → {hours: 1, minutes: 20} */
export function splitByHour(minutes) {
  const n = Math.abs(minutes);
  return { hours: Math.floor(n / 60), minutes: n % 60 };
}

/**
 * ちょうどの時刻（〜時00分）で区切る（教科書式「くぎって考える」）。
 * 例: 3:10 に +80 → [{from:3:10, to:4:00, len:50}, {from:4:00, to:4:30, len:30}]
 */
export function splitAtHour(time, delta) {
  const segments = [];
  if (delta === 0) return segments;
  const sign = Math.sign(delta);
  let remaining = Math.abs(delta);
  let current = time;
  while (remaining > 0) {
    const toBoundary = current.m === 0 ? 60 : sign > 0 ? 60 - current.m : current.m;
    const len = Math.min(toBoundary, remaining);
    const next = addMinutes(current, sign * len).time;
    segments.push({ from: current, to: next, len });
    current = next;
    remaining -= len;
  }
  return segments;
}

/**
 * 分針が12を通過する（時の数字が変わる）経過分を列挙する。
 * 進む場合は「12に到達した瞬間」（3:10 → 経過50で 4:00）。
 * 戻る場合は「12を離れた瞬間」（4:00 → 経過0で 3:59）。
 * この非対称は意図的。対称に直さないこと。
 */
export function crossings(time, delta) {
  const out = [];
  if (delta > 0) {
    for (let e = 60 - time.m; e <= delta; e += 60) out.push(e);
  } else if (delta < 0) {
    const n = -delta;
    for (let e = time.m; e < n; e += 60) out.push(e);
  }
  return out;
}

/**
 * 表示用の文字列。
 * ampm: 午前・午後を付ける（教科書に合わせ 正午は「午後0時」）。
 * use24h: 「15:10」形式。
 * pad: 分を2桁にする（デジタル時計用）。
 */
export function formatTime(time, { ampm = false, use24h = false, pad = false } = {}) {
  if (use24h) {
    return `${String(time.h).padStart(2, '0')}:${String(time.m).padStart(2, '0')}`;
  }
  const mm = pad ? String(time.m).padStart(2, '0') : String(time.m);
  const { hour, prefix } = hour12(time, ampm);
  return `${prefix}${hour}時${mm}分`;
}

/** 12時間制の時と接頭辞。ampm なしは文字盤どおり 1〜12、ありは 0〜11。 */
export function hour12(time, ampm = false) {
  if (ampm) {
    return { hour: time.h % 12, prefix: time.h < 12 ? '午前' : '午後' };
  }
  return { hour: time.h % 12 || 12, prefix: '' };
}
