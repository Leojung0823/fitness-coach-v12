# 健身教練營業管理 App

# AI 開發企劃書暨產品需求文件 PRD

**文件版本：V1.0**
**產品階段：MVP**
**專案暫定名稱：Coach Note**
**主要語言：繁體中文**
**目標平台：iOS、Android**

---

# 一、專案概述

## 1.1 專案目的

開發一款提供健身教練使用的行動 App，讓教練可以在授課過程中，快速記錄每位學員的訓練課表。

第一版不追求完整的健身房營運功能，而是專注完成最重要的核心需求：

> 讓教練以最少打字、最少步驟，快速記錄學員當天的訓練動作、重量、次數及組數。

雖然第一版功能精簡，但系統必須使用正式的雲端資料庫，並建立可持續擴充的資料架構，以支援未來加入：

* 多位教練
* 健身工作室或健身房
* 課程預約
* 購課與剩餘堂數
* 收款與營收管理
* 學員登入
* 體態紀錄
* 訓練分析
* AI 課表建議
* 教練團隊權限
* SaaS 訂閱方案

---

# 二、產品核心定位

Coach Note 是一款以健身教練為主要使用者的訓練紀錄與營業管理系統。

第一版產品定位為：

> 健身教練最快速、最容易使用的學員課表紀錄工具。

本產品不是一般消費者自行訓練使用的健身 App，也不是第一版就涵蓋所有功能的健身房 ERP。

第一版只將「教練記錄學員訓練」做到簡單、穩定、快速。

---

# 三、第一版開發目標

## 3.1 核心目標

第一版必須完成以下核心流程：

1. 教練登入系統。
2. 建立學員資料。
3. 選擇學員。
4. 建立今天的訓練課程。
5. 從動作資料庫選擇訓練動作。
6. 記錄各組重量與次數。
7. 完成並儲存課程。
8. 查看學員過去的訓練紀錄。

## 3.2 操作目標

* 教練可在30秒內建立一份基本課程紀錄。
* 新增一個訓練動作應在3秒內完成。
* 大部分操作使用點選，不使用鍵盤。
* 重量與次數使用快捷選項或加減控制器。
* 新增下一組時，自動複製上一組數值。
* 課程資料應即時儲存，避免意外關閉後遺失。

---

# 四、產品設計原則

## 4.1 點選優先

所有可以透過選擇完成的操作，都不應要求使用者打字。

例如：

* 動作名稱：從動作資料庫選擇。
* 課程日期：由系統自動帶入。
* 重量：使用加減按鈕、滾輪或快捷數值。
* 次數：使用常用次數選項。
* 組數：使用「新增一組」按鈕。
* 肌群：由動作資料自動帶入。

文字輸入僅保留於：

* 學員姓名
* 自訂動作名稱
* 課程備註
* 學員備註

## 4.2 減少操作步驟

每個畫面應有明確的主要任務，不應同時放置過多設定。

## 4.3 單手操作

主要按鈕應配置於畫面下方或拇指容易觸及的位置。

## 4.4 自動儲存

課程進行期間的動作與組數資料應自動儲存為草稿，不應只在按下「完成課程」後才寫入資料庫。

## 4.5 架構先行、功能漸進

第一版不顯示的功能，可以先不開發前端介面，但資料庫關聯必須保留擴充空間。

---

# 五、使用者角色與組織架構

## 5.1 第一版角色

第一版主要角色只有：

### 教練 Coach

權限包括：

* 登入系統
* 管理自己的學員
* 建立訓練課程
* 編輯進行中的課程
* 查看歷史訓練紀錄

第一版不提供學員登入。

## 5.2 未來角色

資料庫必須預留以下角色：

* Owner：工作室或健身房負責人
* Admin：管理員
* Coach：教練
* Staff：行政人員
* Member：學員

## 5.3 多租戶架構

系統應採用多租戶架構。

每一間工作室、健身房或獨立教練，都視為一個 Organization。

所有主要營運資料必須包含：

`organization_id`

確保不同組織之間的資料完全隔離。

即使第一版只有單一教練使用，也不可把資料直接綁死在單一帳號下。

---

# 六、第一版使用流程

## 6.1 首次使用

```text
開啟 App
→ 註冊帳號
→ 建立個人教練工作空間
→ 進入學員列表
→ 新增第一位學員
```

建立帳號後，系統應自動：

1. 建立使用者資料。
2. 建立一個 Organization。
3. 將該使用者設為 Organization Owner。
4. 建立 Organization Member 關聯。

## 6.2 日常課程紀錄

```text
登入
→ 選擇學員
→ 點擊「開始今天課程」
→ 選擇訓練動作
→ 記錄重量與次數
→ 新增下一組
→ 完成課程
```

