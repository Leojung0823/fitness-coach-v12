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

## 信件連結設定（hosted 專案必做）

`@supabase/ssr` 強制使用 PKCE，而 PKCE 的 code verifier 只存在**發出請求的那個瀏覽器**。用預設信件範本時，重設密碼連結帶回來的是一個 PKCE code，所以「在電腦按忘記密碼、用手機收信」一定失敗——而且是在使用者填完新密碼、按下儲存之後才失敗。

本機開發已經在 `supabase/config.toml` 設好，hosted 專案要在 Dashboard 手動做兩件事：

**1. Authentication → URL Configuration → Redirect URLs**

```
https://coach-note-rho.vercel.app/**
```

必須是 `/**` 結尾。只寫網域（沒有萬用字元）代表「只允許這個網址本身」，任何帶路徑的 redirect 都會被拒絕，然後 **靜默地** 換成 Site URL——使用者會被丟到首頁再被導去登入頁，看起來像連結壞掉。

**2. Authentication → Email Templates**

兩個範本都要換掉，內容分別在 `supabase/templates/` 底下：

| Dashboard 範本 | 檔案 |
| --- | --- |
| Reset Password | `supabase/templates/recovery.html` |
| Confirm signup | `supabase/templates/confirmation.html` |

關鍵都一樣：連結要用 `{{ .TokenHash }}`。

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">
  設定新密碼
