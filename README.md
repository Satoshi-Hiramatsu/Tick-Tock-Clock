# とけいのれんしゅう（Tick-Tock-Clock）

小学2年生向けに、アナログ時計の読み方と「〜分後」「〜分前」の計算を、**針が実際に動いて、動いた分が量として見える**形で学べるブラウザアプリです。A4のテストプリントも作れます。

姉妹アプリ「[算数 筆算プリントジェネレーター](https://github.com/Satoshi-Hiramatsu/Hissan-generator)」「[漢字問題ジェネレーター](https://github.com/Satoshi-Hiramatsu/kanji-generator)」と同じ構成（Cloudflare Workers + 静的アセット、ビルドなし）です。

## 状態

開発中（Sprint 1 完了）。「まなぶ」モードで時計を動かし、移動の帯・連動デジタル時計・経過分カウンターを確認できます。れんしゅう・プリント・せっていは準備中です。

計画の全体は [時計の読み方_開発計画書.md](時計の読み方_開発計画書.md) を参照してください。

## 手元で動かす

```bash
npm install
npm start
```

ブラウザで <http://127.0.0.1:8787> を開きます。

```bash
npm test      # 時刻計算・角度計算の単体テスト
```

## 構成

```
public/            画面資産（ビルドなし・ES modules）
  lib/time.js      時刻の計算（純粋関数）
  lib/angles.js    角度と SVG パス（純粋関数）
  lib/clock-svg.js 時計の描画
  lib/animator.js  経過分のアニメーション
  screens/         画面ごとの描画
src/worker.js      Cloudflare Worker（静的配信）
tests/             node --test
```

## ライセンス

ISC
