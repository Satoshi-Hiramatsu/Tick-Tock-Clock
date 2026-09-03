// 設定画面：表示・操作の設定と学習記録（大人が操作・管理する前提の漢字UI）

import { saveSettings, listHistory, summarize, clearHistory, DEFAULT_SETTINGS } from '../lib/storage.js';
import { applySettings } from '../lib/apply-settings.js';
import { PATTERNS } from '../lib/problems/index.js';

const TAG_LABELS = {
  'no-carry': '繰り上がり・繰り下がりの忘れ',
  'hour-only': '分の移動忘れ',
  reverse: '進む・戻るの向き間違い',
  'hour-misread': '短針（時）の読み間違い',
  swap: '時と分の取り違え',
  'no-convert': '時間と分の単位変換ミス',
  offset: '針の位置のズレ',
  other: 'その他',
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
      <h1 class="setup__title">設定</h1>
      <form class="settings__form">
        ${group(
          '漢字・表記レベル',
          [
            radio('kanjiLevel', 'kana', 'ひらがな（低学年向け）', s.kanjiLevel || 'kana'),
            radio('kanjiLevel', 'grade3', '漢字すこし（小学3年生程度）', s.kanjiLevel || 'kana'),
            radio('kanjiLevel', 'adult', '一般漢字（大人向け）', s.kanjiLevel || 'kana'),
          ].join(''),
          '設定画面以外（ホーム・学ぶ・練習・問題文）の表記レベルを切り替えます。ふりがな表示とも連動します。'
        )}
        ${group(
          '表示設定',
          [
            check('furigana', 'ふりがなを表示', s.furigana),
            check('ampm', '午前・午後を表示', s.ampm),
            check('minuteNumbers', '時計盤に分の数字（0〜55）を表示', s.minuteNumbers),
            check('bandMarkers', '針の移動範囲に10分ごとの目印を表示', s.bandMarkers),
          ].join('')
        )}
        ${group(
          '解説の表示形式',
          [
            radio('explainMode', 'split', '区切って考える（段階別）', s.explainMode),
            radio('explainMode', 'chunk', '1時間の塊で考える', s.explainMode),
          ].join('')
        )}
        ${group(
          '練習の解答方法',
          [
            radio('answerMode', 'choice', '4択から選ぶ', s.answerMode),
            radio('answerMode', 'hand', '針を動かす', s.answerMode),
            radio('answerMode', 'input', '数値を入力', s.answerMode),
          ].join('')
        )}
        ${group(
          'アニメーション速度',
          [
            radio('speed', 'slow', '低速（ゆっくり）', s.speed),
            radio('speed', 'normal', '標準（ふつう）', s.speed),
            radio('speed', 'instant', '即時（一気に表示）', s.speed),
          ].join(''),
          '速度は「学ぶ」画面や解説画面でも随時変更できます。'
        )}
        ${group(
          '動作の抑制（視覚効果）',
          [
            radio('reduceMotion', 'auto', 'OSの設定に従う', s.reduceMotion === null ? 'auto' : s.reduceMotion),
            radio('reduceMotion', 'true', '抑制する（コマ送り）', s.reduceMotion === null ? 'auto' : s.reduceMotion),
            radio('reduceMotion', 'false', '抑制しない（通常）', s.reduceMotion === null ? 'auto' : s.reduceMotion),
          ].join('')
        )}
        ${group(
          '経過分カウンターの目盛間隔',
          [
            radio('tickEvery', 5, '5分ごと', s.tickEvery),
            radio('tickEvery', 10, '10分ごと', s.tickEvery),
          ].join('')
        )}
        ${group(
          'フォント',
          [
            radio('font', 'udp', 'BIZ UDPゴシック', s.font),
            radio('font', 'mplus', 'M PLUS 1p', s.font),
            radio('font', 'klee', 'Klee One（手書き風）', s.font),
          ].join('')
        )}
        ${group(
          '発展機能（小学3年生以上）',
          [
            check('showSeconds', 'ホーム画面の時計に秒針を表示', s.showSeconds),
            check('use24h', '24時間表示（15:10）にする', s.use24h),
          ].join(''),
          '※小学2年生の学習範囲では使用しません。'
        )}
        <div class="settings__actions">
          <button type="button" class="btn btn--ghost" data-action="reset-settings">設定を初期状態に戻す</button>
        </div>
      </form>

      <section class="record">
        <h2 class="record__title">学習記録</h2>
        <div class="record__body"></div>
        <div class="settings__actions">
          <button type="button" class="btn btn--ghost" data-action="clear-history">学習記録を消去</button>
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
    el.innerHTML = '<p class="setup__note">まだ学習記録がありません。練習を実施するとここに結果が表示されます。</p>';
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
    .map(([tag, n]) => `<li>${TAG_LABELS[tag] || tag}：${n}回</li>`)
    .join('');
  el.innerHTML = `
    <h3 class="record__sub">直近の練習履歴</h3>
    <ul class="record__list">${history.map((h) => `<li>${fmt(h.at)}　★${h.difficulty}　<b>${h.correct} / ${h.total} 問正解</b></li>`).join('')}</ul>
    <h3 class="record__sub">問題形式別の成績</h3>
    <table class="record__table"><thead><tr><th>種類</th><th>正答数 / 出題数</th><th>正答率</th></tr></thead><tbody>${patternRows}</tbody></table>
    ${tagRows ? `<h3 class="record__sub">間違えやすい傾向</h3><ul class="record__list">${tagRows}</ul>` : ''}`;
}
