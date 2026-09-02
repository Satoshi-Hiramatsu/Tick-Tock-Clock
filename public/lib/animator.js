// 経過分のアニメーション。
// 毎フレーム onFrame(elapsed) を呼び、描画側はこの1値からすべてを導出する。
// 節目（12通過 carry / 1周 lap / 5分 tick）は onEvent で通知する。

const RATES = { slow: 10, normal: 30, instant: Infinity }; // 分/秒
const STEP_MINUTES = 10; // 動きをへらす設定のコマ送り幅
const STEP_INTERVAL = 450; // ms

const MAX_FRAME_DT = 0.1; // 秒。タブ切り替えなどで空いた時間を一気に進めない

/**
 * @param {object} p
 * @param {number} p.total 移動量の絶対値（分）
 * @param {1 | -1} [p.direction] 進む=1、戻る=-1
 * @param {'slow'|'normal'|'instant'} [p.speed]
 * @param {boolean} [p.reduceMotion]
 * @param {number} [p.tickEvery] カウンターを強調する間隔（分）
 * @param {number[]} [p.crossingsAt] 12を通過する経過分（time.js の crossings）
 * @param {(elapsed: number) => void} p.onFrame
 * @param {(event: {type: string, at: number, lap?: number}) => void} [p.onEvent]
 * @param {() => void} [p.onDone]
 */
export function createAnimator({
  total,
  direction = 1,
  speed = 'normal',
  reduceMotion = false,
  tickEvery = 5,
  crossingsAt = [],
  onFrame,
  onEvent,
  onDone,
}) {
  // 進む場合は「12に到達した瞬間」（>=）、戻る場合は「12を離れた瞬間」（>）に時が変わる。
  // デジタル時計の丸め（進む=切り捨て、戻る=切り上げ）と同じ瞬間に発火させる。
  const thresholds = [];
  for (const at of crossingsAt) thresholds.push({ type: 'carry', at, strict: direction < 0 });
  for (let at = 60; at <= total; at += 60) thresholds.push({ type: 'lap', at, lap: at / 60 });
  for (let at = tickEvery; at <= total; at += tickEvery) thresholds.push({ type: 'tick', at });
  thresholds.sort((a, b) => a.at - b.at);

  let elapsed = 0;
  let playing = false;
  let rate = RATES[speed] ?? RATES.normal;
  let rafId = 0;
  let timerId = 0;
  let lastTs = 0;
  let fired = new Set();

  const isPassed = (th, value) => (th.strict ? value > th.at : value >= th.at);

  function emitEvents() {
    for (const th of thresholds) {
      if (fired.has(th) || !isPassed(th, elapsed)) continue;
      fired.add(th);
      onEvent?.(th);
    }
  }

  function stop() {
    playing = false;
    globalThis.cancelAnimationFrame?.(rafId);
    clearTimeout(timerId);
  }

  function setElapsed(next) {
    elapsed = Math.min(total, Math.max(0, next));
    onFrame?.(elapsed);
    emitEvents();
    if (elapsed >= total) {
      stop();
      onDone?.();
    }
  }

  function frame(ts) {
    if (!playing) return;
    const dt = lastTs ? Math.min(MAX_FRAME_DT, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    setElapsed(elapsed + dt * rate);
    if (playing) rafId = requestAnimationFrame(frame);
  }

  function step() {
    if (!playing) return;
    setElapsed(Math.floor(elapsed / STEP_MINUTES) * STEP_MINUTES + STEP_MINUTES);
    if (playing) timerId = setTimeout(step, STEP_INTERVAL);
  }

  function play() {
    if (playing) return;
    if (elapsed >= total) {
      elapsed = 0;
      fired = new Set();
    }
    playing = true;
    lastTs = 0;
    if (rate === Infinity) {
      setElapsed(total);
    } else if (reduceMotion) {
      timerId = setTimeout(step, STEP_INTERVAL);
    } else {
      rafId = requestAnimationFrame(frame);
    }
  }

  function pause() {
    stop();
  }

  /** 0〜1 の位置へ移動する。節目のイベントは発火させない。 */
  function seek(ratio) {
    stop();
    elapsed = Math.min(total, Math.max(0, ratio * total));
    fired = new Set(thresholds.filter((th) => isPassed(th, elapsed)));
    onFrame?.(elapsed);
  }

  function setSpeed(name) {
    rate = RATES[name] ?? rate;
    if (playing && rate === Infinity) setElapsed(total);
  }

  return {
    play,
    pause,
    seek,
    setSpeed,
    get elapsed() {
      return elapsed;
    },
    get playing() {
      return playing;
    },
    get total() {
      return total;
    },
  };
}
