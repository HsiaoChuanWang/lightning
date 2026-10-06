# 專案架構

## 目錄結構

```text
Lightning/
├─ api/                                      # 部署至 Vercel 的 Serverless Functions
│  ├─ describe-image.js
│  └─ vectors.js
├─ server/                                   # 僅供本機開發使用的 API 伺服器
│  └─ dev-server.js
├─ e2e/                                      # Playwright 端對端測試
│  ├─ 01-winner-rematch.spec.ts
│  ├─ 02-loser-rematch.spec.ts
│  ├─ 03-tie-reject-rematch.spec.ts
│  ├─ 04-human-disconnect.spec.ts
│  ├─ 05-phantom-match.spec.ts
│  ├─ 06-ai-match.spec.ts
│  ├─ 07-error-modal.spec.ts
│  └─ support/
│     └─ game.ts                             # 玩家、配對、作答與共用等待 helper
├─ smoke/
│  └─ api/                                   # 真實 Gemini API smoke tests
│     ├─ describe-image-api.spec.ts
│     └─ vectors-api.spec.ts
├─ src/
│  ├─ assets/                                # 圖片、圖示及全域樣式
│  │  ├─ icons/
│  │  ├─ images/
│  │  └─ styles/
│  ├─ components/
│  │  ├─ common/                             # 跨頁面共用的業務元件
│  │  └─ ui-components/                      # Button、Input、Modal 等基礎 UI 元件
│  ├─ composables/
│  │  ├─ useDisposableTimers.ts              # 統一清理 timer、動畫影格與可取消 delay
│  │  ├─ useMatchFlowSync.ts                  # 唯讀同步 Supabase phase、資料與對應頁面
│  │  └─ usePageGuard.ts                     # 跨頁面共用的路由保護與安全導頁流程
│  ├─ config/
│  │  ├─ app.ts                              # 版本等應用程式設定
│  │  ├─ game.ts                             # 回合數、作答時間等遊戲設定
│  │  └─ timing.ts                           # 動畫、輪詢與流程延遲時間
│  ├─ layouts/                               # 版型
│  ├─ lib/                                   # 第三方服務初始化，例如 Supabase Client
│  ├─ mappers/                               # Database Record 轉換成前端 Domain Model
│  ├─ router/                                # Vue Router 設定
│  ├─ services/                              # Supabase、RPC、後端 API 等外部資料存取
│  ├─ stores/                                # Pinia 狀態與該 Store 專用的 Domain Type
│  ├─ types/                                 # 跨模組使用的 TypeScript 型別與資料庫 Record
│  ├─ utils/                                 # 不依賴 Vue、Router 或外部服務的共用純函式
│  ├─ views/
│  │  ├─ GameResultView/
│  │  │  ├─ components/
│  │  │  │  └─ PlayAgainModal.vue
│  │  │  ├─ composables/
│  │  │  │  ├─ useRematch.ts
│  │  │  │  └─ useRevengeRealtime.ts
│  │  │  └─ GameResultView.vue
│  │  ├─ GameView/
│  │  │  ├─ components/
│  │  │  │  ├─ DescribeSection.vue
│  │  │  │  ├─ InputCard.vue
│  │  │  │  └─ QuestionSection.vue
│  │  │  ├─ composables/
│  │  │  │  ├─ useOpponentRoundRealtime.ts
│  │  │  │  └─ useRoundGameplay.ts
│  │  │  └─ GameView.vue
│  │  ├─ LoginView/
│  │  │  ├─ composables/
│  │  │  │  ├─ useEntryAnimation.ts
│  │  │  │  └─ useOpponentMatching.ts
│  │  │  └─ LoginView.vue
│  │  ├─ RoundResultView/
│  │  │  ├─ components/
│  │  │  │  └─ PlayerScoreRow.vue
│  │  │  └─ RoundResultView.vue
│  │  ├─ RoundStartView/
│  │  │  ├─ composables/
│  │  │  │  └─ useRoundPreparation.ts
│  │  │  └─ RoundStartView.vue
│  │  └─ StartChallengeView/
│  │     ├─ components/
│  │     │  ├─ InfoCard.vue
│  │     │  └─ PlayerCard.vue
│  │     ├─ composables/
│  │     │  └─ useChallengePreparation.ts
│  │     └─ StartChallengeView.vue
│  ├─ App.vue
│  └─ main.ts
├─ supabase/
│  └─ migrations/                            # Match 後端狀態機、時間設定與 Cron
├─ .env.local
├─ CHANGELOG.md                              # 版本異動紀錄
├─ GAME_FLOW.md                              # 完整遊戲流程、狀態機與頁面導覽
├─ playwright.config.ts                      # E2E 瀏覽器、worker 與開發伺服器設定
├─ playwright.smoke.config.ts                # 真實 API smoke test 與本機 API server 設定
├─ README.md                                 # 安裝、開發與 E2E 執行說明
├─ env.d.ts
├─ index.html
├─ package.json
├─ vite.config.ts
└─ vercel.json
```

## 流程與狀態文件

