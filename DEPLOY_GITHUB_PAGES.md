# GitHub Pages 部署筆記

## 上線前檢查

這個專案可以直接用 GitHub Pages 部署，因為目前是純前端靜態網站。

上線前請確認：

- 真實租客資料只存在 Supabase。
- 不要把 Database password 放進 GitHub。
- 不要把 `service_role` key 放進 GitHub。
- `supabase-config.js` 只放 Project URL 與 anon/publishable key。
- `local-initial-data.js`、`utility-history.js`、Excel 原始檔不要 commit。

## 已加入的部署保護

- `.gitignore` 已忽略：
  - `local-initial-data.js`
  - `utility-history.js`
  - `*.xlsx`
  - 本機 server log
- `app.js` 已移除硬寫的真實初始資料。
- `index.html` 預設不載入本機歷史水電檔。
- `.nojekyll` 已加入，避免 GitHub Pages 對靜態檔案做 Jekyll 處理。

## 建議 GitHub Pages 設定

1. 在 GitHub 建立 repository。
2. 將 `rental-system` 資料夾內容作為網站根目錄提交。
3. 到 GitHub repository 的 `Settings > Pages`。
4. Source 選 `Deploy from a branch`。
5. Branch 選 `main`。
6. Folder 選 `/root`。
7. 儲存後等待 GitHub Pages 發布。

發布網址通常會是：

```text
https://你的帳號.github.io/你的-repo-name/
```

## 首次上線後測試

1. 開啟 GitHub Pages 網址。
2. 登入 Supabase。
3. 按「從雲端載入」。
4. 確認物件資料、收款資料、匯款資料、歷史水電、已存帳單都能載入。
5. 修改一筆收款日期，重新整理後再載入，確認同步正常。

## 本機私有資料

`local-initial-data.js` 是從原本 `app.js` 拆出的本機初始資料，只供本機維護或重新匯入使用，不應該推到 GitHub。

如果真的需要在本機用私有初始資料，可在 `index.html` 的 `app.js` 前暫時加入：

```html
<script src="local-initial-data.js"></script>
```

歷史水電 Excel 匯入檔同理；正式部署應使用 Supabase 的 `utility_periods` 與 `utility_readings`。