## 6.3 查看歷史

```text
學員列表
→ 選擇學員
→ 查看歷史課程
→ 選擇日期
→ 查看當天動作、重量、次數及組數
```

---

# 七、第一版功能需求

# 7.1 帳號登入

## 功能內容

* Email 註冊
* Email 登入
* 登出
* 忘記密碼
* 保持登入狀態

## 第一版限制

第一版可先不提供：

* Google 登入
* Apple 登入
* LINE 登入
* 手機簡訊登入

但身份驗證架構應支援未來增加其他登入方式。

## 驗收條件

* 使用者可以建立帳號。
* 使用者可以登入及登出。
* 未登入時不可存取 App 主要頁面。
* 每位使用者只能讀取自己所屬 Organization 的資料。

---

# 7.2 學員管理

## 功能內容

* 新增學員
* 編輯學員
* 封存學員
* 搜尋學員
* 查看學員資料
* 查看最後上課日期

## 學員基本欄位

第一版必填：

* 姓名

第一版選填：

* 暱稱
* 性別
* 出生日期
* 手機
* Email
* 身高
* 體重
* 備註

## 刪除原則

不可直接永久刪除已有訓練紀錄的學員。

應使用：

* `status = active`
* `status = archived`

進行封存。

## 學員列表顯示

每位學員卡片顯示：

* 姓名
* 暱稱
* 最後上課日期
* 累積課程數
* 是否封存

第一版首頁預設只顯示啟用中的學員。

---

# 7.3 建立訓練課程

## 建立方式

在學員頁面點擊：

**開始今天課程**

系統自動建立一筆 Workout Session。

## 自動帶入欄位

* 學員
* 教練
* Organization
* 開始日期
* 開始時間
* 課程狀態

## 課程狀態

Workout Session 必須具有以下狀態：

* `draft`：草稿或進行中
* `completed`：已完成
* `cancelled`：已取消

開始課程後立即建立 `draft`，避免資料遺失。

## 重複課程處理

同一位學員在同一天可以有多堂課，因此不可只使用「學員＋日期」作為唯一值。

---

# 7.4 動作資料庫

## 動作來源

系統需支援兩類動作：

### 系統動作

由平台建立，所有 Organization 均可使用。

### 自訂動作

由個別教練或 Organization 建立，僅該 Organization 可使用。

## 動作欄位

* 中文名稱
* 英文名稱
* 動作分類
* 主要肌群
* 次要肌群
* 使用器材
* 計量方式
* 是否為系統動作
* 是否啟用

## 第一版動作分類

* 胸部
* 背部
* 肩部
* 腿部
* 臀部
* 二頭肌
* 三頭肌
* 核心
* 有氧
* 全身
* 伸展
* 其他

## 第一版器材分類

* 徒手
* 槓鈴
* 啞鈴
* 壺鈴
* 固定式器材
* 滑輪
* 彈力帶
* TRX
* 有氧器材
* 其他

## 動作選擇頁

動作選擇頁應提供：

* 肌群分類
* 最近使用
* 搜尋
* 自訂動作

第一版可以先不做「我的最愛」，但資料庫可預留收藏表。

---

# 7.5 新增訓練動作

## 操作方式

教練點擊「新增動作」後：

1. 選擇肌群。
2. 點選動作。
3. 動作直接加入目前課程。
4. 系統自動建立第一組。

## 預設第一組

新動作加入後，預設建立：

* 重量：0
* 次數：10
* 組別序號：1
* 完成狀態：未完成

若未完成組別不希望直接產生，也可以顯示空白的第一組操作列，但資料庫仍須在使用者變更數值後立即保存。

## 重複動作

同一堂課允許同一個動作被加入兩次，以支援不同訓練區段。

---

# 7.6 組數、重量與次數紀錄

## 每組資料

每一組至少記錄：

* 組別順序
* 重量
* 次數
* 是否完成

## 重量操作

預設不可要求使用者叫出數字鍵盤。

應提供：

* 減少2.5公斤
* 增加2.5公斤
* 點擊數值開啟重量選擇器
* 常用重量快捷選項

重量單位第一版使用公斤：

`kg`

資料庫不可將單位寫死，需保留 `unit` 欄位，以支援未來的：

* kg
* lb
* sec
* min
* meter
* kilometer
* level

重量欄位應使用 decimal，不可只使用 integer，以支援：

* 2.5 kg
* 7.5 kg
* 12.5 kg

## 次數操作

提供常用快捷選項：

* 5
* 6
* 8
* 10
* 12
* 15
* 20

並提供：

