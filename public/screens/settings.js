// S09 せってい：表示・操作の設定と、れんしゅうの きろく

import { saveSettings, listHistory, summarize, clearHistory, DEFAULT_SETTINGS } from '../lib/storage.js';
import { applySettings } from '../lib/apply-settings.js';
import { PATTERNS } from '../lib/problems/index.js';

const TAG_LABELS = {
  'no-carry': 'くりあがり・くりさがり わすれ',
  'hour-only': '分を うごかし わすれ',
  reverse: 'むきの まちがい',
  'hour-misread': 'みじかい はりの よみまちがい',
  swap: '時と 分の とりちがえ',
  'no-convert': '時間と 分の へんかん',
  offset: 'すこし ずれた',
  other: 'そのほか',
};

const radio = (name, value, label, current) =>
  `<label class="chip"><input type="radio" name="${name}" value="${value}" ${String(current) === String(value) ? 'checked' : ''}><span>${label}</span></label>`;

const check = (name, label, current) =>
  `<label class="chip"><input type="checkbox" name="${name}" ${current ? 'checked' : ''}><span>${label}</span></label>`;

function group(legend, body, note = '') {
  return `<fieldset class="setup__group"><legend>${legend}</legend><div class="setup__options">${body}</div>${note ? `<p class="setup__note">${note}</p>` : ''}</fieldset>`;
}

export function renderSettings(root, { settings }) {
  const s = settings;
  root.innerHTML = `
    <section class="settings">
      <h1 class="setup__title">せってい</h1>
      <form class="settings__form">
        ${group('ひょうじ', [check('furigana', 'ふりがなを つける', s.furigana), check('ampm', '午前・午後を つける', s.ampm), check('minuteNumbers', 'とけいに 分の すうじ（0〜55）を だす', s.minuteNumbers), check('bandMarkers', 'うごいた ところに 10分ごとの めじるしを だす', s.bandMarkers)].join(''))}
        ${group('かいせつの しかた', [radio('explainMode', 'split', 'くぎって かんがえる', s.explainMode), radio('explainMode', 'chunk', '1時間の かたまりで かんがえる', s.explainMode)].join(''))}
        ${group('れんしゅうの こたえかた', [radio('answerMode', 'choice', '4つから えらぶ', s.answerMode), radio('answerMode', 'hand', 'はりを うごかす', s.answerMode), radio('answerMode', 'input', 'かずを いれる', s.answerMode)].join(''))}
        ${group('うごき', [radio('speed', 'slow', 'ゆっくり', s.speed), radio('speed', 'normal', 'ふつう', s.speed), radio('speed', 'instant', 'いっき', s.speed)].join(''), 'はやさ は まなぶ・かいせつの がめんでも かえられます。')}
        ${group('うごきを へらす', [radio('reduceMotion', 'auto', 'きき の せってい に あわせる', s.reduceMotion === null ? 'auto' : s.reduceMotion), radio('reduceMotion', 'true', 'へらす（コマおくり）', s.reduceMotion === null ? 'auto' : s.reduceMotion), radio('reduceMotion', 'false', 'へらさない', s.reduceMotion === null ? 'auto' : s.reduceMotion)].join(''))}
        ${group('カウンターの ふしめ', [radio('tickEvery', 5, '5分ごと', s.tickEvery), radio('tickEvery', 10, '10分ごと', s.tickEvery)].join(''))}
        ${group('フォント', [radio('font', 'udp', 'BIZ UDPゴシック', s.font), radio('font', 'mplus', 'M PLUS 1p', s.font), radio('font', 'klee', 'Klee One（てがき風）', s.font)].join(''))}
        ${group('はってん（3年生 いじょう）', [check('showSeconds', 'ホームの とけいに びょうしんを だす', s.showSeconds), check('use24h', '24時間ひょうじ（15:10）に する', s.use24h)].join(''), '2年生の はんいでは つかいません。')}
        <div class="settings__actions">
          <button type="button" class="btn btn--ghost" data-action="reset-settings">せっていを もとに もどす</button>
        </div>
      </form>

      <section class="record">
        <h2 class="record__title">きろく</h2>
        <div class="record__body"></div>
        <div class="settings__actions">
          <button type="button" class="btn btn--ghost" data-action="clear-history">きろくを けす</button>
        </div>
      </section>
    </section>`;

  const section = root.querySelector('.settings');
  const form = section.querySelector('.settings__form');

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (!t.name) return;
    if (t.type === 'checkbox') s[t.name] = t.checked;
    else if (t.name === 'reduceMotion') s.reduceMotion = t.value === 'auto' ? null : t.value === 'true';
    else if (t.name === 'tickEvery') s.tickEvery = Number(t.value);
    else s[t.name] = t.value;
    saveSettings(s);
    applySettings(s);
  });

  section.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'reset-settings') {
      Object.assign(s, DEFAULT_SETTINGS);
      saveSettings(s);
      applySettings(s);
      renderSettings(root, { settings: s });
    }
    if (btn.dataset.action === 'clear-history') {
      clearHistory();
      renderRecord(section.querySelector('.record__body'));
    }
  });

  renderRecord(section.querySelector('.record__body'));
}

function renderRecord(el) {
  const history = listHistory(10);
  if (!history.length) {
    el.innerHTML = '<p class="setup__note">まだ きろくが ありません。れんしゅうを すると ここに でます。</p>';
    return;
  }
  const { byPattern, byTag } = summarize();
  const fmt = (t) => {
    const d = new Date(t);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const patternRows = Object.entries(byPattern)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .map(([id, v]) => `<tr><td>${PATTERNS[id]?.name || id}</td><td class="num">${v.correct} / ${v.total}</td><td class="num">${Math.round((v.correct / v.total) * 100)}%</td></tr>`)
    .join('');
  const tagRows = Object.entries(byTag)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, n]) => `<li>${TAG_LABELS[tag] || tag}：${n}かい</li>`)
    .join('');
  el.innerHTML = `
    <h3 class="record__sub">さいきんの れんしゅう</h3>
    <ul class="record__list">${history.map((h) => `<li>${fmt(h.at)}　★${h.difficulty}　<b>${h.correct} / ${h.total}</b></li>`).join('')}</ul>
    <h3 class="record__sub">もんだいの しゅるいごと</h3>
    <table class="record__table"><thead><tr><th>しゅるい</th><th>できた</th><th>わりあい</th></tr></thead><tbody>${patternRows}</tbody></table>
    ${tagRows ? `<h3 class="record__sub">まちがえやすい ところ</h3><ul class="record__list">${tagRows}</ul>` : ''}`;
}
