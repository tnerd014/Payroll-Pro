import fs from 'node:fs';
import path from 'node:path';

const repo = process.env.GITHUB_REPOSITORY || 'tnerd014/Payroll-Pro';
let pkgVersion = '1.0.9';
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (pkg.version) pkgVersion = pkg.version;
} catch {}

const rawTag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME;
const tagName = (rawTag && rawTag.startsWith('v')) ? rawTag : `v${pkgVersion}`;
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
