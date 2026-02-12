# clasp で GAS をローカル管理する手順

このプロジェクトは GitHub からクローン済みです。以下の手順で clasp を使い、ローカルで編集したコードを Google Apps Script（GAS）に反映できます。

---

## 前提条件

- **Node.js** がインストールされていること（v14 以上推奨）
- **Google アカウント**（GAS を管理するアカウント）

---

## ステップ 1: clasp をインストール

ターミナル（PowerShell やコマンドプロンプト）で実行します。

```bash
npm install -g @google/clasp
```

インストール確認：

```bash
clasp --version
```

---

## ステップ 2: Google Apps Script API を有効化

1. ブラウザで次の URL を開く  
   **https://script.google.com/home/usersettings**
2. **「Google Apps Script API」** を **オン** にする  

※ オフのままだと `clasp login` や `clasp push` でエラーになります。

---

## ステップ 3: Google アカウントでログイン

プロジェクトフォルダで実行します。

```bash
cd c:\Users\0116\Desktop\MyProject\class-attendance-gas
clasp login
```

- ブラウザが開くので、GAS を管理したい Google アカウントでログイン
- ターミナルに **「Saved the credentials...」** と出れば成功

---

## ステップ 4: どの GAS プロジェクトで使うか決める

このリポジトリには **`.clasp.json`** が含まれており、すでに **スクリプト ID** が書かれています。

### パターン A: 既存の GAS プロジェクト（この ID）を使う

- その GAS プロジェクトの **編集権限** があなたのアカウントにある場合  
  → **何も変更せず**、このまま **ステップ 5** へ。

### パターン B: 自分用の新しい GAS プロジェクトを使う（推奨）

