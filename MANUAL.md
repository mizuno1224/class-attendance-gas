# class-attendance-gas 操作マニュアル

このドキュメントでは、Git と clasp のコマンドをそのままコピー＆ペーストして使える形でまとめています。

---

## 1. 事前準備（初回のみ）

### Node.js と clasp のインストール

```bash
npm install -g @google/clasp
```

### Google アカウントでログイン

```bash
clasp login
```

（ブラウザが開くので、このプロジェクトで使う Google アカウントでログインしてください。）

---

## 2. リポジトリをクローンして使う場合

### リポジトリのクローン

```bash
git clone https://github.com/mizuno1224/class-attendance-gas.git
cd class-attendance-gas
```

### scriptId の設定（.clasp.json が空の場合）

既存の GAS プロジェクトと紐づける場合、GAS の「プロジェクトの設定」で「スクリプト ID」をコピーし、`.clasp.json` の `"scriptId": ""` をその ID に書き換えてください。

または、clasp でクローンして .clasp.json を取得する場合：

```bash
clasp clone <スクリプトID>
```

（既にローカルにコードがある場合は、clasp clone で上書きされるため、必要なファイルを退避してから実行してください。）

---

## 3. 日常で使う Git コマンド

### 変更状況の確認

```bash
git status
```

### 変更をステージング

```bash
git add .
```

### コミット

```bash
git commit -m "コミットメッセージ"
```

### リモートへプッシュ

```bash
git push origin main
```

（ブランチ名が `master` の場合は以下）

```bash
git push origin master
```

### リモートの最新を取得

```bash
git pull origin main
```

```bash
git pull origin master
```

### リモートの最新を取り込んでからプッシュ（競合を減らす流れ）

```bash
git pull origin main
git add .
git commit -m "コミットメッセージ"
git push origin main
```

---

## 4. 日常で使う clasp コマンド

### ローカル → GAS（デプロイ）

```bash
clasp push
```

### GAS → ローカル（エディタで直した内容を取り込む）

```bash
clasp pull
```

### ブラウザで GAS エディタを開く

```bash
clasp open
```

### ログの確認（直近の実行ログ）

```bash
clasp logs
```

### デプロイ（Web アプリとして公開する場合）

```bash
clasp deploy -d "説明文"
```

### デプロイ一覧

```bash
clasp deployments
```

---

## 5. よくある作業の流れ（コピペ用）

### ローカルで編集 → GAS に反映

```bash
clasp push
```

### GAS エディタで編集 → ローカルに取り込み → Git で保存

```bash
clasp pull
git add .
git commit -m "GAS側の変更を取り込み"
git push origin main
```

### 新規で GAS プロジェクトを作成してこのリポジトリと紐づける

```bash
clasp create --type webapp --title "class-attendance-gas"
```

（既存の .clasp.json が上書きされます。既に push したいファイルがある場合は、上書き後に `clasp push` で反映できます。）

---

## 6. トラブル時

### clasp のログアウト（別アカウントでやり直す場合）

```bash
clasp logout
clasp login
```

### プロジェクトの紐づけを確認

```bash
clasp status
```

### .clasp.json の scriptId を確認

```bash
type .clasp.json
```

（PowerShell の場合。Mac/Linux の場合は `cat .clasp.json`）

---

## 参考リンク

- [clasp 公式ドキュメント](https://developers.google.com/apps-script/guides/clasp)
- [リポジトリ: mizuno1224/class-attendance-gas](https://github.com/mizuno1224/class-attendance-gas)
