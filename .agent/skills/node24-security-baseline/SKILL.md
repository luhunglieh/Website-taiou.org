---
name: node24-security-baseline
description: >-
  Enforces the project's Node 24 Active LTS security baseline, CI/CD workflow
  transparency and least-privilege permissions, immutable Action SHA pinning,
  single-lockfile policy, third-party dependency (node_modules) residual
  sanitization, Facebook SDK/Google Analytics CSP boundaries, and anti-crash
  defenses. Activate this skill whenever modifying CI/CD workflows
  (.github/workflows), Dockerfiles, package dependencies, build scripts, or
  performing security audits on Website-taiou.org.
---

# Node 24 資安基準與 CI/CD 強化規範 (臺北市人工智慧產業工會 taiou.org)

本規範定義 **臺北市人工智慧產業工會 (Taipei AI Organization of Union, taiou.org)** 官方網站之執行環境資安基準、GitHub Actions 最小權限與不可變 SHA Pinning 規範、第三方依賴殘留檔清消機制，以及前端靜態站台防崩潰 (Anti-Crash) 與資安威脅防護邊界。

---

## 1. 核心資安原則 (Mandatory Security Policy)

1. **全面棄用 Node 18 與 Node 20**：
   * Node 18 已於 2025-04-30 終止支援（EOL）。
   * **Node 20 已 EOL（Node 20 於 2026-04-30 終止支援）**。
   * 本專案所有程式碼、註解、腳本說明、CI/CD 設定以及 `node_modules` 第三方套件殘留檔，**嚴禁使用舊版 18 或 20 之容器映像標籤或版本設定**，統一強制採用 **Node 24 Active LTS**（容器映像固定為 `FROM node:24-slim` 或 `FROM node:24-alpine`）。
2. **單一事實來源 (Single Lockfile Policy)**：
   * 統一使用 `npm` 與 [`package-lock.json`](../../../package-lock.json)。
   * 專案目錄下嚴禁混用 `bun.lock`、`bun.lockb`、`yarn.lock` 或 `pnpm-lock.yaml`，避免相依樹發生環境漂移。
3. **版本鎖定檔案一致性**：
   * [`package.json`](../../../package.json)：`"engines": { "node": ">=24.0.0", "npm": ">=10.0.0" }`
   * [`.nvmrc`](../../../.nvmrc) 與 [`.node-version`](../../../.node-version)：固定為 `24`
   * [`netlify.toml`](../../../netlify.toml)：`command = "npm run build"` 且 `[build.environment] NODE_VERSION = "24"`

---

## 2. GitHub Actions CI/CD 透明、最小權限與不可變 SHA 規範