* 減少1次
* 增加1次

## 新增一組

點擊「新增一組」後：

* 自動複製上一組重量
* 自動複製上一組次數
* 組別順序加1
* 新組預設為未完成

## 刪除一組

* 允許刪除尚未完成的組。
* 刪除後應重新排列組別順序。
* 第一版可使用軟刪除或直接刪除未完成資料。
* 已完成課程中的組別不應由歷史頁直接編輯。

---

# 7.7 課程完成

## 完成動作

點擊：

**完成課程**

系統執行：

1. 儲存所有未同步資料。
2. 將 Workout Session 狀態改為 `completed`。
3. 寫入結束時間。
4. 計算課程總動作數。
5. 計算課程總組數。
6. 返回學員課程摘要或學員頁。

## 防呆規則

若課程完全沒有任何動作，點擊完成時應提示：

「目前尚未加入任何動作，是否仍要完成課程？」

若已經有動作，不需要二次確認。

---

# 7.8 歷史訓練紀錄

## 學員歷史列表

顯示：

* 課程日期
* 開始時間
* 動作數量
* 組數
* 課程狀態

## 歷史課程內容

顯示：

* 課程日期
* 教練名稱
* 所有訓練動作
* 每組重量
* 每組次數
* 課程備註

第一版歷史資料為只讀。

未來可增加：

* 編輯歷史紀錄
* 複製上一堂課
* 趨勢分析
* 個人最佳紀錄
* 匯出報表

---

# 八、第一版頁面規劃

## 8.1 啟動畫面

內容：

* Logo
* App 名稱

功能：

* 檢查登入狀態
* 初始化本機資料
* 同步必要資料

## 8.2 登入頁

元件：

* Email
* 密碼
* 登入按鈕
* 註冊入口
* 忘記密碼

## 8.3 學員列表頁

元件：

* 頁面標題
* 搜尋列
* 學員卡片列表
* 新增學員按鈕
* 使用者選單

## 8.4 新增或編輯學員頁

元件：

* 姓名
* 暱稱
* 性別
* 出生日期
* 手機
* 身高
* 體重
* 備註
* 儲存按鈕

除姓名外，其餘欄位可以略過。

## 8.5 學員詳情頁

元件：

* 學員姓名
* 開始今天課程
* 最後一次課程
* 歷史課程列表
* 編輯學員

## 8.6 課程紀錄頁

頂部：

* 返回按鈕
* 學員姓名
* 今天日期
* 課程計時

中間：

* 動作卡片列表
* 各組重量與次數
* 新增一組
* 刪除動作

底部固定：

* 新增動作
* 完成課程

## 8.7 動作選擇頁

元件：

* 搜尋列
* 最近使用
* 肌群分類
* 動作列表
* 建立自訂動作

## 8.8 歷史課程詳情頁

元件：

* 日期
* 教練
* 動作列表
* 各組重量與次數
* 備註

內容為只讀。

---

# 九、資料庫架構

建議使用 PostgreSQL。

若使用 Supabase，應使用：

* Supabase Auth
* PostgreSQL
* Row Level Security
* Database Migration
* Supabase Realtime 或標準資料同步
* Edge Functions，僅在必要時使用

所有資料表主鍵建議使用 UUID。

所有主要資料表至少包含：

* `id`
* `created_at`
* `updated_at`

需要保留歷史的資料表應考慮增加：

* `deleted_at`
* `created_by`
* `updated_by`

---

# 十、資料表設計

## 10.1 profiles

儲存系統使用者的公開基本資料。

| 欄位           | 型態          | 說明                |
| ------------ | ----------- | ----------------- |
| id           | uuid        | 對應 Auth User ID   |
| display_name | varchar     | 顯示名稱              |
| phone        | varchar     | 電話                |
| avatar_url   | text        | 頭像                |
| locale       | varchar     | 語言，預設 zh-TW       |
| timezone     | varchar     | 時區，預設 Asia/Taipei |
| created_at   | timestamptz | 建立時間              |
| updated_at   | timestamptz | 更新時間              |

---

## 10.2 organizations

代表獨立教練、健身工作室或健身房。

| 欄位            | 型態          | 說明                      |
| ------------- | ----------- | ----------------------- |
| id            | uuid        | 主鍵                      |
| name          | varchar     | 組織名稱                    |
| type          | varchar     | individual、studio、gym   |
| owner_user_id | uuid        | 擁有者                     |
| status        | varchar     | active、suspended、closed |
| timezone      | varchar     | 時區                      |
| created_at    | timestamptz | 建立時間                    |
| updated_at    | timestamptz | 更新時間                    |

---

## 10.3 organization_members

