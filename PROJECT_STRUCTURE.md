# 專案架構

## 目錄結構

```text
Lightning/
├─ api/                                      # 部署至 Vercel 的 Serverless Functions
│  ├─ describe-image.js
│  └─ vectors.js
├─ server/                                   # 僅供本機開發使用的 API 伺服器
│  └─ dev-server.js
├─ src/
│  ├─ assets/                                # 圖片、圖示及全域樣式
│  │  ├─ icons/
│  │  ├─ images/
│  │  └─ styles/
│  ├─ components/
│  │  ├─ common/                             # 跨頁面共用的業務元件
│  │  └─ ui-components/                      # Button、Input、Modal 等基礎 UI 元件
│  ├─ composables/
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
├─ .env.local
├─ env.d.ts
├─ index.html
├─ package.json
├─ vite.config.ts
└─ vercel.json
```

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
