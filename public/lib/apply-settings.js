// 設定を画面全体に反映する（フォント、ふりがな）。

export function applySettings(settings) {
  document.documentElement.dataset.font = settings.font;
  document.documentElement.dataset.kanjiLevel = settings.kanjiLevel || 'kana';
  document.documentElement.classList.toggle('no-furigana', !settings.furigana);
}
