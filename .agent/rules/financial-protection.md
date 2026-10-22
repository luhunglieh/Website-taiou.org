---
trigger: "當使用者要求修改、更新銀行帳號、捐款收據表單或工會金流資訊時"
description: "自動確保金流防篡改守門腳本 (scripts/verify-financial-integrity.mjs) 與網頁元件同步更新"
---

# 銀行帳號與金流資訊防篡改維護規則

當使用者或開發工作涉及修改、替換或維護工會的銀行帳號、戶名或 Google 捐款表單連結時，**必須同時同步更新以下兩個檔案**，以防 `npm run build` 時遭 `Financial Sentinel` 守門腳本判定為篡改而中斷建置：

1. **前端組件**：
   - `src/components/Footer.astro`
2. **守門驗證常數**：
   - `scripts/verify-financial-integrity.mjs` (修改 `EXPECTED_ACCOUNT`、`EXPECTED_HOLDER` 或 `EXPECTED_FORM_URL`)

修改完成後，必須執行 `npm run build` 確認守門通過。
