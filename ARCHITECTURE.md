# Fitness Coach Architecture Constitution

**文件名稱：ARCHITECTURE.md**
**專案：Fitness Coach**
**版本：v1.0**
**最後更新：2026-08-11**
**狀態：Mandatory**
**技術棧：Next.js（Mobile-first Web App）／Supabase（Postgres + RLS + Auth）**
**適用範圍：所有 App、Backend、Database、Migration、API、Repository、AI Coding Agent 任務**
**延伸文件：**
- 未來功能的完整資料模型草案 → `docs/future-architecture-notes.md`
- 重大架構決策紀錄 → `docs/adr/`

---

## 1. 文件目的

本文件只鎖定「未來修改成本極高、一旦做錯無法回頭」的決策。

不代表現在要預先建立所有資料表，也不代表 V1 要實作所有功能。

> 不預建未知需求，但不得用短期方便破壞未來無法補救的資料結構。

任何工程師或 AI Coding Agent 在實作功能前，必須先讀本文件。若任務需求與本文件衝突，必須先提出 ADR（見第 8 章），禁止直接繞過。

延伸的欄位設計、未來模組規劃（outbox、發票、教練抽成、多分店等）已移至 `docs/future-architecture-notes.md`，**尚未生效**，只在對應功能真正開發時才需要遵守。

---

## 2. 三條不可違反的產品資料憲法

**憲法一：金錢與堂數使用不可變帳本。**
禁止只維護目前餘額而沒有交易歷史。

**憲法二：預約與訓練事實分離。**
Appointment 與 Workout Session 永遠是不同 Aggregate。

**憲法三：Client 可以沒有登入帳號。**
Clients 不得被強制等同 Profiles 或 Auth Users。

---

## 3. 金錢與堂數：Append-only Ledger

剩餘堂數、儲值金、餘額、應收/已付金額、退款、抽成、點數，均不得只存為可任意修改的目前值（例如 `remaining_sessions`、`current_balance`）。這些欄位只能是查詢結果、View 或可由帳本重算的衍生值。

開發對應功能時，交易表（例如 `package_transactions`）至少包含：

```
id, organization_id, client_package_id, delta, reason,
source_type, source_id, idempotency_key,
reverses_transaction_id, occurred_at, created_by, created_at
```

規則：只允許 INSERT，不允許 UPDATE／DELETE；修正錯誤必須新增反向交易並記錄 `reverses_transaction_id`；自動扣堂必須帶 `idempotency_key`。

金額一律使用整數最小貨幣單位（`amount_minor bigint` + `currency char(3)`），禁止 float/double、禁止在 Dart 用浮點數做金額運算。

判斷標準：任何時候被問「這位學員為什麼剩 7 堂？」，必須能列出完整因果鏈，不能只回答目前值。

---

## 4. 預約與訓練紀錄必須分離

`appointment`（未來承諾）與 `workout_session`（已發生或正在發生的事實）不可合併成同一資料表。

- Workout Session 可以沒有 Appointment（臨時上課）；Appointment 可以沒有 Session（爽約）。
- 預約取消不自動刪除既有 Session；是否扣堂不可只依 Session 是否 completed 決定。
- 扣堂關聯需要獨立關聯表（例如 `session_deductions`），不得把 `package_id`／`deducted_sessions` 直接塞進 `workout_sessions` 當唯一依據——因為一堂課可能扣兩個方案、可能補扣、可能沖正。

V1 的 Workout Session 最低需求維持：`organization_id, client_id, coach_user_id, started_at, status`，不依賴 Appointment/Package/Payment/Invoice/Location。未來欄位只能以 nullable FK 附加，不得要求遷移所有舊資料才能上線新功能。

---

## 5. 身分模型必須保持分離

三種實體不可混用：

- **`profiles`**：系統登入者（老闆／管理員／教練／未來的學員登入帳號），對應 Auth User。
- **`clients`**：某個 Organization 擁有的學員檔案，Organization-scoped，不必有登入帳號，可由教練建立，不可直接等同 Auth User。學員資料不得寫進 `profiles`。
- **未來 Client User Linking**：`clients.auth_user_id nullable` 或獨立關聯表。一個 Auth User 可以對應多個 Organization 下不同的 Client 身分（同一自然人在不同機構的資料不共用）。不得假設 `one auth user = one client`。