完整的登入配對、Match、回合、計分、結算、再戰及離開流程集中記錄於 [`GAME_FLOW.md`](./GAME_FLOW.md)。本文件負責說明程式碼結構與各層職責；流程或狀態改動時，應同步更新 `GAME_FLOW.md`。

Playwright 使用七個獨立 spec 對應七種主要流程；共用的固定測試玩家、雙瀏覽器配對、隨機作答時間與操作停留集中於 `e2e/support/game.ts`。測試共用 Supabase 資料，因此設定為單一 worker 依序執行。

`smoke/api/` 直接呼叫本機 API 與真實 Gemini，獨立使用 `playwright.smoke.config.ts`，不會隨一般 E2E 自動執行。

## 各層職責

依照負責的工作分類。

### Component / View

負責畫面結構與使用者操作入口：

- template 與樣式
- 組合子元件
- 提供 template 使用的顯示資料
- 將按鈕、輸入等事件交給 composable
- 少量只服務目前 template 的簡單事件轉接

Component 不應直接包含大量資料庫查詢、輪詢、Realtime 訂閱或跨頁面流程。

### Composable

負責 Vue 畫面或功能流程的組織：

- 使用 `ref`、`computed`、`watch` 等 Vue 響應式狀態
- 使用 `onMounted`、`onBeforeUnmount` 管理生命週期
- 組合多個 service 完成一段流程
- 更新 Pinia Store
- 控制 Modal、動畫、計時器與 Router 導頁
- 建立及清除 Realtime 訂閱

只有單一 View 使用的 composable，放在該 View 的 `composables/`。多個頁面共同使用的 Vue 流程放在 `src/composables/`，例如 `usePageGuard`。

範例：

- `useOpponentMatching` 組織真人、Phantom、AI 的配對順序。
- `useRoundGameplay` 管理倒數、自動 submit、計分與答案揭曉。
- `useRevengeRealtime` 管理再戰邀請的 Realtime 生命週期。

### Service

負責與外部資料來源溝通：

- Supabase 資料查詢、新增及更新
- 呼叫 Supabase RPC
- 呼叫後端 HTTP API
- 處理外部服務回傳的錯誤
- 回傳資料或 Domain Model 給 composable 使用

Service 不應控制 Vue template、Modal、Router，也不應管理 Vue Component 的生命週期。

範例：

- `roundService.findRound()` 只負責從 Supabase 查詢指定回合。
- `opponentMatchingService.matchHuman()` 呼叫配對 RPC 並回傳配對結果。
- `scoringService.fetchVectors()` 呼叫向量評分 API。

### Mapper

負責資料庫格式與前端 Domain Model 之間的轉換，例如：

- `match_id` 轉成 `matchId`
- `submitted_at` 轉成 `submittedAt`

資料欄位轉換統一放在 `mappers/`，避免每個 View、Composable 或 Service 重複實作。

### Store

負責跨元件或跨頁面需要共享的前端狀態：

- 目前使用者及對手
- Match、Round、Quiz、Revenge 狀態
- 全域 Modal 狀態

只有某個 Store 使用的 Domain Type 保留在該 Store；資料庫原始 Record Type 放在 `types/database.ts`。

### Utils

負責不依賴 Vue 畫面及外部資料來源的共用邏輯：

- 純計算或格式化函式
- 通用 helper

如果函式會讀寫 Supabase 或後端 API，它不屬於 utils，應放在 services。

### Config

負責集中管理應用程式版本、遊戲規則與流程時間常數，避免在多個檔案中出現無法辨識用途的 magic number。

## Function 放置判斷

```text
這個 function 是否主要負責外部資料存取？
├─ 是 → services/
└─ 否
   ├─ 是否依賴 Vue 響應式狀態、生命週期或組織畫面流程？
   │  ├─ 是 → 單一頁面使用時放 ViewName/composables/；跨頁面共用時放 src/composables/
   │  └─ 否
   │     ├─ 是否為跨模組使用的純函式？
   │     │  ├─ 是 → utils/
   │     │  └─ 否 → 留在使用它的 Component
```

例子：

| Function               | 放置位置                 | 原因                                    |
| ---------------------- | ------------------------ | --------------------------------------- |
| `findRound()`          | `roundService.ts`        | 單純查詢 Supabase。                     |
| `waitForHumanRounds()` | `useRoundPreparation.ts` | 輪詢 service、更新 Store 並控制導頁流程 |
| `sendRevengeRequest()` | `revengeService.ts`      | 讀寫再戰邀請資料                        |
| `handlePlayAgain()`    | `useRematch.ts`          | 處理按鈕流程、呼叫 service 並控制 Modal |
| `formatTime()`         | `utils/helpers.ts`       | 不依賴 Vue 或外部服務的共用格式化函式   |

## 依賴方向

```text
Component / View
        ↓
    Composable
      ↓     ↓
  Service  Store
      ↓
Mapper / Supabase / Backend API
```

