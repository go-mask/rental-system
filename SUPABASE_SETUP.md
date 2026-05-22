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
```

這會讓 `properties` 增加 `rent_year` 欄位，讓同一物件在不同年度可保留不同租客、租金與備註。
第二份 migration 會建立多人協作的 organization、member、invitation 權限模型，並把既有資料歸入你的預設組織。

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
5. 按「從雲端載入」確認資料可讀回。
6. 物件資料與每月收款紀錄已支援登入後背景同步到 Supabase。
7. 再串 `remittance_profiles`、水電帳期與帳單報表。
8. 最後部署 GitHub Pages。

## 目前同步範圍

- 從雲端載入 `properties` 與 `rent_payments`
- 物件資料與收款紀錄雲端讀寫
- 編輯收款日期/狀態後同步該月份紀錄
- 編輯物件資料後同步該物件列
- 新增物件後同步物件列與 12 個月份紀錄
- 刪除物件後同步刪除雲端資料
- 登入後載入匯款資料下拉清單
- 雲端沒有匯款資料時，用本機資料建立第一批資料
- 新增匯款資料後同步到雲端
- 刪除匯款資料後同步刪除雲端資料
- 匯入本機歷史水電帳期到 `utility_periods` 與 `utility_readings`
- 從雲端載入歷史水電帳期，供租客帳單下拉套用
- 儲存目前租客帳單到 `tenant_bills` 與 `tenant_bill_items`
- 從已存帳單下拉載入過去帳單快照
- 刪除已存帳單時一併刪除帳單明細
- 多人協作：擁有者可用 Email 邀請 editor/viewer，受邀者登入後自動加入同一份資料

尚未同步：

- 退租結算儲存紀錄

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

## 資料安全原則

- GitHub 可以放 `Project URL` 與 anon/publishable key。
- GitHub 不可以放 Database password。
- GitHub 不可以放 service_role key。
- 真實租客資料不要再硬寫進 `app.js`。
- RLS policy 沒確認前，不要把正式資料匯入。