編輯 [`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml) 時必須遵守以下規範：

1. **頂層強制 Node 24 Action Runtime**：
   * 必須在 Workflow 頂層 `env:` 設定 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`，以強制所有 Runner 上的 JavaScript Actions 底層皆以 Node 24 執行。
2. **最小權限原則 (Principle of Least Privilege)**：
   * 嚴禁在 Workflow 頂層設置全域寫入權限。
   * `build` job 僅賦予唯讀權限：
     ```yaml
     permissions:
       contents: read
     ```
   * 僅有發布階段的 `deploy` job 才允許 Pages 與 OIDC 憑證權限：
     ```yaml
     permissions:
       pages: write
       id-token: write
     ```
3. **不可變 Commit SHA Pinning（防範供應鏈攻擊與標籤劫持）**：
   * 嚴禁在生產 CI/CD 中使用浮動 Major Tag（如 `@v4`、`@v5`）。所有 Action 必須鎖定完整 40 位元 Git Commit SHA，並以註解標示對應版本號：
     * `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`
     * `actions/setup-node@1d0ff469b7ec7b3cb9d8673fde0c81c44821de2a # v4.2.0`
     * `actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b # v5.0.0`
     * `actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa # v3.0.1`
     * `actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4.0.5`
4. **顯式設定 Node 24 與快取**：
   * 必須顯式宣告 `actions/setup-node` 並指定 `node-version: 24` 與 `cache: npm`，隨後依序執行 `npm ci` 與 `npm run build`。

---

## 3. 第三方套件 (`node_modules`) 殘留檔強制清消機制

針對第三方套件隨 npm tarball 釋出的殘留檔，透過 [`scripts/enforce-node24.mjs`](../../../scripts/enforce-node24.mjs) 進行自動清消與守門：
1. **執行期守門**：綁定於 `package.json` 的 `postinstall` 與 `prebuild`。當執行環境 Node 主版本 $\le 20$ 時立即中斷退出（`exit(1)`）。
2. **殘留設定修正**：自動將 `node_modules` 內部殘留的 Dockerfile 改寫為 `FROM node:24-slim`，並將工作流檔案中的 `node-version` 改寫為 `'24'`。

---

## 4. 專案資安威脅防護邊界與防崩潰機制 (Threat Model & Anti-Crash)

1. **純靜態輸出架構 (SSG)**：
   * 本站採用 Astro 純靜態輸出 (`output: "static"`，產物位於 `./dist`) 並發佈於 GitHub Pages CDN / 自訂網域 `www.taiou.org`。
   * 線上正式環境不存在任何 Node.js 伺服器、動態後端 API 或資料庫連線，因此伺服端執行期漏洞（如 SSR 中介層繞過、Server Islands 反射 XSS、SSRF）不構成線上運行威脅。
2. **防崩潰 (Anti-Crash) 與 Frame-Busting 防點擊劫持**：
   * **防止白屏崩潰**：若僅注入 `body { display: none !important; }`，在無 JavaScript 環境或腳本執行異常時站台將永久白屏。因此必須在 [`Layout.astro`](../../../src/layouts/Layout.astro) 中配置 `<noscript><style>body { display: block !important; }</style></noscript>` 備援機制，確保站台不 crash。
3. **第三方資源嚴格收斂與 CSP 邊界 (防止 CSP 誤擋導致功能 Crash)**：
   * 本站實際整合之第三方服務包括：
     * **Facebook SDK 與粉專插件**：`connect.facebook.net` (腳本)、`www.facebook.com` / `web.facebook.com` (Iframe 內嵌與連線)、`*.fbcdn.net` (圖素)。
     * **Google Analytics (GA4)**：`googletagmanager.com`、`google-analytics.com`、`analytics.google.com`、`stats.g.doubleclick.net`。
     * **Google Fonts**：`fonts.googleapis.com` (樣式)、`fonts.gstatic.com` (字型)。
     * **支持捐款表單**：`https://forms.gle`。
   * CSP 必須精準放行上述網域，嚴禁過度封鎖導致 Facebook 粉專、Google 字型或捐款按鈕無法運作。在 [`Layout.astro`](../../../src/layouts/Layout.astro) 與 [`public/_headers`](../../../public/_headers) 中皆維持統一的 CSP 規則。

---

## 5. 本專案專屬資安疑慮 (Project-Specific Security Considerations)

1. **專案根目錄殘留之舊版靜態模板檔 (已全面清除完畢)**：
   * 專案根目錄過去殘留遷移前之舊版檔案：`index.html`、`assets/`（內含舊版 jQuery 1.11.2、Bootstrap 3.3.6 等具備已知 CVE 弱點之函式庫）以及舊版 `favicon.ico`、`sitemap.xml`、`metoo-202503.pdf` 等重複檔。
   * **已處置完畢**：已徹底從倉庫與檔案系統中刪除根目錄所有非 Astro 執行的舊靜態檔、舊 JS 腳本與重複資產。目前所有靜態檔案統一收斂至 `public/` 管理，根目錄保持 100% 乾淨，徹底杜絕伺服器誤將根目錄暴露而衍生的 XSS 或過時程式庫風險。
2. **捐款金融資訊公開展示之防篡改機制 (已啟用 Financial Sentinel 守門)**：
   * 站台展示工會之銀行帳號（合作金庫 `0969-71707-4581`）與 Google 捐款收據表單連結。為免去日常頻繁開 PR 的繁瑣審核流程，本站實作 **[`scripts/verify-financial-integrity.mjs`](../../../scripts/verify-financial-integrity.mjs)** 金流防篡改守門機制：
     * 自動掛載於 `npm run build` 之 `postbuild` 階段。
     * 對發布產物 (`dist/index.html`) 與原始碼 (`src/`) 進行 SHA-256 密碼學指紋比對。
     * 若帳號、戶名或表單連結遭未授權變更，建置立即以 `exit(1)` 強制中斷，GitHub Actions 部署流程自動中止，確保被篡改的頁面 0% 機會發布至線上。
3. **PDF 宣導文件公開下載安全**：
   * `public/metoo-202503.pdf` 為公開宣導手冊，部署前應確認內容未夾帶惡意巨集或可執行腳本，並維持靜態 CDN 發布。

---

## 6. 驗證步驟 (Verification Runbook)

每次更新相依套件或 CI/CD 流程後，請依序執行：
```powershell
# 1. 執行版本檢查與清消腳本
node scripts/enforce-node24.mjs

# 2. 靜態特徵掃描 (確認無 Node 18/20 殘留)
git grep --untracked --no-exclude-standard -I -i -n -E "FROM[[:space:]]+node|node-version"

# 3. 依賴弱點掃描 (非破壞性修復)
npm audit

# 4. 完整建置測試 (包含 prebuild 守門、型別檢查與 postbuild 金流指紋防篡改驗證)
npm run build
```
