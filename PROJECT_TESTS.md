# 測試與程式碼品質檢查

## 測試架構

本專案目前沒有 unit test，主要使用 Playwright 驗證完整遊戲流程與真實 API 串接：

- `e2e/`：瀏覽器端對端測試，共 7 個遊戲情境。
- `smoke/api/`：真實 API smoke tests，共 2 個 API 情境。
- `playwright.config.ts`：一般 E2E 設定。
- `playwright.smoke.config.ts`：API smoke test 設定。

一般 E2E 會控制 AI 回應，以穩定驗證配對、五回合遊戲、結算與再戰流程。API smoke tests 則會實際連線至本機 API server、Supabase 與 Gemini。

## 測試前準備

安裝專案 dependencies：

```sh
npm install
```

第一次執行 Playwright 時，安裝測試瀏覽器：

```sh
npx playwright install
```

在專案根目錄建立 `.env.local`：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

一般 E2E 需要可用的 Supabase 專案與已套用的 `supabase/migrations/`。API smoke tests 另外需要有效的 Gemini API key 與網路連線。

> 測試會新增及修改 Supabase 中的比賽、回合、配對池與再戰邀請資料，建議使用獨立的測試專案，不要在 production 環境反覆執行。

## E2E 測試（Playwright）

E2E 測試位於 `e2e/`。Playwright 會自動啟動 Vite 開發伺服器，因此不需要事先執行 `npm run dev`。

### 執行全部測試

在 Chromium、Firefox 與 WebKit 執行全部情境：

```sh
npx playwright test
```

顯示瀏覽器並執行：

```sh
npx playwright test --headed
```

使用 Playwright UI 執行或除錯：

```sh
npx playwright test --ui
```

只在 Chromium 執行全部情境：

```sh
npx playwright test --project=chromium
```

日常開發建議先使用 Chromium；需要確認跨瀏覽器相容性時，再執行完整的三種瀏覽器測試。

### 執行單一測試

指定測試檔：

```sh
npx playwright test 02-loser-rematch.spec.ts --project=chromium
```

顯示瀏覽器並執行單一情境：

```sh
npx playwright test 01-winner-rematch.spec.ts --project=chromium --headed
```

真人對戰測試會建立兩個獨立的瀏覽器環境。headed 模式下，兩個視窗可能互相重疊，可將它們排列在螢幕左右兩側，同時查看兩位玩家的操作。

### 測試報告

一般 E2E 執行完成後會產生 HTML 報告。開啟最近一次報告：

```sh
npx playwright show-report
```

失敗測試的結果會寫入 `test-results/`，HTML 報告位於 `playwright-report/`。Playwright 設定會在 CI 重試失敗案例兩次，並在第一次重試時保留 trace；本機執行不會自動重試。

## E2E 情境

目前共有 7 個 E2E 測試檔案，每個檔案包含一個主要遊戲情境。

### 贏家提出再戰

測試檔案：`e2e/01-winner-rematch.spec.ts`

- 建立兩位真人玩家並完成五回合。
- 確認雙方分別顯示勝利與失敗結果。
- 由贏家向輸家提出再戰。
- 確認邀請等待狀態與輸家的接受／拒絕按鈕。
- 輸家接受後，確認雙方進入相同的新比賽。

### 輸家提出再戰

測試檔案：`e2e/02-loser-rematch.spec.ts`

- 建立兩位真人玩家並完成五回合。
- 由輸家向贏家提出再戰。
- 確認邀請等待狀態與贏家的接受／拒絕按鈕。
- 贏家接受後，確認雙方進入相同的新比賽。

### 平手後拒絕再戰

測試檔案：`e2e/03-tie-reject-rematch.spec.ts`

- 固定雙方作答時間與 bonus，避免毫秒差改變比賽結果。
- 確認五回合結束後雙方皆顯示平手。
- 一方提出再戰，另一方拒絕。
- 確認邀請方顯示拒絕狀態，並確認雙方返回登入頁。

### 真人玩家掉線

測試檔案：`e2e/04-human-disconnect.spec.ts`

- 建立真人對戰並確認雙方已成功配對。
- 完成第一回合後，讓其中一位玩家在第二回合掉線。
- 保留正式流程使用的 3 秒重連寬限。
- 確認線上玩家看到錯誤 Modal 與對手離線訊息。
- 關閉 Modal 後，確認玩家返回登入頁。

### Phantom 對戰

測試檔案：`e2e/05-phantom-match.spec.ts`

- 匹配 Phantom 對手並完成五回合。
- 確認遊戲不顯示 AI opponent 標籤。
- 確認 Phantom 對戰結束後不提供再戰按鈕。

此情境需要資料庫中至少有一場可供重播的完整已完成對戰。

### AI 對戰與備援答案

測試檔案：`e2e/06-ai-match.spec.ts`

- 模擬找不到可用的 Phantom 對手。
- 強制圖片描述 API 失敗。
- 確認系統改用 Supabase 題庫的標準答案。
- 完成五回合並確認畫面顯示 AI opponent。
- 確認 AI 對戰結束後不提供再戰按鈕。

### API 錯誤 Modal

測試檔案：`e2e/07-error-modal.spec.ts`

- 模擬配對流程的 API 錯誤。
- 確認顯示錯誤 Modal 與無法開始配對的訊息。
- 確認頁面返回登入路徑。
- 按下 `OK` 後確認 Modal 關閉。

## E2E 執行特性

### 固定單一 worker

所有情境共用 Supabase 配對池與固定測試帳號，因此 `playwright.config.ts` 設定為單一 worker 並依序執行。不可改成平行執行，否則不同測試可能互相搶配對或修改相同資料。

### 固定外部 API 回應

