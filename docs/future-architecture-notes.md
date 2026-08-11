# Future Architecture Notes

**狀態：Reference only — 尚未生效**
**最後更新：2026-08-11**

本文件收錄尚未開發功能的資料模型草案與設計方向。

這些內容**不是現在要建立的資料表**，只在對應功能真正開發時才需要遵守。核心、現在就必須遵守的原則在 `ARCHITECTURE.md`。

開發對應功能前，先確認 `ARCHITECTURE.md` 的三條憲法與相關章節沒有被違反；若本文件的草案與屆時的實際需求衝突，以實際需求為準並更新本文件，不需要另開 ADR（本文件本身就是暫定草案，不是鎖定決策）。

---

## 不預建未使用的功能資料表

專案不得為了「未來可能會用到」而預先建立大量空白資料表（完整預約系統、金流/發票/抽成/薪資表、沒有 Repository 沒有流程的空表）。原因：未知需求容易導致錯誤資料模型，空表會被誤認為已確認的設計，一旦產生正式資料就只能遷移。

正確方式：現階段只建立目前功能需要的資料表；功能真正開發時，再依實際需求建立 Migration。

---

## 被下游引用的資料必須凍結

一旦資料被扣堂、付款、發票、抽成、薪資、月結、對帳、報稅等流程引用，原始資料不得任意 UPDATE/DELETE。關鍵資料表未來應包含 `locked_at / locked_reason / locked_by`，由 Trigger 阻擋非法修改（不能只靠 UI 顯示「不可編輯」）。修正方式：沖正原交易、新增替代紀錄、建立 Correction，保留 Audit Trail。

---

## Organization 代表品牌/營運主體，不代表場館

Organization 語意 = 法人／品牌／營運主體／計費單位／資料隔離邊界，不直接等於單一實體場館。未來多分店：

```
organization
  └─ locations
       └─ rooms_or_areas
```

教練帳號可屬於同一 Organization 的多個 Location；報表可按 Organization 或 Location 彙總；一個 Organization 不應為每個分店建立不同登入體系。

時區讀取需經 Helper：

```
resolve_business_timezone(organization_id, location_id nullable)
→ location.timezone → organization.timezone → 系統安全預設值
```

禁止在不同功能中直接散落讀取 `organizations.timezone`。

---

## 教練登入身分與營運身分分離

登入與權限用 `profiles` / `organization_members`。教練作為可被預約與計算抽成的資源，未來用 Organization-scoped 的 `coach_profiles`（`organization_id, user_id, employment_type, commission_rule, hourly_rate, specialties, booking_enabled, availability_settings`）。抽成比例、時薪、聘僱類型等不得放進全域 Profile——同一教練在不同 Organization 可以有不同設定。

---

## 外部整合：Outbox Pattern

推播、Email、SMS、LINE 通知、電子發票、金流通知、Webhook、第三方同步等，未來不得由 App 直接視為可靠完成。透過 `outbox_events`（`id, organization_id, event_type, aggregate_type, aggregate_id, payload, status, retry_count, available_at, processed_at, idempotency_key, last_error, created_at`）：業務交易與 Outbox Event 同一 DB Transaction 建立；外部 Worker 消費並可重試；每個外部副作用必須冪等。V1 不一定需要建這張表，但任何未來外部整合都不得繞過此原則。

---

## Payments 與 Invoices 永遠分離

未來至少分離 `payments / invoices / invoice_adjustments / refunds`。禁止把 `invoice_number / invoice_status / tax_id / carrier_number` 直接當付款紀錄的一部分。原因：付款成功但開票失敗、一筆付款對應多張發票、發票可能作廢/折讓、台灣電子發票有獨立法規生命週期。發票供應商透過 Adapter 介面整合，Domain 不依賴特定發票平台。

---

## 個資刪除與交易保存分層

可刪除/匿名化資料（姓名、電話、Email、生日、地址、頭像、備註、緊急聯絡人）集中於 `clients` 或專門 Personal Data Table。必須保留的交易事實（金額、交易時間、堂數變動、發票事實、退款、結算、稽核紀錄）不因刪除帳號/學員資料而破壞帳務完整性。

禁止為了顯示方便把 `client_name / client_phone / client_email / client_birth_date` 反正規化複製到大量交易表（例如每筆 Workout Session 都存學員姓名）——未來刪除/匿名化時容易漏刪、造成個資殘留、不同快照互相矛盾。若依法確實需要交易快照，必須明確定義用途、快照與可識別個資分離，並在 ADR 中記錄保存與刪除政策。

---

## Audit Log

涉及 Clients 個資、權限、組織成員、堂數、付款、發票、抽成、鎖定課程、更正紀錄、資料匯出、帳號刪除時，必須建立 Audit Log（`id, organization_id, actor_user_id, action, resource_type, resource_id, before_data, after_data, occurred_at, request_id`），append-only、一般使用者不得修改、不記錄密碼/Token/完整付款卡資料、個資欄位依用途遮罩。**不應等到金流上線後才補，因為歷史無法回填**——這條在金流/堂數功能開發時要提前規劃，不是事後補救。

---

## Feature-first 架構（Flutter）

```
lib/
  features/
    auth/{presentation,domain,data}
    organizations/{presentation,domain,data}
    clients/{presentation,domain,data}
    workouts/{presentation,domain,data}
  shared/{widgets,models,services}
  core/{database,routing,security,analytics,errors,configuration}
```

未來新增 `packages/`（appointments/billing/payments/invoices/coach_management/locations）。

Feature 之間禁止直接 import 其他 Feature 的 Data Layer（例如 `clients/data → import workouts/data`）；跨 Feature 整合透過 Domain Interface / Application Service / Event / Shared Contract / Read Model，避免雙向依賴。`shared` 只放真正跨功能共用的內容，一個元件至少被兩個 Feature 實際使用才考慮移入。

---

## Idempotency

扣堂、付款建立、退款、發票開立/作廢、Webhook 處理、Outbox 消費、離線同步、帳號刪除工作、批次匯入等操作，未來都必須具備 Idempotency Key，由 Server 或 Database 保證，不能只靠前端鎖按鈕。不能假設 App 只送一次、使用者不會連點、逾時代表後端沒成功、Webhook 不會重送。

---

## 衍生值不是唯一真相

`remaining_sessions / total_sets / total_revenue / current_balance / last_workout_weight / appointment_count` 等快取欄位，必須有清楚來源資料、可完整重算、有一致更新機制、不可直接手動修改、有 Rebuild 工具或 Query。快取不是帳本，View/Materialized View 不是原始事實。

---

## 反面範例（禁止合併的設計）

| 錯誤 | 正確 |
|---|---|
| `client_packages.remaining_sessions -= 1` | `INSERT package_transactions(delta = -1)` |
| 預約與課程合併成 `training_sessions(scheduled_at, appointment_status, actual_sets, no_show)` | `appointments` + `workout_sessions.appointment_id nullable` |
| `profiles.role = 'client'`，學員資料寫進 Profile | `profiles` = 登入者，`clients` = Organization 學員檔案，`clients.auth_user_id nullable` |
| `if role == coach: allow all clients` | `user_can(org_id, 'client.read')` + `user_data_scope(org_id, 'client')` |
| `payments.invoice_number / payments.invoice_status` | `payments` + `invoices` + `invoice_adjustments` |
| 每張表都複製 `client_name` | 只存 `client_id`；必要交易快照需另行設計並記錄法遵理由 |
| `clients_repository → import workout_supabase_data_source` | Domain Contract / Application Service / Event / Read Model |
