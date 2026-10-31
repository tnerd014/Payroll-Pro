export interface GitHubReleaseCheckResult {
  success: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  upToDate?: boolean;
  updateAvailable?: boolean;
  error?: string;
  assetUrls?: {
    windowsInstaller?: string;
    windowsPortable?: string;
    androidApk?: string;
    androidBundle?: string;
  };
}

export const GITHUB_REPO = 'tunde014/Payroll-Pro';

export function normalizeReleaseVersion(value: string): string {
  return String(value || '').trim().replace(/^v/i, '');
}

export function compareReleaseVersions(current: string, incoming: string): number {
  const currentParts = normalizeReleaseVersion(current).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const incomingParts = normalizeReleaseVersion(incoming).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(currentParts.length, incomingParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const incomingPart = incomingParts[index] ?? 0;
    if (incomingPart > currentPart) return 1;
    if (incomingPart < currentPart) return -1;
  }

  return 0;
}

export async function checkForGithubReleaseUpdate(currentVersion: string): Promise<GitHubReleaseCheckResult> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Payroll-Pro-App-Update-Checker',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        currentVersion,
        error: `GitHub release check failed (HTTP ${response.status}).`,
      };
    }

    const payload = await response.json();
    const latestVersion = normalizeReleaseVersion(payload?.tag_name || payload?.name || '');
    const releaseUrl = payload?.html_url || `https://github.com/${GITHUB_REPO}/releases`;

    if (!latestVersion) {
      return {
        success: false,
        currentVersion,
        error: 'No release version was returned from GitHub.',
      };
    }

    const tagName = payload?.tag_name || latestVersion;
    const releaseDownloadBase = `https://github.com/${GITHUB_REPO}/releases/download/${tagName}`;
    const result = compareReleaseVersions(currentVersion, latestVersion);

    return {
      success: true,
      currentVersion,
      latestVersion,
      releaseUrl,
      upToDate: result >= 0,
      updateAvailable: result < 0,
      assetUrls: {
        windowsInstaller: `${releaseDownloadBase}/Payroll-Pro-Setup-${latestVersion}-x64.exe`,
        windowsPortable: `${releaseDownloadBase}/Payroll-Pro-Portable-${latestVersion}.exe`,
        androidApk: `${releaseDownloadBase}/app-release.apk`,
        androidBundle: `${releaseDownloadBase}/app-release.aab`,
      },
    };
  } catch (error) {
    return {
      success: false,
      currentVersion,
      error: error instanceof Error ? error.message : 'Unable to check for updates right now.',
    };
  }
}

export function openExternalReleaseLink(url?: string): void {
  if (!url) return;
  if (typeof window !== 'undefined' && (window as any).electronAPI?.openUpdateRelease) {
    (window as any).electronAPI.openUpdateRelease(url);
    return;
  }

  if (typeof window !== 'undefined') {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      window.location.href = url;
    }
  }
}
