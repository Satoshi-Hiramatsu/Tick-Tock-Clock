// アナログ時計の SVG 描画。
// 文字盤・針・移動の帯（年輪）・時針の弧・10分ごとの目印・12の光を担当する。
// 針の回転は CSS ではなく transform 属性で行う（Safari の原点差異を避ける）。

import {
  R,
  RINGS,
  CENTER,
  minuteAngle,
  hourAngle,
  secondAngle,
  point,
  annularPath,
  lapSegments,
} from './angles.js';

const NS = 'http://www.w3.org/2000/svg';
const fix = (n) => Number(n.toFixed(3));

function el(name, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (parent) parent.appendChild(node);
  return node;
}

function text(content, attrs, parent) {
  const node = el('text', { 'text-anchor': 'middle', dy: '0.35em', ...attrs }, parent);
  node.textContent = content;
  return node;
}

function rotate(node, deg) {
  node.setAttribute('transform', `rotate(${fix(deg)} ${CENTER} ${CENTER})`);
}

/**
 * @param {HTMLElement} container
 * @param {{ minuteNumbers?: boolean, seconds?: boolean, markers?: boolean, print?: boolean }} options
 */
export function createClock(container, options = {}) {
  const opts = { minuteNumbers: true, seconds: false, markers: true, print: false, ...options };

  const svg = el('svg', {
    viewBox: '0 0 200 200',
    class: `clock${opts.print ? ' clock--print' : ''}`,
    role: 'img',
    'aria-label': 'とけい',
  });

  el('circle', { cx: CENTER, cy: CENTER, r: R.face, class: 'clock__face' }, svg);

  // 描画順：帯 → 時針の弧 → 目盛り → 数字 → 針 → 中心 → 目印
  // （目印の 10・20・30… は針に隠れないよう最後に描く）
  const gBands = el('g', { class: 'clock__bands' }, svg);
  const gHourArc = el('g', { class: 'clock__hour-arc' }, svg);
  const gTicks = el('g', { class: 'clock__ticks' }, svg);
  const gNumbers = el('g', { class: 'clock__numbers' }, svg);

  for (let i = 0; i < 60; i += 1) {
    const five = i % 5 === 0;
    const inner = point(i * 6, five ? R.tickFiveInner : R.tickInner);
    const outer = point(i * 6, R.tickOuter);
    el(
      'line',
      {
        x1: fix(inner.x),
        y1: fix(inner.y),
        x2: fix(outer.x),
        y2: fix(outer.y),
        class: five ? 'clock__tick clock__tick--five' : 'clock__tick',
      },
      gTicks,
    );
  }

  const twelve = point(0, R.hourNumbers);
  const glow = el('circle', { cx: fix(twelve.x), cy: fix(twelve.y), r: 11, class: 'clock__glow' }, gNumbers);

  for (let n = 1; n <= 12; n += 1) {
    const p = point(n * 30, R.hourNumbers);
    text(String(n), { x: fix(p.x), y: fix(p.y), class: 'clock__num-hour' }, gNumbers);
  }

  const gMinuteNumbers = el('g', { class: 'clock__num-minutes' }, gNumbers);
  for (let n = 0; n < 60; n += 5) {
    const p = point(n * 6, R.minuteNumbers);
    text(String(n), { x: fix(p.x), y: fix(p.y) }, gMinuteNumbers);
  }

  const lapLabel = text('', { x: CENTER, y: CENTER + 13, class: 'clock__lap-label' }, svg);

  // うすい針（P7 の終わりの時刻など、もう1つの時刻を示す）
  const gGhost = el('g', { class: 'clock__ghost', visibility: 'hidden' }, svg);
  const ghostHour = el(
    'line',
    { x1: CENTER, y1: CENTER + 10, x2: CENTER, y2: CENTER - R.hourHand, class: 'clock__hand clock__hand--hour clock__hand--ghost' },
    gGhost,
  );
  const ghostMinute = el(
    'line',
    { x1: CENTER, y1: CENTER + 12, x2: CENTER, y2: CENTER - R.minuteHand, class: 'clock__hand clock__hand--minute clock__hand--ghost' },
    gGhost,
  );

  const gHands = el('g', { class: 'clock__hands' }, svg);
  const hourHand = el(
    'line',
    { x1: CENTER, y1: CENTER + 10, x2: CENTER, y2: CENTER - R.hourHand, class: 'clock__hand clock__hand--hour' },
    gHands,
  );
  const minuteHand = el(
    'line',
    { x1: CENTER, y1: CENTER + 12, x2: CENTER, y2: CENTER - R.minuteHand, class: 'clock__hand clock__hand--minute' },
    gHands,
  );
  const secondHand = el(
    'line',
    { x1: CENTER, y1: CENTER + 16, x2: CENTER, y2: CENTER - R.secondHand, class: 'clock__hand clock__hand--second' },
    gHands,
  );
  el('circle', { cx: CENTER, cy: CENTER, r: R.cap, class: 'clock__cap' }, svg);
  const gMarkers = el('g', { class: 'clock__markers' }, svg);

  container.replaceChildren(svg);

  let glowTimer = 0;

  function applyOptions() {
    gMinuteNumbers.setAttribute('visibility', opts.minuteNumbers ? 'visible' : 'hidden');
    secondHand.setAttribute('visibility', opts.seconds ? 'visible' : 'hidden');
    gMarkers.setAttribute('visibility', opts.markers ? 'visible' : 'hidden');
  }
  applyOptions();

  /** 針を合わせる。m は小数でもよい（アニメーション中の補間用）。 */
  function setTime({ h, m }, seconds = 0) {
    rotate(hourHand, hourAngle(h, m));
    rotate(minuteHand, minuteAngle(m));
    rotate(secondHand, secondAngle(seconds));
  }

  // 移動の描画は毎フレーム呼ばれるため、ノードは使い回して属性だけを更新する。
  let bandNodes = [];
  let arcNode = null;
  let markerCount = 0;
  let markerKey = '';

  function addMarker(start, direction, k) {
    const ring = RINGS[Math.min(Math.floor((k - 1) / 60), RINGS.length - 1)];
    const p = point((start.m + direction * k) * 6, (ring.ri + ring.ro) / 2);
    const g = el('g', { class: 'clock__marker' }, gMarkers);
    el('circle', { cx: fix(p.x), cy: fix(p.y), r: 4.6 }, g);
    text(String(k), { x: fix(p.x), y: fix(p.y) }, g);
  }

  /**
   * 移動の帯・時針の弧・目印を、開始時刻と経過分から更新する。
   * @param {{ start: {h, m}, elapsed: number, direction: 1 | -1 }} movement
   */
  function setMovement({ start, elapsed, direction }) {
    svg.classList.toggle('is-forward', direction > 0);
    svg.classList.toggle('is-backward', direction < 0);
    if (elapsed <= 0) {
      clearMovementNodes();
      return;
    }

    const segs = lapSegments(start.m, direction * elapsed);
    segs.forEach((seg, i) => {
      const ring = RINGS[Math.min(seg.lap, RINGS.length - 1)];
      const full = Math.abs(seg.len) >= 60;
      const tag = full ? 'circle' : 'path';
      let node = bandNodes[i];
      if (!node || node.tagName !== tag) {
        node?.remove();
        node = el(tag, {}, gBands);
        bandNodes[i] = node;
      }
      if (full) {
        node.setAttribute('class', 'clock__band clock__band--full');
        node.setAttribute('cx', CENTER);
        node.setAttribute('cy', CENTER);
        node.setAttribute('r', (ring.ri + ring.ro) / 2);
        node.setAttribute('stroke-width', ring.ro - ring.ri);
      } else {
        const t1 = seg.from * 6;
        node.setAttribute('class', 'clock__band clock__band--partial');
        node.setAttribute('d', annularPath(t1, t1 + seg.len * 6, ring.ri, ring.ro));
      }
    });
    while (bandNodes.length > segs.length) bandNodes.pop().remove();

    if (!arcNode) arcNode = el('path', { class: 'clock__hour-arc-path' }, gHourArc);
    const a1 = hourAngle(start.h, start.m);
    arcNode.setAttribute('d', annularPath(a1, a1 + direction * elapsed * 0.5, R.hourArcInner, R.hourArcOuter));

    const key = `${start.h}:${start.m}:${direction}`;
    if (key !== markerKey) {
      gMarkers.replaceChildren();
      markerCount = 0;
      markerKey = key;
    }
    const wanted = Math.floor((elapsed + 1e-9) / 10);
    while (markerCount < wanted) {
      markerCount += 1;
      addMarker(start, direction, markerCount * 10);
    }
    while (markerCount > wanted) {
      gMarkers.lastChild?.remove();
      markerCount -= 1;
    }
  }

  function clearMovementNodes() {
    gBands.replaceChildren();
    gHourArc.replaceChildren();
    gMarkers.replaceChildren();
    bandNodes = [];
    arcNode = null;
    markerCount = 0;
    markerKey = '';
  }

  function clearMovement() {
    clearMovementNodes();
    svg.classList.remove('is-forward', 'is-backward');
    lapLabel.textContent = '';
    clearTimeout(glowTimer);
    glow.classList.remove('is-on');
  }

  /** 12を通過した瞬間の光。 */
  function flashTwelve() {
    clearTimeout(glowTimer);
    glow.classList.add('is-on');
    glowTimer = setTimeout(() => glow.classList.remove('is-on'), 600);
  }

  function setLapLabel(laps) {
    lapLabel.textContent = laps > 0 ? `${laps}時間` : '';
  }

  function setOptions(partial) {
    Object.assign(opts, partial);
    applyOptions();
  }

  /** もう1つの時刻をうすい針で示す。null で消す。 */
  function setGhostTime(time) {
    if (!time) {
      gGhost.setAttribute('visibility', 'hidden');
      return;
    }
    gGhost.setAttribute('visibility', 'visible');
    rotate(ghostHour, hourAngle(time.h, time.m));
    rotate(ghostMinute, minuteAngle(time.m));
  }

  /** 針を隠す（印刷の「はりをかく」問題）。 */
  function showHands(visible) {
    gHands.setAttribute('visibility', visible ? 'visible' : 'hidden');
  }

  /**
   * 分針のドラッグ操作。時針は連動し、12をまたぐと時が進む・戻る。
   * @param {{ step?: number, time: {h, m}, onChange?: (time) => void, onEnd?: (time) => void }} p
   * @returns {{ setTime: (time) => void, dispose: () => void }}
   */
  function enableDrag({ step = 1, time, onChange, onEnd }) {
    let current = { ...time };
    let dragging = false;
    let enabled = true;

    const minuteAt = (evt) => {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const angle = (Math.atan2(p.x - CENTER, -(p.y - CENTER)) * 180) / Math.PI;
      const minute = Math.round((((angle + 360) % 360) / 6) / step) * step;
      return minute % 60;
    };

    const update = (evt) => {
      const m = minuteAt(evt);
      if (m === current.m) return;
      // 最短の回転量（−30〜+30分）で判定し、速いスワイプでも 12 の通過を取りこぼさない
      const d = ((m - current.m + 90) % 60) - 30;
      let h = current.h;
      if (current.m + d >= 60) h = (h + 1) % 24;
      else if (current.m + d < 0) h = (h + 23) % 24;
      current = { h, m };
      setTime(current);
      onChange?.(current);
    };

    const onDown = (evt) => {
      if (!enabled) return;
      dragging = true;
      svg.setPointerCapture?.(evt.pointerId);
      svg.classList.add('is-dragging');
      update(evt);
      evt.preventDefault();
    };
    const onMove = (evt) => {
      if (dragging) update(evt);
    };
    const onUp = (evt) => {
      if (!dragging) return;
      dragging = false;
      svg.classList.remove('is-dragging');
      svg.releasePointerCapture?.(evt.pointerId);
      onEnd?.(current);
    };

    svg.classList.add('clock--draggable');
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);

    return {
      setTime(t) {
        current = { ...t };
        setTime(current);
      },
      get time() {
        return { ...current };
      },
      /** false の間はドラッグを受け付けない（アニメーション中など）。 */
      setEnabled(value) {
        enabled = value;
        svg.classList.toggle('clock--draggable', value);
      },
      dispose() {
        svg.classList.remove('clock--draggable', 'is-dragging');
        svg.removeEventListener('pointerdown', onDown);
        svg.removeEventListener('pointermove', onMove);
        svg.removeEventListener('pointerup', onUp);
        svg.removeEventListener('pointercancel', onUp);
      },
    };
  }

  return {
    svg,
    setTime,
    setMovement,
    clearMovement,
    flashTwelve,
    setLapLabel,
    setOptions,
    setGhostTime,
    showHands,
    enableDrag,
  };
}
