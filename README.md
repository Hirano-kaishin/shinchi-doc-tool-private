# 新地建設工業 現場書類オートメーションツール（フロント + Python基盤）

図面・仕様書を読み込み、施工計画書ほか5書類のたたき台を自動生成し、手動修正できるツールです。
このリポジトリには以下を含みます。

- フロント（HTML/CSS/Vanilla JS）
- **Pythonバックエンド（Flask）**
- **エージェント層（現場条件・工程・章起案）**

現時点のPython側は「実運用へ拡張できる最小実装」で、LLM未設定時はローカルフォールバックで動作します。

## フォルダ構成

```text
shinchi-doc-tool/
├─ index.html
├─ css/
├─ js/
├─ assets/
├─ docs/
└─ python/
   ├─ app.py                 … Flask API
   ├─ config.py              … 環境変数/設定
   ├─ storage.py             … プロジェクトJSON永続化
   ├─ requirements.txt
   ├─ .env.example
   └─ agents/
      ├─ prompts.py          … 施工管理ルール付きプロンプト
      ├─ client.py           … Claudeラッパー（フォールバック付き）
      └─ service.py          … タスク実行（現場条件/工程/章起案）
```

## 使い方（フロントのみ）

`index.html` をダブルクリックしてブラウザ（Chrome / Edge 推奨）で開いてください。
左メニューから各画面をクリックして確認できます。インストール不要です。

## 使い方（Python API + エージェント）

1. Python環境を用意
2. `python/.env.example` を `python/.env` にコピー
3. 依存をインストール

```bash
cd python
pip install -r requirements.txt
python app.py
```

1. API確認

```bash
curl http://127.0.0.1:5000/api/health
```

1. エージェント呼び出し例

```bash
curl -X POST http://127.0.0.1:5000/api/agent/run ^
   -H "Content-Type: application/json" ^
   -d "{\"task\":\"ground_conditions\",\"payload\":{\"koji_mei\":\"太陽光造成工事\"}}"
```

## Python API（追加済み）

- `GET /api/health`
- `GET /api/config`
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `DELETE /api/projects/:id`
- `POST /api/extract`（現状モック）
- `POST /api/agent/run`
- `POST /api/keikakusho/genba-joken`
- `POST /api/keikakusho/schedule`（現場条件グラウンディング強制連結）
- `POST /api/keikakusho/sections`（`section` あり: 単章 / なし: 必須章バンドル）
- `GET /api/keikakusho/section-profile`（工事種別ごとの必須章プロファイル）

### 施工計画書APIの使い分け

- 章を1つだけ生成:

```bash
curl -X POST http://127.0.0.1:5000/api/keikakusho/sections ^
   -H "Content-Type: application/json" ^
   -d "{\"project_type\":\"private_solar\",\"section\":\"施工方法\",\"context\":{\"project_name\":\"DS千葉袖ヶ浦下泉\"}}"
```

- 必須章をまとめて生成:

```bash
curl -X POST http://127.0.0.1:5000/api/keikakusho/sections ^
   -H "Content-Type: application/json" ^
   -d "{\"project_type\":\"public\",\"context\":{\"project_name\":\"公共案件A\"}}"
```

- 工事種別プロファイル取得:

```bash
curl "http://127.0.0.1:5000/api/keikakusho/section-profile?project_type=private_solar"
```

## 画面一覧

- **ダッシュボード** … 案件の全体状況・書類進捗・AI抽出情報
- **案件一覧** … 図面から作成した案件の管理
- **図面アップロード → AI読込** … PDF等の読込→抽出内容確認→5書類生成の流れ
- **施工計画書（全16項目）** … 表紙〜現場作業環境の整備。各項目を手動修正可
- **工程管理表** … 新地建設の進捗基準で図面数量から自動割付
- **品質管理計画書** … ひな形ベース
- **安全衛生管理計画書 / 災害防止協議会資料**
- **マスタ管理** … 社員名簿・資格マスタ・進捗基準設定（事前登録）

## ロゴ・コーポレートカラーの差し替え

- ロゴ画像は `assets/img/` に置き、`index.html` のサイドバー `.brand .logo` 部分を画像に差し替えます。
- 配色は `css/style.css` 冒頭の `:root { --navy / --blue / --accent … }` の値を変更するだけで全体に反映されます。

## 次のステップ（本実装で必要になるもの）

1. `/api/extract` を実PDF解析へ置換（現在モック）
2. 施工計画書各章のExcel様式反映（項目・座標）
3. 認証・権限・監査ログの導入
