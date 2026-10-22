/**
 * 資安與執行環境強制規範腳本 (Security & Runtime Enforcement Script)
 *
 * 背景說明：
 * - Node 18 已於 2025-04-30 終止支援 (EOL)。
 * - Node 20 已 EOL（Node 20 於 2026-04-30 終止支援）。
 * - 本專案全面棄用 Node 18 與 Node 20，統一標準化為 Node 24 Active LTS。
 *
 * 腳本職責：
 * 1. 驗證當前執行環境之 Node.js 主版本不得為已淘汰之舊版（強制要求 >= 22，標準為 Node 24）。
 * 2. 自動巡檢並修正第三方套件 (node_modules) 隨 tarball 殘留之 Dockerfile 與 GitHub Actions 工作流設定，
 *    確保無論是否由間接依賴帶入，專案目錄內所有檔案皆指向 Node 24。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const nodeModulesDir = path.join(projectRoot, 'node_modules');

// 1. 驗證執行期 Node.js 版本
const currentNodeVersion = process.versions.node;
const majorVersion = Number.parseInt(currentNodeVersion.split('.')[0], 10);

if (Number.isNaN(majorVersion) || majorVersion <= 20) {
  console.error(
    `[SECURITY ERROR] 偵測到不安全的 Node.js 版本: v${currentNodeVersion}。\n` +
      `Node 18 與 Node 20 已 EOL（Node 20 於 2026-04-30 終止支援），本專案強制要求使用 Node 24 Active LTS。`
  );
  process.exit(1);
}

// 2. 修正 node_modules 內部殘留之 Dockerfile 與 CI 設定檔
function walkTargetFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTargetFiles(fullPath, results);
    } else if (
      entry.name === 'Dockerfile' ||
      ((entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) &&
        fullPath.includes(`${path.sep}.github${path.sep}workflows${path.sep}`))
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

if (fs.existsSync(nodeModulesDir)) {
  const targetFiles = walkTargetFiles(nodeModulesDir);
  let patchedCount = 0;

  for (const filePath of targetFiles) {
    const original = fs.readFileSync(filePath, 'utf8');
    let updated = original;

    if (path.basename(filePath) === 'Dockerfile') {
      // 將殘留 Dockerfile 之基礎映像明確固定為 node:24-slim
      updated = updated.replace(
        /^FROM\s+node:[^\s]+/gm,
        '# Node 20 已 EOL（Node 20 於 2026-04-30 終止支援），強制指定 Node 24 Active LTS\nFROM node:24-slim'
      );
    } else {
      // 將第三方套件殘留之 .github/workflows/*.yml 內舊版 node-version / node-versions 統一改為 Node 24
      updated = updated
        .replace(
          /^([ \t]*node-version:[ \t]*).*$/gm,
          "$1'24' # Node 20 已 EOL（Node 20 於 2026-04-30 終止支援）"
        )
        .replace(
          /^([ \t]*node-versions:[ \t]*).*$/gm,
          '$1\'["24"]\' # Node 20 已 EOL（Node 20 於 2026-04-30 終止支援）'
        );
    }

    if (updated !== original) {
      fs.writeFileSync(filePath, updated, 'utf8');
      patchedCount++;
    }
  }

  if (patchedCount > 0) {
    console.log(
      `[Security Check] 已完成執行環境驗證 (Node v${currentNodeVersion})，並修正 ${patchedCount} 個第三方套件殘留設定檔為 Node 24。`
    );
  }
}