> **注意（與其他專案的差異）**：本專案的 Client 明確是 **Organization-scoped**、不跨組織共用身份，這與 `rotary-platform-v2` 用 `people` 做跨組織共用真人身份的模式相反。這是刻意的產品決策，理由見 `docs/adr/0001-client-scoped-per-organization.md`。修改此決策前必須先更新該 ADR。

---

## 6. 權限：Action + Data Scope，唯一入口

禁止在 App、Repository、SQL Policy 中散落判斷 `if role == coach`。Role 不是完整權限模型，至少要有兩個維度：

- **Action**：例如 `client.read`、`workout.update`、`payment.refund`
- **Data Scope**：例如 `all`／`assigned`／`created`／`own`／`none`

所有 RLS Policy 與 Repository 必須透過統一介面：

```sql
private.user_has_org_access(target_organization_id uuid)
private.user_can(target_organization_id uuid, permission_code text)
private.user_data_scope(target_organization_id uuid, resource_code text)
```

V1 即使邏輯簡單（例如 active owner/admin/coach → `client.read` = true, scope = all），也必須經過這些函式，未來加入兼職教練時只改權限函式與資料，不重寫全部 Policy。

Repository 不得自行以角色字串推導權限，必須呼叫受保護的 API/RPC，並把資料庫 RLS 視為最終安全邊界。前端隱藏按鈕只是 UX，不是權限保護。

---

## 7. Database 是安全邊界

所有跨 Organization 隔離必須由資料庫保證，不能只靠 Repository 過濾、API 加 `organization_id`、UI 隱藏。

- 所有 Organization-scoped Table 必須有 `organization_id`、啟用 RLS、透過統一 Permission Helper（第 6 章）、有跨 Organization Integration Test。
- View 必須用 `security_invoker = on`，不得繞過 RLS。
- Trigger／SECURITY DEFINER Function 必須固定 `search_path`。
- **RLS 承諾必須可驗證，不能只靠文件約束**：對應每個 Organization-scoped 資料表，開發時需在 `supabase/verification/` 建立可重複執行的 SQL fixture（跨組織讀寫拒絕、本人資料存取、停權/停用邊界），仿照 `rotary-platform-v2` 的 `npm run verify:db` 模式。V1 沒有 Supabase migration 前不需要建這個目錄；一旦第一張 Organization-scoped 表落地，驗證檔案必須同批出現，不得延後補。

---

## 8. 架構變更流程

本文件可修改，但不可由單一功能開發任務順手修改。任何修改需要一筆 ADR（存於 `docs/adr/`），說明現有原則不足之處、替代方案、資料遷移成本、安全/法遵影響，審查通過後才能改本文件。

---

## 9. AI Coding Agent 執行規則

修改專案前必須：

1. 讀本文件（以及相關的 `docs/adr/*`）。
2. 若改動涉及金額、堂數、Appointment/Session、Client/Profile、權限判斷、跨 Organization 資料——先確認不違反第 2 章三條憲法。
3. 不得新增 `remaining_sessions` 之類欄位作為唯一真相；不得把 Appointment 與 Workout Session 合併；不得把 Client 直接轉成 Profile；不得散落用 Role 字串判斷權限；不得對 Ledger 執行 UPDATE/DELETE；不得為了讓測試通過而關閉 RLS。
4. 需要例外時，先建立 ADR，不得直接繞過。
5. 涉及第 7 章的 Organization-scoped 資料表時，同批補上 verification SQL。

---

## 10. Pull Request 檢查清單

- 是否新增/修改 Organization-scoped 資料？是否有對應 RLS 測試？
- 是否直接以 Role 判斷權限，而非透過 `user_can`/`user_data_scope`？
- 是否新增可變餘額欄位？該欄位是否可由帳本重算？
- 是否把 Appointment 與 Workout Session 混合？是否把 Client 與 Profile 混合？
- 是否新增金額欄位卻未用整數最小貨幣單位 + Currency？
- 任一答案可能違反本文件時，不得直接合併，先開 ADR。

---

## 11. 最終原則

不破壞歷史真相；不讓權限散落失控；不把不同生命週期的實體混在一起；不讓短期欄位成為長期技術債；不預建無用功能；在真正需要時，以正確邊界新增功能。

> 可以晚點建表，但不能先做出錯誤且不可逆的資料決策。
