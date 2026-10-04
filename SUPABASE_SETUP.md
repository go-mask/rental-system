# Supabase 上線同步設定

## 目前專案

- Project URL: `https://oxhguhetthgcxoelnfja.supabase.co`
- 前端 key: 已放在 `supabase-config.js`
- 請不要把 Database password 或 service_role key 放進前端或 GitHub。

## 建立資料庫

1. 進入 Supabase Dashboard。
2. 打開你的 `gomask rental` project。
3. 左側選單進入 `SQL Editor`。
4. 開啟 `supabase-schema.sql`。
5. 全部複製後貼到 SQL Editor。
6. 執行 SQL。

這會建立：

- `properties`: 物件資料
- `rent_payments`: 每月收款紀錄
- `remittance_profiles`: 匯款資料
- `utility_periods`: 水電帳期
- `utility_readings`: 分錶讀數與分攤結果
- `tenant_bills`: 租客帳單
- `tenant_bill_items`: 租客帳單明細
- `settlement_records`: 退租結算紀錄

所有資料表都會啟用 RLS，且只允許登入使用者讀寫自己的資料。

## 已建立專案後的 migration

如果你已經成功執行過舊版 `supabase-schema.sql`，請再執行：

```text
supabase-migration-001-rent-year.sql
supabase-migration-002-organizations.sql
supabase-migration-003-api-privileges.sql
```

這會讓 `properties` 增加 `rent_year` 欄位，讓同一物件在不同年度可保留不同租客、租金與備註。
第二份 migration 會建立多人協作的 organization、member、invitation 權限模型，並把既有資料歸入你的預設組織。
第三份 migration 會配合 Supabase Data API 權限變更，明確授權本系統資料表與 RPC 函式給登入使用者使用。

## 建議 Authentication 設定

第一階段建議只開房東管理帳號：

1. 左側選單進入 `Authentication`。
2. 進入 `Users`，手動新增一個房東使用者。
3. 可先使用 Email/Password。
4. 建議關閉公開註冊，或只在測試期手動建立使用者。
5. 回到系統左側的「雲端同步」區塊，用這組帳號登入測試。
6. 使用者登入後，可在左側「雲端同步」區塊輸入新密碼並自行變更。
7. 未來若需要租客登入，再另外設計租客只讀權限。

## 前端串接順序

建議依序進行：

1. 建立資料表與 RLS policy。
2. 建立 Authentication 使用者並測試登入/登出。
3. 執行 `supabase-migration-001-rent-year.sql`。
4. 建立或確認雲端物件資料。
5. 登入後系統會自動從雲端載入資料，確認資料可讀回。
6. 物件資料與每月收款紀錄已支援登入後背景同步到 Supabase。
7. 再串 `remittance_profiles`、水電帳期與帳單報表。
8. 最後部署 GitHub Pages。

## 目前同步範圍

- 登入後自動從雲端載入 `properties` 與 `rent_payments`
- 物件資料與收款紀錄雲端讀寫
- 編輯收款日期/狀態後同步該月份紀錄
- 編輯物件資料後同步該物件列
- 新增物件後同步物件列與 12 個月份紀錄
- 刪除物件後同步刪除雲端資料
- 登入後載入匯款資料下拉清單
- 雲端沒有匯款資料時，用本機資料建立第一批資料
- 新增匯款資料後同步到雲端
- 刪除匯款資料後同步刪除雲端資料
- 歷史水電帳期可從 `utility_periods` 與 `utility_readings` 合併顯示為已存帳單
- 儲存目前租客帳單到 `tenant_bills` 與 `tenant_bill_items`
- 從已存帳單下拉載入過去帳單快照與歷史水電帳期
- 刪除已存帳單時一併刪除帳單明細
- 儲存退租結算快照到 `settlement_records`
- 從已存結算下拉載入與刪除退租結算快照
- 多人協作：擁有者可用 Email 邀請 editor/viewer，受邀者登入後自動加入同一份資料

## 多人協作

角色：

- `owner`: 擁有者，可邀請成員、讀寫與刪除資料
- `editor`: 可讀寫資料，但不能邀請成員
- `viewer`: 只能讀取與列印，不能修改資料

邀請流程：

1. 擁有者登入系統。
2. 左側「多人協作」輸入協作者 Email。
3. 選擇 `可編輯` 或 `只能查看`。
4. 按「邀請協作者」。
5. 協作者需先在 Supabase Authentication 建立同 Email 帳號。
6. 協作者登入系統後，會自動接受邀請並看到同一份資料。

## 定時資料庫連線檢查

GitHub Actions 的 `Supabase database health check` 每天台灣時間 01:17、09:17、17:17 執行（實際可能延遲）。電腦不必開機。排程使用前端既有的公開 API key，對 `properties` 執行零筆資料查詢，不下載租客資料、不新增或修改紀錄，也不需要管理員金鑰。

1. 已暫停的專案必須先到 Supabase Dashboard 按 Restore / Resume 恢復。
2. 將排程與腳本推送到 GitHub 的預設分支 `main`。
3. 到 GitHub → Actions → Supabase database health check，確認有綠色成功紀錄；也能按 Run workflow 手動測試。
4. 若出現 401 / 403，確認公開 API key 與資料表權限，不要為了此檢查放寬租客資料的 RLS 或加入管理員金鑰。此方案依賴既有資料表允許 anon 進行受 RLS 限制的查詢；若已撤銷此權限，需另設不含業務資料的檢查端點。

這是免費方案的盡力維持連線措施，不保證 Supabase 一定不暫停，也不能自動恢復已暫停的專案。成功只表示資料庫 API 可達，不代表已驗證登入及全部業務功能。

GitHub 公開儲存庫連續 60 天沒有活動會自動停用排程；單靠排程執行不應視為能避免停用。請留意 GitHub 通知並定期查看 Actions；若停用，於 Actions 重新 Enable workflow。GitHub Actions 的失敗通知依個人通知設定發送。需要保證不因閒置暫停時，使用 Supabase 付費方案。

參考：[Supabase 暫停規則](https://supabase.com/docs/guides/platform/free-project-pausing)、[GitHub 排程限制](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。

## 資料安全原則

- GitHub 可以放 `Project URL` 與 anon/publishable key。
- GitHub 不可以放 Database password。
- GitHub 不可以放 service_role key。
- 真實租客資料不要再硬寫進 `app.js`。
- RLS policy 沒確認前，不要把正式資料匯入。
- 未來新增 Supabase 資料表時，migration 要同時包含 `grant`、`enable row level security` 與 policy。
