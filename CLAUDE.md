# Project: class-attendance-gas

Google Apps Script (GAS) による出席管理Webアプリ。

## Deploy Rule

**GASのソースコード (.js, .html, appsscript.json) を変更した場合は、必ず以下を実行してからユーザーに完了報告すること:**

```bash
npx clasp push && npx clasp deploy --description "<バージョン番号> <変更概要>"
```

- `App_Config.js` の `APP_VERSION` をインクリメントする
- deploy 後、デプロイメントIDとバージョン番号をユーザーに報告する
- テストデプロイ(HEAD)はpush時点で自動反映される

## Tech Stack

- Backend: Google Apps Script (V8 runtime)
- Frontend: HTML/CSS/JavaScript (GAS HtmlService)
- Storage: Google Sheets
- Deploy: clasp CLI
- Script ID: `1t542j-39NN9tJCkloU5QyllbL2OLBauCzLeK3bcrUQ2hof0kDTb2xmdn`

## File Structure

- `App_Config.js` - 設定・初期化・バージョン管理
- `App_Homeroom.js` - クラス担任用API
- `App_Subject.js` - 教科担任用API
- `App_Calendar.js` - カレンダー設定API
- `App_Master.js` - マスタデータ管理API
- `Utils.js` - 共通ユーティリティ（データ取得・保存・祝日キャッシュ）
- `index.html` - HTMLテンプレート
- `css.html` - スタイルシート
- `js.html` - クライアントサイドJavaScript

## Key Conventions

- 日付は "YYYY-MM-DD" 文字列で統一（dateToKey_）
- subjectId = subjectName（IDをそのまま表示名として使用）
- 祝日はCacheServiceで6時間キャッシュ
- localStorageで15分間のクライアントキャッシュ
