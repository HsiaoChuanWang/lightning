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

```sh
npm run lint
```

## 端對端測試（Playwright）

E2E 測試放在 `e2e/` 目錄。Playwright 會依照設定自動啟動 Vite 開發伺服器，因此不需要在另一個終端機手動執行 `npm run dev`。

請在專案根目錄選擇以下其中一個指令：

```sh
# 在背景執行全部 E2E 測試
npx playwright test

# 顯示瀏覽器並執行全部 E2E 測試
npx playwright test --headed

# 開啟 Playwright 互動介面，適合開發與除錯
npx playwright test --ui
```

以上指令只需要選擇一個。一般開發流程如下：

1. 在專案根目錄開啟一個終端機。
2. 執行 `npx playwright test --ui`。
3. 在 Playwright UI 中選擇並執行測試案例。

開啟最近一次測試產生的 HTML 報告：

```sh
npx playwright show-report
```

### 同時觀看真人對戰的兩位玩家

先關閉 Playwright UI，再使用有畫面的模式執行真人對戰測試：

```sh
npx playwright test 01-winner-rematch.spec.ts --project=chromium --headed
```

這項測試會建立兩個獨立的 Chromium 瀏覽器環境。測試使用固定 UUID，因此重複執行時會沿用相同的測試帳號，不會持續新增使用者資料。兩個視窗可能彼此重疊，可以將它們排列在螢幕左右兩側，同時觀看兩位玩家完成同一場對戰。想觀看兩個實際瀏覽器視窗時，請勿加上 `--ui`。

### E2E 情境清單

| 測試檔 | 驗證情境 |
| --- | --- |
| `01-winner-rematch.spec.ts` | 真人完成五回合，贏家邀請輸家並成功再戰 |
| `02-loser-rematch.spec.ts` | 真人完成五回合，輸家邀請贏家並成功再戰 |
| `03-tie-reject-rematch.spec.ts` | 真人五回合平手，一方邀請且另一方拒絕再戰 |
| `04-human-disconnect.spec.ts` | 真人完成第一回合後於第二回合掉線，線上玩家收到 Modal 並回登入頁 |
| `05-phantom-match.spec.ts` | 匹配 Phantom 並完成五回合 |
| `06-ai-match.spec.ts` | AI 描述 API 失敗時使用 Supabase 標準答案並完成五回合 |
| `07-error-modal.spec.ts` | API 錯誤時顯示 Error Modal、返回登入頁並可關閉 Modal |

只執行單一測試檔：

```sh
npx playwright test 02-loser-rematch.spec.ts --project=chromium --headed
```

依序執行全部七種情境：

```sh
npx playwright test --project=chromium
```

所有情境共用配對池與固定測試帳號，因此 Playwright 已設定為單一 worker，不可平行執行。完整套件包含多場五回合對戰，執行時間會較長。

一般作答會在每回合隨機等待 1～9 秒後送出，模擬不同玩家的思考時間。平手測試會固定雙方寫入的作答時間與 bonus，避免瀏覽器毫秒差改變勝負。

掉線測試保留正式流程的 3 秒重新連線寬限；確認掉線後，Error Modal 會在測試中停留 2 秒，再按下 `OK` 顯示登入頁。

Phantom 測試需要測試資料庫中存在可供重播的完整已完成對戰。AI 測試會模擬沒有可用 Phantom 候選，並強制圖片描述 API 失敗，驗證程式改用 Supabase 題庫中的標準答案後仍可完成五回合。

建議 E2E 使用獨立的 Supabase 測試專案。固定帳號可以避免無限新增使用者，但比賽、回合與再戰邀請仍會寫入資料庫，正式環境不適合重複執行完整套件。

目前尚未加入「掉線後在三秒寬限期內恢復連線」的 E2E。遊戲中的 Pinia 狀態尚未支援重新開頁後恢復，而且短暫切換瀏覽器離線不保證 Supabase Presence 在三秒內送出 leave；在加入進行中比賽的 session 恢復機制後，再測此情境會比較可靠。

如果目前電腦尚未安裝 Playwright 瀏覽器，請執行：

```sh
npx playwright install
```

### 真實 API Smoke Test

一般 7 條 E2E 會控制 AI 回應，以穩定驗證遊戲流程。需要確認本機 API、Gemini 金鑰與真實服務串接時，另外執行：

```sh
npm run test:api
```

此指令會自動啟動本機 API server，並執行：

- `/api/vectors`：確認回傳兩組有效且同維度的向量。
- `/api/describe-image`：從 Supabase 題庫取得一張圖片，確認 Gemini 回傳非空描述。

Smoke test 會實際使用 Gemini 額度與網路，不包含在一般 `npx playwright test` 中。