- View 可以使用 composable、Store、utils 與顯示元件。
- Composable 可以組合 service、Store、utils 及 Router。
- Service 可以使用 Supabase Client、mapper 與資料型別。
- Service 不反向依賴 View 或 composable。
- Mapper、types 與 utils 不應依賴特定 View。

## 一致性規則

1. 每個路由頁面統一使用 `views/ViewName/ViewName.vue`。
2. 頁面專屬元件放在 `views/ViewName/components/`。
3. 頁面專屬流程放在 `views/ViewName/composables/`，檔名以 `use` 開頭。
4. Supabase、RPC 與 HTTP API 存取統一放在 `services/`。
5. 資料庫欄位轉換統一放在 `mappers/`。
6. 跨頁面共享狀態統一放在 Pinia `stores/`，不要為了縮短 Component 而把暫時狀態放進 Store。
7. 相同責任採用相同拆分方式；不因單一檔案較短就改用另一套分類規則。
8. 不為只有幾行且只服務 template 的函式過度拆檔。
9. 每個對外 function 加上說明其目的的註解；Realtime function 需說明監聽的資料表、事件及用途。

## 命名規則

命名以識別字在架構中的用途為準，不單純依 `const`、`let` 等宣告方式判斷。縮寫視為一般單字，例如 `userId`、`aiResponse`、`quizUrl`，不寫成 `userID`、`AIResponse`、`quizURL`。

| 類型 | 規則 | 範例 |
| --- | --- | --- |
| Vue Component 與 Component 檔名 | PascalCase | `PlayerInfo`、`PlayerInfo.vue`、`GameResultView.vue` |
| TypeScript interface、type、class | PascalCase | `Match`、`MatchStatus`、`RoundRealtimeRecord` |
| 一般變數、參數與 function | camelCase | `matchId`、`currentRound`、`acceptMatch()` |
| Composable | `use` + PascalCase | `useOpponentMatching()`、`usePageGuard()` |
| 共享設定值與不變的業務常數 | UPPER_SNAKE_CASE | `TOTAL_ROUNDS`、`MATCH_SEARCH_TIMEOUT_MS` |
| API、RPC、資料庫 Record 與後端 payload 欄位 | lower_snake_case | `match_id`、`player_one_id`、`submitted_at` |
| CSS class、route path 與 HTML attribute | kebab-case | `player-card`、`start-challenge`、`aria-label` |
| 一般 TypeScript／JavaScript 模組檔名 | camelCase | `matchService.ts`、`supabaseClient.ts` |

### 常數與一般 `const` 的區分

`const` 只代表 binding 不會重新賦值，不表示名稱一定要使用 UPPER_SNAKE_CASE。以下仍使用 camelCase：

- Vue 的 `ref`、`computed`、Store instance，例如 `remainingTime`、`matchStore`。
- function、Composable、Pinia store factory，例如 `safePush`、`useMatchStore`。
- Client、service response 或執行階段計算結果，例如 `supabase`、`currentQuiz`。

只有跨模組共用、代表固定設定或不變業務規則的值使用 UPPER_SNAKE_CASE，並優先集中於 `src/config/`。

### 前後端命名邊界

lower_snake_case 只保留在 API／資料庫邊界，例如：

- `src/types/database.ts` 的 Database Record。
- Supabase 的 `.select()`、`.eq()`、`.insert()`、`.update()` 欄位。
- RPC 參數及 Realtime payload 的原始欄位。

資料進入前端 Domain Model 時，必須透過 mapper 或明確轉換改為 camelCase。View、Component、Store 與一般 composable 不應自行建立新的 lower_snake_case 前端狀態。

### 允許的例外

- `_to`、`_from` 等前置底線參數表示 callback 規格要求但目前未使用的參數。
- `api/` 下直接對應 endpoint 的檔名可以採用 kebab-case，例如 `describe-image.js`。
- 環境變數沿用平台慣例使用 UPPER_SNAKE_CASE，例如 `VITE_SUPABASE_URL`。
- 第三方 API 固定的名稱維持原樣，不為符合本專案規則而改寫。

## Script 書寫順序

`import` 一律放在 `<script setup>` 最前面。
元件若有 `defineProps`、`defineEmits` 或 `defineModel`，接著宣告元件介面；其餘內容統一依照以下順序：

1. Stores、Router
2. `storeToRefs`
3. `ref`、`reactive`
4. `computed`
5. 一般與 async functions
6. `watch`、`watchEffect`
7. Lifecycle，例如 `onMounted`、`onBeforeUnmount`
8. Composable 最後回傳的 `return`

Composable 內部也使用相同順序。若同類 lifecycle 之間存在執行順序依賴，整理時必須保留原本的相對順序。

## API

- `/api/describe-image`：使用 Gemini 根據圖片產生描述。
- `/api/vectors`：產生文字向量，供答案相似度計算使用。

正式部署到 Vercel 後，由 Vercel 執行 `api/` 中的 Serverless Functions 並呼叫 Gemini API。
本機開發時，`server/dev-server.js` 會啟動後端伺服器，接收 Vue 前端請求並呼叫 Gemini API。
