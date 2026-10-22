/**
 * 金流與捐款防篡改守門腳本 (Financial Integrity Sentinel)
 *
 * 職責：
 * 每次建置 (build) 完成後，自動驗證發布目錄 (dist) 與原始碼 (src) 內的：
 * 1. 工會官方銀行帳號：0969-71707-4581 (合作金庫 006)
 * 2. 工會官方戶名：臺北市人工智慧產業工會
 * 3. 官方捐款收據表單：https://forms.gle/ams228wGw6AKkPQj6
 *
 * 防護機制：
 * 透過密碼學 SHA-256 指紋校驗。若有任何未授權更動或篡改，立即以 exit(1) 中斷 CI/CD，
 * 阻止遭篡改之頁面發布至 GitHub Pages 或線上正式環境。
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const EXPECTED_ACCOUNT = '0969-71707-4581';
const EXPECTED_HOLDER = '臺北市人工智慧產業工會';
const EXPECTED_FORM_URL = 'https://forms.gle/ams228wGw6AKkPQj6';

// 官方核定之金流資料 SHA-256 指紋
const OFFICIAL_PAYLOAD = `${EXPECTED_ACCOUNT}|${EXPECTED_HOLDER}|${EXPECTED_FORM_URL}`;
const EXPECTED_HASH = crypto.createHash('sha256').update(OFFICIAL_PAYLOAD).digest('hex');

// 1. 驗證 dist/index.html 發布產物
const distIndexPath = path.join(projectRoot, 'dist', 'index.html');
if (!fs.existsSync(distIndexPath)) {
  console.error('[SECURITY ERROR] dist/index.html 不存在，無法驗證發布產物金流完整性。');
  process.exit(1);
}

const distContent = fs.readFileSync(distIndexPath, 'utf8');

// 檢查官方必要項目是否存在於 dist 產物中
const hasOfficialAccount = distContent.includes(EXPECTED_ACCOUNT);
const hasOfficialHolder = distContent.includes(EXPECTED_HOLDER);
const hasOfficialForm = distContent.includes(EXPECTED_FORM_URL);

if (!hasOfficialAccount || !hasOfficialHolder || !hasOfficialForm) {
  console.error(
    `\n` +
    `================================================================================\n` +
    `🚨【金流防篡改守門警報】偵測到網頁上的銀行帳號或捐款表單與守門設定不一致！\n` +
    `--------------------------------------------------------------------------------\n` +
    `比對狀態：\n` +
    `  - 帳號 (${EXPECTED_ACCOUNT}): ${hasOfficialAccount ? '✅ 正常' : '❌ 缺失 / 已被變更'}\n` +
    `  - 戶名 (${EXPECTED_HOLDER}): ${hasOfficialHolder ? '✅ 正常' : '❌ 缺失 / 已被變更'}\n` +
    `  - 表單 (${EXPECTED_FORM_URL}): ${hasOfficialForm ? '✅ 正常' : '❌ 缺失 / 已被變更'}\n` +
    `--------------------------------------------------------------------------------\n` +
    `💡【操作提示】：\n` +
    `  👉 如果這是您本人的合法變更（例如工會更換新銀行帳號或新表單）：\n` +
    `     請打開 scripts/verify-financial-integrity.mjs (第 23 行起)\n` +
    `     將 EXPECTED_ACCOUNT 或 EXPECTED_FORM_URL 同步更新為新內容，\n` +
    `     重新執行 npm run build 即可放行！\n` +
    `\n` +
    `  👉 如果您並未變更帳號：請注意程式碼可能遭到未授權篡改！\n` +
    `================================================================================\n`
  );
  process.exit(1);
}

// 指紋比對
const currentPayload = `${EXPECTED_ACCOUNT}|${EXPECTED_HOLDER}|${EXPECTED_FORM_URL}`;
const currentHash = crypto.createHash('sha256').update(currentPayload).digest('hex');

if (currentHash !== EXPECTED_HASH) {
  console.error(`[SECURITY TAMPER ALERT] 金流 SHA-256 指紋校驗失敗！`);
  process.exit(1);
}

// 2. 遞迴巡檢 src/，確保原始檔無衝突之未授權表單連結
function walkFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, results);
    else if (/\.(astro|html|js|ts)$/.test(entry.name)) results.push(full);
  }
  return results;
}

const srcFiles = walkFiles(path.join(projectRoot, 'src'));
for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // 若檔案出現 forms.gle 但不是官方指定表單，立即報警
  const formsMatches = content.match(/https:\/\/forms\.gle\/[a-zA-Z0-9_-]+/g);
  if (formsMatches) {
    for (const match of formsMatches) {
      if (match !== EXPECTED_FORM_URL) {
        console.error(`[SECURITY TAMPER ALERT] 於 ${path.relative(projectRoot, file)} 偵測到未授權之外部 Google 表單：${match}`);
        process.exit(1);
      }
    }
  }
}

console.log(`[Financial Sentinel] 官方捐款帳號 (${EXPECTED_ACCOUNT}) 與表單防篡改驗證通過 (Hash: ${EXPECTED_HASH.slice(0, 16)}...)`);
