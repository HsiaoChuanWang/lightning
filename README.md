# Lightning

本專案使用 Vue 3、TypeScript 與 Vite 開發。

## 建議開發環境

建議使用 [VSCode](https://code.visualstudio.com/) 搭配 [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)，並停用 Vetur。

## 安裝專案套件

```sh
npm install
```

## 啟動開發伺服器

```sh
npm run dev
```

## 型別檢查與正式環境建置

```sh
npm run build
```

## 程式碼檢查

只檢查問題，不修改檔案：

```sh
npm run lint:check
```

檢查並自動修正可處理的問題：

```sh
npm run lint
```

ESLint 目前會檢查專案中的 `.ts`、`.mts`、`.tsx` 與 `.vue` 檔案，並套用：

- Vue Essential 規則
- TypeScript Recommended 規則

`dist/`、`dist-ssr/` 與 `coverage/` 產出目錄不會納入檢查。程式碼排版由 Prettier 分開處理，不屬於 ESLint 的檢查範圍。

### Git 提交檢查

Husky 會在 Git 操作的不同階段執行以下檢查：

| 時間點       | 執行內容                                                   |
| ------------ | ---------------------------------------------------------- |
| `pre-commit` | 使用 lint-staged 對本次 staged 檔案執行 ESLint 與 Prettier |
| `commit-msg` | 使用 commitlint 檢查 commit 訊息格式                       |
| `pre-push`   | 執行完整 ESLint、TypeScript 型別檢查與正式環境建置         |

commit 訊息格式為 `<type>: <description>`，type 必須使用小寫且屬於以下類型：

```text
build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test
```

例如：

```text
feat: 新增玩家配對功能
fix: 修正對手掉線判定
docs: 更新 E2E 測試說明
```

標題不可超過 100 個字元，冒號後的描述不可為空。完整檢查也可以手動執行：

```sh
npm run verify
```

GitHub Actions 會在 push 與 pull request 時再次執行相同的完整檢查。Playwright E2E 不包含在 commit、push 或此 CI 流程中，需依下方說明另外執行。

## 端對端測試（Playwright）

E2E 測試位於 `e2e/`。Playwright 會自動啟動 Vite 開發伺服器，不需要另外執行 `npm run dev`。

### 執行方式

請在專案根目錄依需求選擇一個指令：

```sh
# 在 Chromium、Firefox 與 WebKit 執行完整套件
npx playwright test

# 顯示瀏覽器並執行完整套件
npx playwright test --headed

# 開啟互動介面（適合開發與除錯）
npx playwright test --ui

# 僅在 Chromium 依序執行七種情境
npx playwright test --project=chromium
```

日常開發建議使用互動介面：

1. 在專案根目錄開啟一個終端機。
2. 執行 `npx playwright test --ui`。
3. 在 Playwright UI 中選擇並執行測試案例。

開啟最近一次產生的 HTML 報告：

```sh
npx playwright show-report
```

### E2E 情境清單

| 測試檔                          | 驗證情境                                                        |
| ------------------------------- | --------------------------------------------------------------- |
| `01-winner-rematch.spec.ts`     | 真人完成五回合，贏家邀請輸家並成功再戰                          |
| `02-loser-rematch.spec.ts`      | 真人完成五回合，輸家邀請贏家並成功再戰                          |
| `03-tie-reject-rematch.spec.ts` | 真人五回合平手，一方邀請且另一方拒絕再戰                        |
| `04-human-disconnect.spec.ts`   | 真人完成第一回合後於第二回合掉線，線上玩家收到 Modal 並回登入頁 |
| `05-phantom-match.spec.ts`      | 匹配 Phantom 並完成五回合                                       |
| `06-ai-match.spec.ts`           | AI 描述 API 失敗時使用 Supabase 標準答案並完成五回合            |
| `07-error-modal.spec.ts`        | API 錯誤時顯示 Error Modal、返回登入頁並可關閉 Modal            |

只執行單一情境：

```sh
npx playwright test 02-loser-rematch.spec.ts --project=chromium --headed
```

### 觀看雙方真人對戰

先關閉 Playwright UI，再以 headed 模式執行真人對戰測試：

```sh
npx playwright test 01-winner-rematch.spec.ts --project=chromium --headed
```

測試會建立兩個獨立的瀏覽器環境。兩個視窗可能互相重疊，可將它們排列在螢幕左右兩側，同時觀看兩位玩家完成對戰。

### 執行須知

- **依序執行：**所有情境共用配對池與固定測試帳號，因此 Playwright 固定使用單一 worker，不可平行執行。
- **執行時間：**完整套件包含多場五回合對戰；一般作答每回合會隨機等待 1～9 秒，以模擬玩家的思考時間。
- **平手結果：**測試會固定雙方寫入資料庫的作答時間與 bonus，避免瀏覽器的毫秒差改變勝負。
- **掉線流程：**保留正式流程的 3 秒重連寬限；確認掉線後，Error Modal 會停留 2 秒，再按下 `OK` 返回登入頁。
- **固定帳號：**測試使用固定 UUID，重複執行時會沿用相同帳號，不會持續新增使用者。

### 測試資料與環境

- Phantom 測試需要資料庫中至少存在一場可供重播的完整已完成對戰。
- AI 測試會模擬找不到 Phantom 候選，並強制圖片描述 API 失敗，以確認系統改用 Supabase 題庫的標準答案後仍能完成五回合。
- 若尚未安裝 Playwright 瀏覽器，請執行：

```sh
npx playwright install
```

> 建議使用獨立的 Supabase 測試專案。測試仍會新增比賽、回合及再戰邀請資料，不適合在正式環境反覆執行。

### 尚未涵蓋的情境

目前未測試「掉線後於 3 秒重連寬限內恢復連線」，原因如下：

- Pinia 尚未支援重新開啟頁面後恢復進行中的比賽。
- 短暫切換瀏覽器離線時，Supabase Presence 不保證會在 3 秒內送出 leave。

建議完成進行中比賽的 session 恢復機制後，再加入此情境。

### 真實 API Smoke Test

一般 E2E 會控制 AI 回應，以穩定驗證遊戲流程。若要確認本機 API、Gemini 金鑰與真實服務的串接，請執行：

```sh
npm run test:api
```

此指令會自動啟動本機 API server，並驗證：

- `/api/vectors`：確認回傳兩組有效且同維度的向量。
- `/api/describe-image`：從 Supabase 題庫取得一張圖片，確認 Gemini 回傳非空描述。

Smoke test 會使用網路與 Gemini 額度，不包含在一般的 `npx playwright test` 中。
