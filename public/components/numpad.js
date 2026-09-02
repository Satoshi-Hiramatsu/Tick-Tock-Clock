// タップ式のテンキー入力。時刻（時・分）、分数、時間と分 の3種類。

const FIELDS = {
  time: [
    { key: 'h', label: '時', max: 12, digits: 2 },
    { key: 'm', label: '分', max: 59, digits: 2 },
  ],
  minutes: [{ key: 'value', label: '分', max: 999, digits: 3 }],
  hm: [
    { key: 'hours', label: '時間', max: 23, digits: 2 },
    { key: 'minutes', label: '分', max: 59, digits: 2 },
  ],
};

/**
 * @param {HTMLElement} container
 * @param {{ kind: 'time'|'minutes'|'hm', ampm?: boolean }} p
 */
export function createNumpad(container, { kind, ampm = false }) {
  const fields = FIELDS[kind];
  const values = Object.fromEntries(fields.map((f) => [f.key, '']));
  let active = fields[0].key;
  let period = null; // 'am' | 'pm'

  container.innerHTML = `
    <div class="numpad">
      ${ampm ? `<div class="numpad__ampm"><button type="button" class="btn btn--toggle" data-period="am">午前</button><button type="button" class="btn btn--toggle" data-period="pm">午後</button></div>` : ''}
      <div class="numpad__fields">
        ${fields
          .map(
            (f) => `<button type="button" class="numpad__field" data-field="${f.key}"><span class="numpad__value">&nbsp;</span><span class="numpad__unit">${f.label}</span></button>`,
          )
          .join('')}
      </div>
      <div class="numpad__keys">
        ${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `<button type="button" class="btn numpad__key" data-key="${n}">${n}</button>`).join('')}
        <button type="button" class="btn numpad__key numpad__key--wide" data-key="0">0</button>
        <button type="button" class="btn numpad__key numpad__key--del" data-key="del" aria-label="けす">⌫</button>
      </div>
    </div>`;

  const fieldEls = Object.fromEntries(fields.map((f) => [f.key, container.querySelector(`[data-field="${f.key}"]`)]));

  function render() {
    for (const f of fields) {
      const el = fieldEls[f.key];
      el.querySelector('.numpad__value').innerHTML = values[f.key] === '' ? '&nbsp;' : values[f.key];
      el.classList.toggle('is-active', active === f.key);
    }
    for (const b of container.querySelectorAll('[data-period]')) b.classList.toggle('is-on', b.dataset.period === period);
  }

  function advanceIfFull() {
    const f = fields.find((x) => x.key === active);
    if (values[active].length >= f.digits) {
      const i = fields.indexOf(f);
      if (i < fields.length - 1) active = fields[i + 1].key;
    }
  }

  container.addEventListener('click', (e) => {
    const field = e.target.closest('[data-field]');
    if (field) {
      active = field.dataset.field;
      render();
      return;
    }
    const per = e.target.closest('[data-period]');
    if (per) {
      period = per.dataset.period;
      render();
      return;
    }
    const key = e.target.closest('[data-key]');
    if (!key) return;
    const f = fields.find((x) => x.key === active);
    if (key.dataset.key === 'del') {
      if (values[active] === '') {
        const i = fields.indexOf(f);
        if (i > 0) active = fields[i - 1].key;
      } else {
        values[active] = values[active].slice(0, -1);
      }
    } else {
      const digit = key.dataset.key;
      const next = values[active] + digit;
      if (Number(next) <= f.max && next.length <= f.digits) {
        values[active] = next;
        advanceIfFull();
      } else {
        // 「7」の次に「0」など、その欄に入らない数は次の欄へ送る（7時05分を 7・0・5 で入力できる）。
        const nextField = fields[fields.indexOf(f) + 1];
        if (values[active] !== '' && nextField && values[nextField.key] === '' && Number(digit) <= nextField.max) {
          active = nextField.key;
          values[active] = digit;
          advanceIfFull();
        }
      }
    }
    render();
  });

  render();

  return {
    /** 入力が揃っていれば答えオブジェクト、足りなければ null */
    getAnswer() {
      if (fields.some((f) => values[f.key] === '')) return null;
      if (ampm && !period) return null;
      if (kind === 'time') {
        let h = Number(values.h) % 12;
        if (ampm && period === 'pm') h += 12;
        return { type: 'time', time: { h, m: Number(values.m) }, ampm: ampm || undefined };
      }
      if (kind === 'minutes') return { type: 'minutes', value: Number(values.value) };
      return { type: 'hm', hours: Number(values.hours), minutes: Number(values.minutes) };
    },
  };
}