使用者與組織的關聯。

| 欄位              | 型態          | 說明                      |
| --------------- | ----------- | ----------------------- |
| id              | uuid        | 主鍵                      |
| organization_id | uuid        | 組織                      |
| user_id         | uuid        | 使用者                     |
| role            | varchar     | owner、admin、coach、staff |
| status          | varchar     | active、invited、disabled |
| joined_at       | timestamptz | 加入時間                    |
| created_at      | timestamptz | 建立時間                    |
| updated_at      | timestamptz | 更新時間                    |

唯一索引：

`organization_id + user_id`

---

## 10.4 clients

學員主資料。

避免使用 `members` 作為資料表名稱，以免與組織成員混淆。

| 欄位                | 型態          | 說明              |
| ----------------- | ----------- | --------------- |
| id                | uuid        | 主鍵              |
| organization_id   | uuid        | 所屬組織            |
| assigned_coach_id | uuid        | 主要教練，可為空        |
| full_name         | varchar     | 姓名              |
| nickname          | varchar     | 暱稱              |
| gender            | varchar     | 性別              |
| birth_date        | date        | 出生日期            |
| phone             | varchar     | 手機              |
| email             | varchar     | Email           |
| height_cm         | decimal     | 身高              |
| current_weight_kg | decimal     | 目前體重            |
| note              | text        | 備註              |
| status            | varchar     | active、archived |
| created_by        | uuid        | 建立者             |
| created_at        | timestamptz | 建立時間            |
| updated_at        | timestamptz | 更新時間            |
| deleted_at        | timestamptz | 軟刪除時間           |

索引：

* `organization_id`
* `assigned_coach_id`
* `full_name`
* `status`

---

## 10.5 exercise_categories

動作分類。

| 欄位         | 型態      | 說明   |
| ---------- | ------- | ---- |
| id         | uuid    | 主鍵   |
| code       | varchar | 分類代碼 |
| name_zh_tw | varchar | 中文名稱 |
| name_en    | varchar | 英文名稱 |
| sort_order | integer | 排序   |
| is_active  | boolean | 是否啟用 |

---

## 10.6 muscle_groups

肌群資料。

| 欄位         | 型態      | 說明       |
| ---------- | ------- | -------- |
| id         | uuid    | 主鍵       |
| code       | varchar | 肌群代碼     |
| name_zh_tw | varchar | 中文名稱     |
| name_en    | varchar | 英文名稱     |
| parent_id  | uuid    | 上層肌群，可為空 |
| sort_order | integer | 排序       |
| is_active  | boolean | 是否啟用     |

使用 parent_id 可支援：

* 腿部

  * 股四頭肌
  * 腿後肌
  * 小腿
* 背部

  * 背闊肌
  * 斜方肌

---

## 10.7 equipment_types

器材類型。

| 欄位         | 型態      | 說明   |
| ---------- | ------- | ---- |
| id         | uuid    | 主鍵   |
| code       | varchar | 器材代碼 |
| name_zh_tw | varchar | 中文名稱 |
| name_en    | varchar | 英文名稱 |
| sort_order | integer | 排序   |
| is_active  | boolean | 是否啟用 |

---

## 10.8 exercises

動作主資料。

| 欄位                      | 型態          | 說明                                            |
| ----------------------- | ----------- | --------------------------------------------- |
| id                      | uuid        | 主鍵                                            |
| organization_id         | uuid        | 自訂動作所屬組織；系統動作為空                               |
| category_id             | uuid        | 動作分類                                          |
| primary_muscle_group_id | uuid        | 主要肌群                                          |
| equipment_type_id       | uuid        | 器材                                            |
| name_zh_tw              | varchar     | 中文名稱                                          |
| name_en                 | varchar     | 英文名稱                                          |
| tracking_type           | varchar     | weight_reps、bodyweight_reps、duration、distance |
| default_unit            | varchar     | kg、lb、sec、min、meter                           |
| is_system               | boolean     | 是否為系統動作                                       |
| is_active               | boolean     | 是否啟用                                          |
| created_by              | uuid        | 建立者                                           |
| created_at              | timestamptz | 建立時間                                          |
| updated_at              | timestamptz | 更新時間                                          |
| deleted_at              | timestamptz | 軟刪除                                           |

系統動作：

`organization_id = null`

自訂動作：

`organization_id = 使用者所屬組織`

---

## 10.9 exercise_secondary_muscles

動作與次要肌群的多對多關聯。

| 欄位              | 型態   | 說明   |
| --------------- | ---- | ---- |
| exercise_id     | uuid | 動作   |
| muscle_group_id | uuid | 次要肌群 |

