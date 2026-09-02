// 設定と履歴の保存。
// 現在は localStorage 実装のみ。D1 を採用する場合は同じ関数名で ApiAdapter を追加し差し替える。

const SETTINGS_KEY = 'ttc.settings';

export const DEFAULT_SETTINGS = Object.freeze({
  furigana: true,
  ampm: true,
  minuteNumbers: true,
  explainMode: 'split', // 'split' | 'chunk'
  answerMode: 'choice', // 'choice' | 'hand' | 'input'
  speed: 'normal', // 'slow' | 'normal' | 'instant'
  reduceMotion: null, // null なら OS 設定に従う
  tickEvery: 5, // 5 | 10
  bandMarkers: true,
  font: 'udp', // 'udp' | 'mplus' | 'klee'
  showSeconds: false,
  use24h: false,
});

function safeGet(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* 保存できない環境では黙って続行する */
  }
}

export function loadSettings() {
  const raw = safeGet(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
}
