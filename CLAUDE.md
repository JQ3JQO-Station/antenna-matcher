# antenna-matcher

アンテナ給電マッチング選定ガイド + 計算ツール
URL: https://jq3jqo-station.github.io/antenna-matcher/

## 技術構成
- 静的HTML + CSS + JS（フレームワークなし）
- GitHub Pages配信
- レスポンシブ（スマホ優先）
- ダークテーマ（ham-calcと世界観統一）

## ファイル構成
```
antenna-matcher/
├── index.html          # ウィザードUI本体
├── css/style.css       # ダークテーマスタイル
├── js/
│   ├── matcher.js      # 選定ロジック（インピーダンス推定・変換比決定）
│   ├── calc_unun.js    # 巻数計算（コア別Al値）
│   └── drawing.js      # SVG図解生成
└── README.md
```

## 対応パターン（選定テーブル）
| アンテナ | 給電点 | 推定インピーダンス | 変換比 | 種別 |
|---|---|---|---|---|
| ロングワイヤー | 端部 | ~500Ω | 9:1 | UnUn |
| ロングワイヤー | L型 | ~200Ω | 4:1 | UnUn |
| デルタループ | 頂点(60°) | ~100Ω | 2:1 | Balun |
| デルタループ | 辺中点(90°) | ~75Ω | 直結推奨 | 1:1 Balun |
| デルタループ | 底辺(120°) | ~200Ω | 4:1 | Balun |
| フルサイズダイポール | 中点 | ~73Ω | 直結 | 1:1 電流Balun |

## コアAl値プリセット
- FT140-43: 885 nH/N²
- FT240-43: 1075 nH/N²
- FT140-61: 195 nH/N²
- FT240-61: 230 nH/N²

## 巻数計算式
- 必要L: XL >= 4 * 50Ω at lowest target freq
- 巻数: N = sqrt(L_required / Al)

## セッション開始時
1. このCLAUDE.mdとDEVLOG.mdを読む
2. git pull で最新コードを取得

## セッション終了時
1. DEVLOG.mdに重要な変更を記録
2. git commit && git push origin main

## 注意
- コメントは英語のみ（UTF-8問題回避）
- コミットメッセージは日本語可