複合主鍵：

`exercise_id + muscle_group_id`

---

## 10.10 workout_sessions

每一次實際訓練課程。

| 欄位                | 型態          | 說明                        |
| ----------------- | ----------- | ------------------------- |
| id                | uuid        | 主鍵                        |
| organization_id   | uuid        | 所屬組織                      |
| client_id         | uuid        | 學員                        |
| coach_user_id     | uuid        | 教練                        |
| session_date      | date        | 課程日期                      |
| started_at        | timestamptz | 開始時間                      |
| completed_at      | timestamptz | 完成時間                      |
| status            | varchar     | draft、completed、cancelled |
| title             | varchar     | 課程名稱，第一版可自動產生             |
| note              | text        | 課程備註                      |
| total_exercises   | integer     | 動作總數                      |
| total_sets        | integer     | 組數總計                      |
| source_session_id | uuid        | 未來複製課程時記錄來源               |
| created_at        | timestamptz | 建立時間                      |
| updated_at        | timestamptz | 更新時間                      |
| deleted_at        | timestamptz | 軟刪除                       |

索引：

* `organization_id`
* `client_id`
* `coach_user_id`
* `session_date`
* `status`

---

## 10.11 workout_exercises

一堂課中的訓練動作。

| 欄位                 | 型態          | 說明   |
| ------------------ | ----------- | ---- |
| id                 | uuid        | 主鍵   |
| workout_session_id | uuid        | 所屬課程 |
| exercise_id        | uuid        | 動作   |
| sort_order         | integer     | 動作順序 |
| note               | text        | 動作備註 |
| created_at         | timestamptz | 建立時間 |
| updated_at         | timestamptz | 更新時間 |
| deleted_at         | timestamptz | 軟刪除  |

不可將 `workout_session_id + exercise_id` 設為唯一，因同一堂課可能重複加入同一動作。

---

## 10.12 workout_sets

每個動作的每一組紀錄。

| 欄位                  | 型態          | 說明                          |
| ------------------- | ----------- | --------------------------- |
| id                  | uuid        | 主鍵                          |
| workout_exercise_id | uuid        | 所屬課程動作                      |
| set_number          | integer     | 第幾組                         |
| set_type            | varchar     | warmup、working、drop、failure |
| weight_value        | decimal     | 重量                          |
| weight_unit         | varchar     | kg、lb                       |
| reps                | integer     | 次數                          |
| duration_seconds    | integer     | 秒數                          |
| distance_value      | decimal     | 距離                          |
| distance_unit       | varchar     | meter、kilometer             |
| rpe                 | decimal     | 未來使用                        |
| rir                 | decimal     | 未來使用                        |
| is_completed        | boolean     | 是否完成                        |
| completed_at        | timestamptz | 完成時間                        |
| note                | text        | 備註                          |
| created_at          | timestamptz | 建立時間                        |
| updated_at          | timestamptz | 更新時間                        |
| deleted_at          | timestamptz | 軟刪除                         |

第一版介面只使用：

* set_number
* weight_value
* weight_unit
* reps
* is_completed

其他欄位保留供未來使用。

---

## 10.13 exercise_usage_stats

教練或組織的動作使用統計。

供未來的「最近使用」與智慧排序使用。

| 欄位              | 型態          | 說明     |
| --------------- | ----------- | ------ |
| id              | uuid        | 主鍵     |
| organization_id | uuid        | 組織     |
| user_id         | uuid        | 教練     |
| exercise_id     | uuid        | 動作     |
| usage_count     | integer     | 使用次數   |
| last_used_at    | timestamptz | 最後使用時間 |
| created_at      | timestamptz | 建立時間   |
| updated_at      | timestamptz | 更新時間   |

唯一索引：

`organization_id + user_id + exercise_id`

---

## 10.14 favorite_exercises

第一版前端可不顯示，但資料表可先建立或在V1.1加入。

| 欄位              | 型態          | 說明   |
| --------------- | ----------- | ---- |
| id              | uuid        | 主鍵   |
| organization_id | uuid        | 組織   |
| user_id         | uuid        | 教練   |
| exercise_id     | uuid        | 動作   |
| sort_order      | integer     | 自訂排序 |
| created_at      | timestamptz | 建立時間 |

---

# 十一、未來擴充資料表規劃

以下資料表第一版可以不建立完整功能，但架構設計不得阻礙未來加入。

## 11.1 課程方案與堂數

未來可能包含：

* service_products
* client_packages
* package_transactions
* session_deductions

支援：

* 單堂課
* 10堂方案
* 20堂方案
* 有效期限
* 剩餘堂數
* 轉讓
* 暫停
* 退費

