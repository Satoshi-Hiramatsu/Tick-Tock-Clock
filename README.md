# とけいのれんしゅう（Tick-Tock-Clock）

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Live](https://img.shields.io/badge/live-tick--tock--clock.molkz.com-0d47a1)](https://tick-tock-clock.molkz.com/)

小学2年生向けに、アナログ時計の読み方と「〜分後」「〜分前」「何分間」の計算を、**針が実際に動いて、動いた分が量として見える**形で学べるブラウザアプリです。A4のテストプリントも作れます。

姉妹アプリ「[算数 筆算プリントジェネレーター](https://github.com/Satoshi-Hiramatsu/Hissan-generator)」「[漢字問題ジェネレーター](https://github.com/Satoshi-Hiramatsu/kanji-generator)」と同じ構成（Cloudflare Workers + 静的アセット、ビルドなし）です。

## すぐ試す

**<https://tick-tock-clock.molkz.com/>**

インストール不要・ログイン不要です。スマートフォン、タブレット、PCのブラウザで動きます。

## このアプリでできること

- **まなぶ**：+5分〜+60分、−5分〜−60分のボタンや針のドラッグで時計を動かす。動いた量が、時計の帯（60分で1周、次は内側の帯へ）、連動するデジタル時計、経過分カウンター（60分を超えると「= 1時間20分」）、数直線、時間ブロックで見える。12を通ると12が光って時が変わる。PCの横長画面では時計を左に大きく表示し、操作ボタンと動きの表示を右にまとめる。
- **2通りの解説**：教科書式の「くぎって考える」（3時10分 → 4時 → 4時30分）と、「1時間のかたまりで考える」（80分 = 1時間 + 20分）を切り替え。
- **れんしゅう**：10種類の問題（よむ・かく・〜分後・〜分前・〜時間後・何分間・午前午後・時間と分の変換・文章題）を★1〜★4の難易度で出題。答え方は4択・針を動かす・テンキー入力。3段階のヒント。答えたあとは必ず動きの解説。
- **プリント**：A4縦に6 / 8 / 10問。解答ページ付き（答えは赤字、動いた範囲はグレーの帯）。シード付きURLで同じプリントを再印刷できる。
- **せってい**：ふりがな、午前・午後、解説方式、速度、動きを減らす、UDフォント切替、発展（秒針・24時間表示）。れんしゅうの記録（端末内に保存）。
- PWA対応。一度開けばオフラインでも全機能が動く。

## 3分で始める（手元で動かす）

```bash
git clone git@github.com:Satoshi-Hiramatsu/Tick-Tock-Clock.git
cd Tick-Tock-Clock
npm install
npm start
```

ブラウザで <http://127.0.0.1:8787> を開きます。

```bash
npm test          # 時刻計算・角度・アニメーター・問題生成の単体テスト
npm run deploy    # Cloudflare にデプロイ（wrangler login 済みが前提）
```

自分のドメインで運用する場合は `wrangler.jsonc` の `routes` を書き換えてください。

## 使い方

[利用ガイド](docs/USAGE.md) を参照してください。

## 構成

```
public/                  画面資産（ビルドなし・ES modules）
  lib/time.js            時刻の計算（純粋関数）
  lib/angles.js          角度と SVG パス（純粋関数）
  lib/clock-svg.js       時計の描画・帯・ドラッグ
  lib/animator.js        経過分のアニメーション
  lib/problems/          問題生成（P1〜P10、難易度、4択の誤答）
  components/            動きのビュー、テンキー
  screens/               ホーム・まなぶ・れんしゅう・プリント・せってい
src/worker.js            Cloudflare Worker（静的配信）
tests/                   node --test
時計の読み方_開発計画書.md  設計と計画
```

## 設計のポイント

- すべての表示（針・帯・デジタル時計・カウンター・数直線・ブロック・式）を「経過分」1つの値から導出する。
- 時針は赤、分針は青（学習用時計の慣例）。誤答に赤と×を使わない。
- 12の通過は、進む場合「12に到達した瞬間」、戻る場合「12を離れた瞬間」で時が変わる。この非対称は意図的で、テストで固定している。

## ライセンス

ISC
