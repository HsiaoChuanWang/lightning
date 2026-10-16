# Lightning 專案指令

本文件整理 Lightning 專案在安裝、開發、檢查、測試與建置時會使用的指令。所有指令都應在專案根目錄執行。

## 環境需求

- Node.js 24.x
- npm
- Git

確認目前環境版本：

```sh
node --version
npm --version
git --version
```

## 安裝專案

第一次取得專案後安裝 dependencies：

```sh
npm install
```

`npm install` 會執行 `prepare` script 並初始化 Husky Git hooks。

若需要完全依照 `package-lock.json` 重新安裝（例如 CI 或乾淨環境），使用：

```sh
npm ci
```

## 環境變數

在專案根目錄建立 `.env.local`：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

- `VITE_SUPABASE_URL`：Supabase API、Storage 圖片網址與圖片來源驗證。
- `VITE_SUPABASE_ANON_KEY`：前端、E2E 與 API smoke test 存取 Supabase。
- `GEMINI_API_KEY`：本機 API server 呼叫 Gemini；部署至 Vercel 時也需設定此變數。

使用新的 Supabase 專案時，還需要先套用 `supabase/migrations/` 內的 migration，並啟用專案需要的 Realtime 與 Presence 功能。

## 常用 npm 指令

| 指令                 | 用途                                                    |
| -------------------- | ------------------------------------------------------- |
| `npm install`        | 安裝 dependencies，並初始化 Husky                       |
| `npm ci`             | 完全依照 lock file 安裝 dependencies                    |
| `npm run dev`        | 啟動 Vite 前端開發伺服器                                |
| `npm run server`     | 啟動本機 API server                                     |
| `npm run build`      | 執行型別檢查並建立 production build                     |
| `npm run build-only` | 只執行 Vite production build                            |
| `npm run preview`    | 預覽 `dist/` 中的 production build                      |
| `npm run type-check` | 執行 Vue／TypeScript 型別檢查                           |
| `npm run lint:check` | 執行 ESLint，僅檢查、不修改檔案                         |
| `npm run lint`       | 執行 ESLint 並自動修正可處理的問題                      |
| `npm run format`     | 使用 Prettier 格式化 `src/`                             |
| `npm run verify`     | 依序執行 ESLint、型別檢查與 production build            |
| `npm run test:api`   | 執行使用真實本機 API、Supabase 與 Gemini 的 smoke tests |

## 啟動本機開發環境

完整功能需要同時啟動 API server 與 Vite，請使用兩個終端機。

終端機 1：

```sh
npm run server
```

終端機 2：

```sh
npm run dev
```

Vite 預設位於 `http://localhost:5173`，並將 `/api` 請求代理至 `http://localhost:3000`。若只啟動 Vite，頁面仍可開啟，但圖片描述與向量評分 API 無法使用。

## 程式碼品質檢查

只執行 ESLint 檢查：

```sh
npm run lint:check
```

讓 ESLint 自動修正可處理的問題：

```sh
npm run lint
```

格式化 `src/`：

```sh
npm run format
```

執行型別檢查：

```sh
npm run type-check
```

一次執行 ESLint、型別檢查及 Vite build：

```sh
npm run verify
```

## 建置與預覽

執行型別檢查並建立 production build：

```sh
npm run build
```

輸出會產生在 `dist/`。在本機預覽建置結果：

```sh
npm run preview
```

`npm run preview` 僅用來檢查建置結果，不是正式環境的 production server。

## E2E 測試（Playwright）

一般 E2E 測試位於 `e2e/`。Playwright 會自動啟動 Vite，不需要事先執行 `npm run dev`。

第一次使用時安裝 Playwright 瀏覽器：

```sh
npx playwright install
```

Linux 或乾淨的 CI 環境若尚未安裝瀏覽器所需的系統套件，可改用：

```sh
npx playwright install --with-deps
```

在 Chromium、Firefox 與 WebKit 執行所有 E2E 測試：

```sh
npx playwright test
```

常用執行方式：

```sh
# 顯示瀏覽器
npx playwright test --headed

# 開啟 Playwright UI
npx playwright test --ui

# 只使用 Chromium
npx playwright test --project=chromium

# 列出設定實際收集到的測試，不執行測試
npx playwright test --list

# 執行單一測試情境
npx playwright test 02-loser-rematch.spec.ts --project=chromium --headed

# 開啟最近一次的 HTML 測試報告
npx playwright show-report
```

這些測試共用配對池與固定測試帳號，設定為單一 worker 依序執行，不應改成平行執行。測試會寫入 Supabase 資料，建議使用獨立的測試專案，不要在 production 環境反覆執行。

## 真實 API Smoke Test

確認本機 API server、Supabase 與 Gemini 串接：

```sh
npm run test:api
```

此指令會自動啟動本機 API server，並測試：

- `/api/vectors` 是否回傳兩組有效且同維度的向量。
- `/api/describe-image` 是否能取得 Supabase 題庫圖片並由 Gemini 回傳描述。

Smoke test 需要正確的 `.env.local`、網路連線及 Gemini 額度，不包含在一般 E2E 測試或 `npm run verify` 中。

如需只執行其中一個 smoke test，可指定檔名：

```sh
npm run test:api -- vectors-api.spec.ts
npm run test:api -- describe-image-api.spec.ts
```

專案目前沒有一般 E2E 專用的 npm script；一般 E2E 請使用 `npx playwright test`，`npm run test:api` 僅執行 `smoke/api/`。

## Git hooks

安裝 dependencies 後，Husky 會在以下 Git 操作自動執行檢查：

| Hook         | 執行內容                                               |
| ------------ | ------------------------------------------------------ |
| `pre-commit` | 使用 lint-staged 對 staged 檔案執行 ESLint 與 Prettier |
| `commit-msg` | 使用 commitlint 檢查 commit 訊息                       |
| `pre-push`   | 執行 `npm run verify`                                  |

commit 訊息格式：

```text
<type>: <description>
```

可使用的 type：

```text
build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test
```

例如：

```text
feat: 新增玩家配對功能
fix: 修正對手掉線判定
docs: 更新 E2E 測試說明
```

## 套件管理

安裝 production dependency：

```sh
npm install <package-name>
```

安裝 development dependency：

```sh
npm install --save-dev <package-name>
```

移除套件：

```sh
npm uninstall <package-name>
```

查看直接安裝的套件：

```sh
npm list --depth=0
```

查看可更新套件：

```sh
npm outdated
```

更新套件後，至少應執行：

```sh
npm run verify
npx playwright test --project=chromium
```