## 11.2 預約排程

未來可能包含：

* appointments
* coach_availability
* rooms
* appointment_attendees
* cancellation_records

## 11.3 收款與營收

未來可能包含：

* invoices
* payments
* payment_methods
* refunds
* expenses
* commissions

## 11.4 身體數據

未來可能包含：

* body_measurements
* progress_photos
* fitness_assessments
* client_goals

## 11.5 課表模板

未來可能包含：

* workout_templates
* template_exercises
* template_sets

## 11.6 學員登入

未來可將 client 與 auth user 建立關聯：

* `clients.auth_user_id`

但第一版不應強制每位學員註冊帳號。

---

# 十二、資料庫關聯摘要

```text
profiles
  └─ organization_members
       └─ organizations
            ├─ clients
            ├─ exercises（自訂動作）
            ├─ workout_sessions
            │    └─ workout_exercises
            │          └─ workout_sets
            ├─ exercise_usage_stats
            └─ favorite_exercises

exercise_categories
  └─ exercises

muscle_groups
  ├─ exercises
  └─ exercise_secondary_muscles

equipment_types
  └─ exercises
```

---

# 十三、資料安全與權限

## 13.1 Row Level Security

若使用 Supabase，所有營運資料表都必須啟用 RLS。

禁止只依賴前端過濾資料。

## 13.2 基本權限規則

使用者只能讀寫自己所屬 Organization 的資料。

例如，查詢 clients 時，必須確認：

1. 目前登入者存在於 organization_members。
2. organization_members.status 為 active。
3. organization_members.organization_id 與 client.organization_id 相同。

## 13.3 系統動作權限

所有登入使用者可以讀取：

* `is_system = true`
* `is_active = true`

使用者只能修改自己 Organization 建立的自訂動作。

## 13.4 教練權限

第一版可允許同一 Organization 內所有教練查看所有學員。

但程式架構應支援未來切換為：

* 只能查看指派給自己的學員
* 可查看組織全部學員
* 管理者可設定權限

## 13.5 敏感資料

不可在前端程式碼中保存：

* Service Role Key
* 資料庫管理密碼
* 私密 API Key

---

# 十四、同步與離線策略

健身房內可能有網路不穩定的情況，因此課程紀錄不可完全依賴即時網路。

## 第一版建議

採用：

* 雲端資料庫作為主要資料來源
* 本機資料庫或快取儲存進行中課程
* 網路恢復後自動同步

## 儲存時機

下列操作後應立即儲存：

* 建立課程
* 新增動作
* 新增一組
* 修改重量
* 修改次數
* 標記組別完成
* 刪除組別
* 調整動作順序

## 衝突策略

第一版可使用：

* Last Write Wins
* 依 updated_at 判斷較新資料

每筆本機待同步資料需包含：

* local_id
* server_id
* sync_status
* updated_at
* last_sync_at

若第一版開發時程有限，至少要做到「進行中的課程不因 App 關閉而消失」。

---

# 十五、建議技術架構

## 15.1 建議方案A

### 前端

Flutter

### 狀態管理

Riverpod

### 路由

GoRouter

### 雲端後端

Supabase

### 資料庫

PostgreSQL

### 驗證

Supabase Auth

### 本機資料庫

Drift 或 SQLite

### 檔案儲存

Supabase Storage

### 錯誤監控

Sentry 或 Firebase Crashlytics

## 15.2 建議方案B

若團隊熟悉 JavaScript／TypeScript，可使用：

* React Native
* Expo
* TypeScript
* Zustand 或 Redux Toolkit
* Supabase
* PostgreSQL
* Expo SQLite

## 15.3 技術選擇原則

AI Coding Agent 不應同時建立 Flutter 與 React Native 版本。

應選擇一種技術方案完成。

未特別指定時，優先採用：

> Flutter + Riverpod + Supabase + PostgreSQL + Drift

---

# 十六、軟體架構要求

建議採用簡化後的 Clean Architecture。

```text
presentation
  ├─ pages
  ├─ widgets
  ├─ controllers
  └─ providers

domain
  ├─ entities
  ├─ repositories
  └─ use_cases

data
  ├─ models
  ├─ data_sources
  ├─ repositories
  └─ mappers

core
  ├─ database
  ├─ network
  ├─ routing
  ├─ errors
  ├─ theme
  └─ utilities
```

要求：

* UI 不可直接操作 Supabase。
* UI 不可直接撰寫 SQL。
* Repository 負責資料存取抽象。
* 雲端與本機資料來源分離。
* Domain Entity 不應依賴 Supabase Model。
* 所有資料表變更需透過 Migration。
* 不可在程式啟動時臨時建立正式資料表。
* 不可將測試資料硬編碼於正式 UI。