一般 E2E 會攔截 `/api/vectors`，回傳可預測的向量資料，使勝、負與平手結果不依賴 Gemini 或其他外部服務。AI 情境也會控制圖片描述失敗流程，以驗證 Supabase 標準答案的備援行為。

真實服務是否可用，應由下方的 API smoke tests 驗證。

### 測試時間

完整測試包含多場五回合對戰。一般作答每回合會隨機等待 1～9 秒，以模擬玩家思考時間；部分 UI 點擊前也會保留短暫停頓，方便在 headed 模式觀察。

### 固定測試帳號

測試使用固定 UUID，重複執行時會沿用相同帳號，不會持續建立新使用者。執行真人對戰前，測試輔助程式會清理這些帳號在配對池中的舊資料。

## API Smoke Tests

API smoke tests 位於 `smoke/api/`，使用獨立的 `playwright.smoke.config.ts`。執行：

```sh
npm run test:api
```

Playwright 會自動執行 `npm run server`，等待 `http://localhost:3000/health` 可用，再開始測試，因此不需要預先啟動 API server。

### Vectors API

測試檔案：`smoke/api/vectors-api.spec.ts`

- 呼叫真實 `/api/vectors` endpoint。
- 確認 response 成功。
- 確認回傳 `vector1` 與 `vector2`。
- 確認兩組向量非空、維度相同，且所有值都是有限數字。

### Describe Image API

測試檔案：`smoke/api/describe-image-api.spec.ts`

- 確認 `.env.local` 包含 Supabase URL 與 anon key。
- 從 Supabase 題庫取得一張圖片。
- 呼叫真實 `/api/describe-image` endpoint。
- 確認 Gemini 回傳一筆非空字串描述。

API smoke tests 會使用網路、Supabase 資料與 Gemini 額度，因此不包含在一般 `npx playwright test`、`npm run verify` 或目前的 GitHub Actions 品質檢查中。

## 尚未涵蓋的測試

目前專案沒有 unit test，也尚未測試「玩家掉線後，在 3 秒重連寬限內恢復連線」。原因如下：

- Pinia 尚未支援重新開啟頁面後恢復進行中的比賽。
- 短暫切換瀏覽器離線時，Supabase Presence 不保證在 3 秒內送出 leave。

建議完成進行中比賽的 session 恢復機制後，再加入重連 E2E 情境。若未來新增 Vitest 等 unit test framework，也應在 `package.json` 加入對應 script，並更新本文件。

## ESLint

只執行 ESLint 檢查，不修改檔案：

```sh
npm run lint:check
```

執行 ESLint 並自動修正可處理的問題：

```sh
npm run lint
```

ESLint 會檢查專案中的 `.ts`、`.mts`、`.tsx` 與 `.vue` 檔案，並套用：

- Vue Essential 規則。
- TypeScript Recommended 規則。

`dist/`、`dist-ssr/` 與 `coverage/` 不會納入 ESLint 檢查。Prettier 排版規則也不由 ESLint 處理，避免兩套工具的規則互相衝突。

## Prettier

格式化 `src/`：

```sh
npm run format
```

專案的主要 Prettier 設定如下：

- 不加分號。
- 使用單引號。
- 每行寬度上限為 100 個字元。

`npm run format` 只會格式化 `src/`。Git staged 檔案則會由 lint-staged 依檔案類型處理：

- `.ts`、`.mts`、`.tsx`、`.vue`：先由 ESLint 修正，再使用 Prettier 格式化。
- `.json`、`.md`、`.css`、`.scss`：使用 Prettier 格式化。

如需檢查單一文件是否符合格式，但不修改檔案，可以執行：

```sh
npx prettier --check <file-path>
```

## 型別檢查與建置

執行 Vue／TypeScript 型別檢查：

```sh
npm run type-check
```

依序執行 ESLint、型別檢查與 production build：

```sh
npm run verify
```

`npm run verify` 會依序執行 `lint:check`、`type-check` 與 `build-only`。一般 E2E 與 API smoke tests 不包含在此指令中，需要依需求另外執行。

## Husky

本專案使用 Husky 在 Git 操作期間自動執行品質檢查。執行 `npm install` 或 `npm ci` 時，`prepare` script 會初始化 Husky。

| Git hook     | 執行內容                                                    |
| ------------ | ----------------------------------------------------------- |
| `pre-commit` | 執行 lint-staged，只處理這次 staged 的檔案                  |
| `commit-msg` | 執行 commitlint，檢查 commit 訊息格式                       |
| `pre-push`   | 執行 `npm run verify`，檢查 ESLint、型別與 production build |

### Pre-commit

提交前會自動執行：

```sh
npx lint-staged
```

lint-staged 只會處理已加入 staging area 的檔案，不會格式化工作目錄內其他尚未 staged 的變更。

### Commit message

commit 訊息格式必須為：

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
test: 新增再戰流程測試
```

type 必須為小寫、description 不可為空，整個標題不可超過 100 個字元。

### Pre-push

推送前會自動執行：

```sh
npm run verify
```

若 ESLint、型別檢查或 production build 任一項失敗，push 會停止。Playwright E2E 不包含在 pre-push 中，避免每次推送都執行耗時且會寫入 Supabase 的測試。

## GitHub Actions

GitHub Actions 會在 push 與 pull request 時使用 Node.js 24，依序執行：

```sh
npm ci
npm run verify
```

目前 CI 不會自動執行 Playwright E2E 或 API smoke tests。需要在送出變更前依修改範圍手動執行。

## 建議的完整檢查流程

一般功能修改：

```sh
npm run verify
npx playwright test --project=chromium
```

準備發布或修改跨瀏覽器相關功能：

```sh
npm run verify
npx playwright test
```

修改 API server、Gemini 或 Supabase 串接：

```sh
npm run verify
npx playwright test --project=chromium
npm run test:api
```