</a>
```

token hash 把驗證所需的東西全部放在連結裡，因此在任何裝置都能完成。程式端 `/auth/callback` 兩種形式都收，所以在範本改好之前也不會壞掉，只是換裝置時會顯示「連結無效」而不是成功。

> **另外請確認 Authentication → Providers → Email 的 Confirm email 設定。**
> 目前 hosted 專案是 `mailer_autoconfirm: true`（信箱驗證關閉），代表任何人可以用**任何一個不屬於自己的 Email** 註冊並立即取得帳號與新組織。開啟驗證之前要先完成上面兩項，否則確認信的連結會遇到同一個問題。
>
> 本機 `config.toml` 的 `enable_confirmations` 已經設為 `true`，好讓確認信這條路在開發時就會被走到，而不是上線後才發現。信會進 Mailpit（見上面的連線資訊表），點一下就完成。

## 資料庫驗證

每個 Organization-scoped 資料表都必須通過 RLS 跨組織隔離驗證（`ARCHITECTURE.md` §7 的硬性規定）。驗證腳本包在一個交易裡、最後自動 rollback，可以重複執行不留垃圾資料：

```bash
docker exec -i supabase_db_fitness-coach-v12 psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < supabase/verification/rls_organization_isolation.sql
```

（腳本用 stdin 導入；`-f` 會在容器裡面找檔案，而 repository 沒有掛載進容器。）

驗證涵蓋：`clients`、`workout_sessions`、`workout_exercises`、`workout_sets`、自訂 `exercises` 的跨組織讀寫拒絕；未登入（anon）完全無法存取；以及正向測試（同組織內的正常存取仍然可以運作）。

## CI

`.github/workflows/ci.yml` 在每次 push 到 `main` 與每個 PR 上跑：

| 工作 | 內容 |
| --- | --- |
| Typecheck, lint, build | `npm run typecheck` / `lint` / `build` |
| RLS verification | 起一個 Supabase、套 migration、跑 `supabase/verification/rls_organization_isolation.sql`，再跑 `db lint` |

第二項的存在理由很具體：那支驗證腳本是這個專案唯一檢查跨組織隔離的東西，而它曾經**紅了兩個星期沒有人發現**（動作庫從 60 擴到 460 之後，寫死的斷言就失效了）。只有人記得手動跑的檢查，等於沒有檢查。

CI 不會部署任何東西 —— 部署是下面那個腳本，要手動跑。

## 部署上線

```bash
./scripts/deploy-prod.sh
```

**資料庫先、前端後**，腳本就是照這個順序跑，中間會問一次資料庫密碼（Dashboard → Settings → Database；輸入時不顯示，不要寫在指令列上）。跑完會自己確認線上真的換版了。

反過來做會出事：新版前端呼叫的函式如果還沒進資料庫，一分鐘前還正常的畫面會直接報錯。先套資料庫是安全的 —— 舊版前端不會呼叫新函式。

> Vercel 專案目前**沒有接 GitHub**：push 到 `main` 不會觸發任何部署，只有跑上面這個腳本才會。要改成 push 即部署，到 Vercel → 專案 → Settings → Git 接上 repository；接上之後這個腳本就只剩 migration 那一段有用。

## 建置

```bash
npm run build   # production build
npm run lint    # eslint
```

## 四個分頁

底部導覽是教練單手操作的主要入口，四格對應四件不同的事：

| 分頁 | 路徑 | 內容 |
| --- | --- | --- |
| 首頁 | `/home` | 今天的課（草稿可一鍵繼續）、本週課程與學員數 |
| 學員 | `/clients` | 完整名冊：搜尋、已封存、新增，進入學員檔案 |
| 訓練 | `/training` | 依最近上課排序的捷徑，**直接跳到該學員的訓練紀錄** |
| 我的 | `/account` | 姓名、工作區、登入 Email、登出 |

「訓練」和「學員」看似重複，差別在目的地：學員頁是完整名冊、進入的是學員檔案；訓練頁是「最近在練的人」，一點就到訓練紀錄——教練帶課中要的是後者，少一次點擊。

原本在學員頁右上角的 👤 選單已移除，登出改由「我的」提供，避免兩個地方做同一件事。

## 訓練紀錄（教練帶課時看的那一頁）

學員頁的「訓練紀錄」分頁以**動作**為單位，不是以日期為單位：教練在場邊要問的是「這個學員上次深蹲做多少」，而不是「8/21 那堂課做了什麼」。

三條規則寫在 `supabase/migrations/20260826000100_training_records.sql` 裡，這裡記下**為什麼**：

- **最新重量 = 那次課裡最重的「已完成」組**，沒有任何一組被打勾時才退回看所有已登錄的組。組數用同一條規則數，兩個數字因此永遠在描述同一批組。草稿狀態的課也答得出來，因為教練往往邊做邊記、最後才補打勾。
- **「上次比較」比的是上一次的那堂課**，不是同一堂課裡的前一個 block。同一個動作在一堂課裡做兩次是允許的（schema 刻意不設唯一鍵），所以 occurrence 以「課」為單位聚合。第一次做這個動作時顯示「首次」而不是 0 —— 沒得比跟沒進步是兩件事。
- **快速新增會沿用當天已存在的課**，沒有才開一堂。教練一小時內記三個動作是同一堂課；拆成三堂會讓學員的堂數統計失真。

肌群篩選（胸／背／腿／肩／手臂／核心）由 `muscle_filter_key()` 把參考資料的兩層樹（闊背肌在背下面、股四頭在腿下面）收斂成畫面上的六個按鈕；沒有練過的分類不會出現，所以按下去不會得到空清單。

## 已知限制 / 未涵蓋範圍

- `favorite_exercises` 資料表已建立（含 RLS），但依 PRD §7.4／§10.14 沒有做 V1 前端介面。
- 訓練紀錄的快速新增寫入的是「N 組同重量」，不是逐組不同重量；要記不同重量仍走課程頁逐組輸入。
- 設計稿裡的四格底部導覽（首頁／學員／訓練／我的）沒有實作：其中兩格目前沒有對應頁面，而「訓練」作為全域分頁需要先決定它指的是哪一位學員。
- `workout_sets` 的 `rpe`／`rir`／`duration_seconds`／`distance_value`／`distance_unit` 欄位存在但 V1 介面不提供輸入（依 PRD §7.6 只用 weight/reps/is_completed）。
- 課程紀錄頁的「即時儲存」是每次操作立即呼叫 Supabase（weight/reps 變更有約 350ms debounce 避免連點造成過多請求），而非完整的本地端優先＋背景同步佇列；本機 Supabase 延遲極低，實測操作感受是即時的，但嚴格來說不是 PRD §14 描述的「本機資料庫＋離線佇列」離線架構。
- 沒有做多教練協作情境下的即時（realtime）畫面同步（例如兩位教練同時開著同一堂課）。
- 忘記密碼信件走本機 Mailpit（假信箱），不會真的寄到教練的 Email。
- PRD §21 明確排除的功能（預約、堂數方案、收款、飲食紀錄、AI 課表、學員登入等）完全未實作，符合第一版範圍。
