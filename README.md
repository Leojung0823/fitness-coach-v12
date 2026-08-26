# Coach Note

健身教練營業管理 App — V1 MVP。讓教練用最少打字、最少步驟，在授課過程中快速記錄學員的訓練動作、重量、次數與組數。

完整產品需求見 [`docs/PRD.md`](docs/PRD.md)；資料/權限/多租戶的強制架構規則見 [`ARCHITECTURE.md`](ARCHITECTURE.md)。

## 技術棧（與 PRD §15 的差異說明）

`docs/PRD.md` §15 原本建議 Flutter，但 **V1 實際採用 Next.js + Supabase**，原因是本機環境沒有安裝 Flutter/Xcode/Android 工具鏈，且需要當天完成可在瀏覽器測試的版本。資料模型、RLS 權限規則與點選優先的互動需求完全不變（詳見 `ARCHITECTURE.md` 與 `docs/PRD.md` §15 內的說明註記）。

實際使用的技術：

- **前端**：Next.js 15（App Router、TypeScript）、React 18，行動優先（mobile-first）響應式網頁，無外部 UI 套件（手刻 CSS，見 `src/app/globals.css`）
- **後端 / 資料庫**：Supabase（本機開發用 `npx supabase`）— PostgreSQL、Row Level Security、Supabase Auth
- **資料存取層**：`@supabase/supabase-js` + `@supabase/ssr`，所有資料存取都經過 `src/lib/repositories/*`（元件不直接呼叫 supabase-js）
- **語言**：介面文字全部繁體中文，集中管理於 `src/lib/strings.ts`

## 專案結構

```
supabase/
  migrations/       -- 資料庫 schema、RLS policy、權限 helper function、RPC
  seed.sql          -- 動作分類／肌群／器材／約 60 個系統動作
  verification/      -- 可重複執行的 RLS 驗證 SQL（跨組織隔離）
src/
  app/              -- Next.js App Router 頁面
  components/       -- 共用 UI 元件
  lib/
    repositories/   -- 資料存取層（ClientRepository、WorkoutRepository...）
    supabase/       -- Supabase client（browser / server / middleware）
    strings.ts      -- 集中管理的繁體中文文案
```

## 首次設定

需求：Node.js 20+、Docker（本機跑 Supabase 用）。

```bash
# 1. 安裝套件
npm install

# 2. 啟動本機 Supabase（第一次會下載 Docker image，可能需要幾分鐘）
npx supabase start

# 3. 套用 migration + seed data
npx supabase db reset --local

# 4. 設定環境變數
cp .env.example .env.local
```

`npx supabase start` 執行完會印出一組本機金鑰與連線資訊，把裡面的 `anon key`（或用下面指令查詢）填進 `.env.local` 的 `NEXT_PUBLIC_SUPABASE_ANON_KEY`：

```bash
npx supabase status -o env
```

`.env.local` 已加入 `.gitignore`，不會被提交。`.env.example` 只放公開的本機預設值（anon key 本來就設計成可以曝露在瀏覽器端，真正的安全邊界是資料庫 RLS，不是這把 key）。

```bash
# 5. 啟動開發伺服器
npm run dev
```

開啟 http://localhost:3000 即可註冊帳號、開始使用。

### 本機連線資訊（預設 port，已避開常見的 54321 系列以免與其他專案衝突）

| 服務 | 位址 |
| --- | --- |
| Next.js App | http://127.0.0.1:3000 |
| Supabase Studio（資料庫管理介面） | http://127.0.0.1:55323 |
| Supabase API (REST/Auth) | http://127.0.0.1:55321 |
| Postgres 資料庫 | `postgresql://postgres:postgres@127.0.0.1:55322/postgres` |
| Mailpit（本機測試信箱，收忘記密碼信件用） | http://127.0.0.1:55324 |

實際 port 以 `supabase/config.toml` 為準，若跟你機器上其他專案衝突可自行調整。

## 今晚用手機測試

Next.js 開發伺服器預設會監聽所有網路介面，所以同一個 Wi-Fi 下的手機可以直接連。

1. 確認電腦跟手機在**同一個 Wi-Fi**。
2. 在電腦上查詢區網 IP：

   ```bash
   ipconfig getifaddr en0
   ```

   （若電腦用 Wi-Fi 以外的網卡連線，把 `en0` 換成對應的網卡名稱，例如 `en1`。）

3. 手機瀏覽器開啟 `http://<你查到的IP>:3000`，例如 `http://192.168.1.23:3000`。

這只是本機區網測試，不是公開部署 —— 離開這個 Wi-Fi、或電腦上的 `npm run dev` / `npx supabase start` 一停掉，手機就連不上了。

## 資料庫驗證

每個 Organization-scoped 資料表都必須通過 RLS 跨組織隔離驗證（`ARCHITECTURE.md` §7 的硬性規定）。驗證腳本包在一個交易裡、最後自動 rollback，可以重複執行不留垃圾資料：

```bash
docker exec -i supabase_db_fitness-coach-v12 psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < supabase/verification/rls_organization_isolation.sql
```

（腳本用 stdin 導入；`-f` 會在容器裡面找檔案，而 repository 沒有掛載進容器。）

驗證涵蓋：`clients`、`workout_sessions`、`workout_exercises`、`workout_sets`、自訂 `exercises` 的跨組織讀寫拒絕；未登入（anon）完全無法存取；以及正向測試（同組織內的正常存取仍然可以運作）。

## 建置

```bash
npm run build   # production build
npm run lint    # eslint
```

## 已知限制 / 未涵蓋範圍

- `favorite_exercises` 資料表已建立（含 RLS），但依 PRD §7.4／§10.14 沒有做 V1 前端介面。
- `workout_sets` 的 `rpe`／`rir`／`duration_seconds`／`distance_value`／`distance_unit` 欄位存在但 V1 介面不提供輸入（依 PRD §7.6 只用 weight/reps/is_completed）。
- 課程紀錄頁的「即時儲存」是每次操作立即呼叫 Supabase（weight/reps 變更有約 350ms debounce 避免連點造成過多請求），而非完整的本地端優先＋背景同步佇列；本機 Supabase 延遲極低，實測操作感受是即時的，但嚴格來說不是 PRD §14 描述的「本機資料庫＋離線佇列」離線架構。
- 沒有做多教練協作情境下的即時（realtime）畫面同步（例如兩位教練同時開著同一堂課）。
- 忘記密碼信件走本機 Mailpit（假信箱），不會真的寄到教練的 Email。
- PRD §21 明確排除的功能（預約、堂數方案、收款、飲食紀錄、AI 課表、學員登入等）完全未實作，符合第一版範圍。
