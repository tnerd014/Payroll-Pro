import fs from 'node:fs';
import path from 'node:path';

const repo = process.env.GITHUB_REPOSITORY || 'tnerd014/Payroll-Pro';
const tagName = process.env.GITHUB_REF_NAME || process.env.npm_package_version || 'v1.0.0';
const version = String(tagName).replace(/^v/i, '');
const releaseUrl = `https://github.com/${repo}/releases/tag/${tagName}`;
const releaseDownloadBase = `https://github.com/${repo}/releases/download/${tagName}`;
const outputPath = path.resolve(process.cwd(), 'release/latest.json');

const manifest = {
  version,
  tag: tagName,
  releaseUrl,
  publishedAt: new Date().toISOString(),
  platforms: {
    windows: {
      installer: `${releaseDownloadBase}/Payroll-Pro-Setup-${version}.exe`,
      portable: `${releaseDownloadBase}/Payroll-Pro-${version}.exe`,
      releaseNotesUrl: releaseUrl,
    },
    android: {
      apk: `${releaseDownloadBase}/app-release.apk`,
      bundle: `${releaseDownloadBase}/app-release.aab`,
      installGuideUrl: releaseUrl,
    },
  },
  notes: 'Payroll Pro release manifest for desktop and Android update checks.'
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Release manifest written to ${outputPath}`);
console.log(JSON.stringify({ version, tagName, releaseUrl }, null, 2));