---

# 十七、API與Repository需求

第一版至少需要以下 Repository。

## AuthRepository

* signUp
* signIn
* signOut
* resetPassword
* getCurrentUser

## OrganizationRepository

* createOrganization
* getCurrentOrganization
* getOrganizationMembers

## ClientRepository

* createClient
* updateClient
* archiveClient
* getClient
* listClients
* searchClients

## ExerciseRepository

* listSystemExercises
* listOrganizationExercises
* searchExercises
* createCustomExercise
* getRecentExercises

## WorkoutRepository

* createWorkoutSession
* getDraftWorkout
* updateWorkoutSession
* completeWorkout
* cancelWorkout
* listClientWorkouts
* getWorkoutDetail

## WorkoutExerciseRepository

* addExercise
* removeExercise
* reorderExercises
* updateExerciseNote

## WorkoutSetRepository

* createSet
* duplicateSet
* updateSet
* completeSet
* deleteSet
* reorderSets

---

# 十八、UI與視覺規範

## 18.1 視覺風格

* 簡潔
* 專業
* 現代
* 大量留白
* 高可讀性
* 避免過度運動競技風格
* 避免過多漸層與裝飾

## 18.2 元件原則

* 主要按鈕高度至少48px。
* 點擊區域不得過小。
* 主要數值應清楚放大。
* 重量與次數控制應能單手操作。
* 危險操作使用不同視覺層級。
* 刪除動作不應放在容易誤觸的位置。

## 18.3 第一版主題

第一版需支援：

* 淺色模式

深色模式可列為後續功能，不作為第一版強制驗收項目，以降低不必要開發負擔。

## 18.4 語言

第一版使用繁體中文。

程式架構需使用 localization 機制，禁止將所有中文文字散落硬編碼在元件中。

預留未來：

* 英文
* 簡體中文
* 日文

---

# 十九、狀態與錯誤處理

每個主要頁面需處理：

* Loading
* Empty
* Success
* Error
* Offline

## 空白狀態範例

### 尚無學員

顯示：

「還沒有學員，新增第一位學員開始記錄。」

### 尚無歷史課程

顯示：

「尚無訓練紀錄。」

### 尚未加入動作

顯示：

「點擊下方按鈕新增第一個訓練動作。」

## 錯誤處理

* 儲存失敗不得直接丟失畫面資料。
* 顯示可理解的錯誤訊息。
* 提供重新嘗試。
* 不可向使用者顯示原始資料庫錯誤或 Stack Trace。

---

# 二十、非功能需求

## 效能

* App 冷啟動目標小於3秒。
* 已登入後進入學員列表目標小於2秒。
* 新增動作後畫面更新目標小於300毫秒。
* 修改重量與次數時不得等待伺服器回應才更新畫面。
* 儲存應採用樂觀更新。

## 穩定性

* App 意外關閉後，未完成課程應可恢復。
* 網路短暫中斷時，已輸入資料不可消失。
* 重複點擊完成課程不可建立重複資料。

## 可維護性

* 使用明確命名。
* 避免超大型頁面元件。
* 共用元件需抽離。
* 商業邏輯需具備單元測試。
* Migration 必須可重現完整資料庫。

---

# 二十一、第一版禁止開發範圍

第一版不得主動加入以下功能：

* 課程預約
* 排班
* 剩餘堂數
* 購課方案
* 收款
* 發票
* 營收報表
* 教練抽成
* 飲食紀錄
* 體脂分析
* 身體照片
* AI 課表
* AI 重量建議
* 學員登入
* 聊天
* 推播通知
* 社群
* 排行榜
* 運動影片
* 商城
* 穿戴裝置整合
* Apple Health
* Google Fit
* 公開課表分享

可以在資料庫與程式架構上預留擴充空間，但不可增加第一版頁面與使用流程。

---

# 二十二、第一版驗收標準

## 帳號

* 可註冊。
* 可登入。
* 可登出。
* 可維持登入狀態。
* 不同 Organization 資料相互隔離。

## 學員

* 可新增學員。
* 可編輯學員。
* 可封存學員。
* 可搜尋學員。
* 可查看學員最後上課日期。

## 動作

* 可依肌群瀏覽動作。
* 可搜尋動作。
* 可查看最近使用動作。
* 可建立自訂動作。
* 可將動作加入課程。

## 課程

* 可建立進行中課程。
* 可新增及刪除課程動作。
* 可新增組別。
* 新增組別可複製上一組。
* 可調整重量。
* 可調整次數。
* 可標記組別完成。
* 可完成課程。
* App 關閉後可恢復草稿。