1. [Google Apps Script](https://script.google.com/) を開く  
2. **「新しいプロジェクト」** で空のプロジェクトを作成  
3. 上部メニュー **「プロジェクトの設定」**（歯車アイコン）を開く  
4. **「スクリプト ID」** をコピー  
5. プロジェクトフォルダ内の **`.clasp.json`** を開き、`scriptId` をコピーした ID に書き換えて保存  

```json
{
  "scriptId": "ここにあなたのスクリプトIDを貼り付け",
  "rootDir": "",
  ...
}
```

※ 自分専用で使う場合は、`.clasp.json` を `.gitignore` に追加し、リポジトリには含めない運用もおすすめです。

---

## ステップ 5: ローカル → GAS へアップロード（push）

ローカルで編集した内容を GAS に反映するとき：

```bash
clasp push
```

- プロジェクト内の `.js` / `.gs` / `.html` / `appsscript.json` などが GAS に送られます。

---

## ステップ 6: GAS → ローカルへ取得（pull）

GAS のエディタで変更した内容をローカルに取り込みたいとき：

```bash
clasp pull
```

- 上書きされるので、必要なファイルはバックアップしてから実行してください。

---

## よく使う clasp コマンド一覧

| コマンド | 説明 |
|----------|------|
| `clasp login` | Google アカウントでログイン |
| `clasp push` | ローカル → GAS にアップロード |
| `clasp pull` | GAS → ローカルにダウンロード |
| `clasp open` | ブラウザで GAS のスクリプトエディタを開く |
| `clasp deploy` | デプロイ（Web アプリなどとして公開する場合） |
| `clasp logs` | 実行ログを表示 |

---

## 運用の流れ（イメージ）

1. ローカル（このフォルダ）でコードを編集  
2. `clasp push` で GAS に反映  
3. 必要なら `clasp open` で GAS 上で動作確認  
4. `git add` / `git commit` / `git push` で GitHub に保存  

GAS 上だけを編集した場合は、`clasp pull` でローカルに取り込んでから `git commit` すると、ローカルと GitHub の内容を揃えられます。

---

## Git の pull / push 手順（細かいコマンド）

リモート（GitHub）とローカルの変更をやりとりするときの具体的なコマンド例です。ターミナル（PowerShell やコマンドプロンプト）で、**プロジェクトフォルダに移動してから**実行します。

### プロジェクトフォルダへ移動

```bash
cd c:\Users\0116\Desktop\MyProject\class-attendance-gas
```

---

### リモートの最新を取り込む（pull）

**いつ使うか:** ほかの PC や GitHub 上で変更した内容を、この PC のフォルダに反映したいとき。

1. **現在の状態を確認（任意）**

   ```bash
   git status
   ```

2. **リモートの最新を取得してマージ**

   ```bash
   git pull origin main
   ```

   ※ ブランチ名が `master` の場合は次のようにします。

   ```bash
   git pull origin master
   ```

3. **ブランチ名がわからない場合**

   ```bash
   git branch -a
   ```

   `remotes/origin/main` や `remotes/origin/master` のように表示されている名前の、`origin/` の後ろの部分（`main` や `master`）を `git pull origin ブランチ名` に使います。

4. **コンフリクトが出た場合**

   - 表示されたファイルをエディタで開き、`<<<<<<<` と `=======` と `>>>>>>>` で囲まれた部分を手で修正して保存
   - 修正したファイルを追加してコミット：

   ```bash
   git add ファイル名
   git commit -m "コンフリクト解消"
   ```

---

### ローカルの変更をリモートへ送る（push）

**いつ使うか:** この PC で編集・コミットした内容を GitHub にアップロードしたいとき。

1. **変更状況を確認**

   ```bash
   git status
   ```

   - 変更したファイルが一覧で出ます。

2. **コミット対象に追加**

   - すべての変更を追加する場合：

     ```bash
     git add .
     ```

   - 特定のファイルだけ追加する場合：

     ```bash
     git add ファイル名
     ```

   例：

   ```bash
   git add App_Homeroom.js js.html
   ```

3. **ローカルでコミット**

   ```bash
   git commit -m "修正"
   ```

   ※ `"〇〇を修正"` の部分は、何をしたかわかる短いメッセージに書き換えます。

4. **リモートへ送る**

   ```bash
   git push origin main
   ```

   ※ ブランチ名が `master` の場合は次のようにします。

   ```bash
   git push origin master
   ```

5. **初回 push で「upstream がありません」と出た場合**

   ```bash
   git push -u origin main
   ```

   （ブランチが `master` なら `git push -u origin master`）  
   一度 `-u` を付けて push すると、次からは `git push` だけで同じブランチに push できます。

---

### よく使う流れの例

| やりたいこと | 手順 |
|--------------|------|
| 今日の作業を GitHub に保存する | `git add .` → `git commit -m "メッセージ"` → `git push origin main` |
| ほかの場所でやった変更を取り込む | `git pull origin main` |
| ローカルで編集 → GAS にも反映 → GitHub にも保存 | `clasp push` → `git add .` → `git commit -m "メッセージ"` → `git push origin main` |
| GAS 上だけ編集した → ローカルと GitHub を揃えたい | `clasp pull` → `git add .` → `git commit -m "GASの変更を取り込み"` → `git push origin main` |

---

## トラブルシューティング

- **「clasp が認識されない」**  
  → Node.js と npm のパスが通っているか確認。  
  → `npm install -g @google/clasp` を再度実行。

- **「Permission denied」やログインエラー**  
  → [Google Apps Script API](https://script.google.com/home/usersettings) がオンか確認。  
  → `clasp login` をやり直す。

- **「Script not found」**  
  → `.clasp.json` の `scriptId` が、ログインしたアカウントで編集できる GAS の ID か確認。

- **Git: 「branch 'main' doesn't exist」や push 先がわからない**  
  → `git branch -a` でリモートのブランチ名を確認し、`git pull origin ブランチ名` / `git push origin ブランチ名` でその名前に合わせる。

- **Git: 「nothing added to commit」**  
  → `git add .` または `git add ファイル名` を実行してから `git commit` する。

- **Git: リポジトリがまだない（git init 前）**  
  → このドキュメントの Git 手順は「すでにリモート（GitHub）があるプロジェクト」を想定しています。新規で GitHub に上げる場合は、GitHub でリポジトリを作成したあと、`git remote add origin https://github.com/ユーザー名/リポジトリ名.git` でリモートを追加してから `git push -u origin main` を実行します。

---

以上で、このリポジトリを clasp でローカル管理できる状態になります。