## 歷史

* 可查看學員歷史課程。
* 可查看每堂課所有動作。
* 可查看每組重量與次數。
* 歷史頁第一版為只讀。

## 使用體驗

* 除建立學員及自訂動作外，核心課程紀錄不需大量打字。
* 一般課程紀錄可在30秒內完成。
* 所有主要按鈕可單手操作。
* 網路不穩時已輸入資料不會立即遺失。

---

# 二十三、測試需求

## 單元測試

至少涵蓋：

* 建立課程
* 新增動作
* 複製組別
* 完成課程
* Organization 資料隔離
* 草稿恢復
* 重量小數處理

## 整合測試

至少涵蓋：

```text
註冊
→ 建立 Organization
→ 新增學員
→ 建立課程
→ 新增動作
→ 新增組別
→ 完成課程
→ 查看歷史
```

## 邊界測試

* 一堂課沒有動作。
* 一個動作只有一組。
* 重量為0。
* 重量為2.5。
* 次數為0。
* 同一堂課加入相同動作兩次。
* 同一位學員同一天建立兩堂課。
* 網路中斷後繼續記錄。
* 重複點擊完成課程。
* 教練嘗試讀取其他 Organization 資料。

---

# 二十四、AI Coding Agent執行指令

請依照本文件開發完整 MVP，並遵守以下規則：

1. 先建立專案目錄與架構，再進行功能開發。
2. 先建立資料庫 Migration 與 RLS Policy。
3. 建立 Seed Data，至少包含常用訓練動作。
4. 不可將資料只儲存在記憶體或單一本機 JSON。
5. 所有正式資料必須支援雲端資料庫保存。
6. 進行中課程必須具備本機暫存與恢復能力。
7. 不可將使用者資料綁死在單一教練帳號。
8. 所有主要資料必須以 organization_id 隔離。
9. 第一版介面不要加入非需求功能。
10. 保持資料庫可支援未來多教練、學員登入、預約、收款與堂數管理。
11. 每完成一個模組，建立相對應測試。
12. 提供 README，說明環境設定、資料庫Migration、執行及部署方式。
13. 提供 `.env.example`，不可提交真實金鑰。
14. 所有欄位名稱、資料表名稱與程式命名使用英文。
15. 所有使用者介面文字使用繁體中文並集中管理。
16. 不得為追求過度抽象而增加不必要複雜度。
17. 優先交付可實際操作、可儲存、可測試的完整流程。
18. 若需求有未明確之處，以「簡單操作、資料完整、未來可擴充」為判斷原則。

---

# 二十五、建議開發順序

## Phase 1：基礎架構

* 建立專案
* 設定環境變數
* 建立 Supabase 專案
* 建立資料庫 Migration
* 建立 RLS
* 建立 Seed Data
* 建立 Auth
* 建立 Organization

## Phase 2：學員功能

* 學員列表
* 新增學員
* 編輯學員
* 搜尋學員
* 封存學員
* 學員詳情

## Phase 3：動作資料庫

* 動作分類
* 動作列表
* 動作搜尋
* 最近使用
* 自訂動作

## Phase 4：課程紀錄

* 建立課程草稿
* 新增動作
* 新增組別
* 複製上一組
* 重量控制
* 次數控制
* 自動儲存
* 完成課程

## Phase 5：歷史資料

* 歷史課程列表
* 課程詳情
* 最後上課日期
* 課程數量統計

## Phase 6：品質與發布

* 本機快取
* 離線恢復
* 錯誤處理
* 測試
* 效能優化
* Android建置
* iOS建置
* 發布前檢查

---

# 二十六、產品成功指標

第一版上線後主要觀察：

* 教練每週實際使用天數。
* 每位教練建立的課程數量。
* 課程開始後的完成率。
* 每堂課平均記錄時間。
* 每堂課平均動作數。
* 每堂課平均組數。
* 教練是否持續使用兩週以上。
* 教練是否認為比紙本、LINE或試算表更方便。

第一版最重要的驗證問題是：

> 教練是否願意在每一次上課時，持續使用本產品記錄學員的訓練內容？

---

# 二十七、最終產品原則

第一版功能必須保持簡單，但底層不能是一次性原型。

系統必須同時做到：

* 前台操作簡單
* 第一版功能聚焦
* 資料正式保存
* 權限安全
* 支援多租戶
* 資料表關聯清楚
* 未來可擴充
* 不需要重建核心架構

本專案第一版的核心不是開發最多功能，而是建立一個穩定且可持續成長的基礎產品：

> 先讓教練願意每天使用，再逐步發展成完整的健身教練營業管理平台。
