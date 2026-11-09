export interface GitHubReleaseCheckResult {
  success: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  assetUrl?: string;
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

export const GITHUB_REPO = 'tnerd014/Payroll-Pro';
export const DEFAULT_APP_VERSION = '1.0.6';

export function normalizeReleaseVersion(value: string): string {
  return String(value || '').trim().replace(/^v/i, '');
}

export async function getRuntimeAppVersion(fallback = DEFAULT_APP_VERSION): Promise<string> {
  try {
    if (typeof window !== 'undefined') {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.getVersion) {
        const ver = await electronAPI.getVersion();
        if (ver) return normalizeReleaseVersion(ver);
      }
      const androidUpdater = (window as any).AndroidUpdater;
      if (androidUpdater?.getVersion) {
        const ver = androidUpdater.getVersion();
        if (ver) return normalizeReleaseVersion(ver);
      }
    }
  } catch {
    // Fallback to constant
  }
  return normalizeReleaseVersion(fallback);
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
    const resolvedCurrent = normalizeReleaseVersion(currentVersion || await getRuntimeAppVersion());
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Payroll-Pro-App-Update-Checker',
    };

    let response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers,
      cache: 'no-store',
    });

    let payload: any = null;
    if (response.ok) {
      payload = await response.json();
    } else {
      // Fallback: check the releases list in case latest is still indexing or marked pre-release
      const listResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=5`, {
        headers,
        cache: 'no-store',
      });
      if (listResponse.ok) {
        const list = await listResponse.json();
        if (Array.isArray(list) && list.length > 0) {
          payload = list.find((r: any) => !r.draft) || list[0];
        }
      }
      if (!payload) {
        return {
          success: false,
          currentVersion: resolvedCurrent,
          error: `GitHub release check failed (HTTP ${response.status}).`,
        };
      }
    }

    const latestVersion = normalizeReleaseVersion(payload?.tag_name || payload?.name || '');
    const releaseUrl = payload?.html_url || `https://github.com/${GITHUB_REPO}/releases`;
    const assets: any[] = Array.isArray(payload?.assets) ? payload.assets : [];

    const exeInstallerAsset = assets.find((candidate: any) => {
      const fileName = String(candidate?.name || '').toLowerCase();
      return fileName.endsWith('.exe') && fileName.includes('setup') && !fileName.includes('blockmap');
    }) || assets.find((candidate: any) => {
      const fileName = String(candidate?.name || '').toLowerCase();
      return fileName.endsWith('.exe') && !fileName.includes('blockmap') && !fileName.includes('portable');
    }) || assets.find((candidate: any) => String(candidate?.name || '').toLowerCase().endsWith('.exe'));

    const exePortableAsset = assets.find((candidate: any) => {
      const fileName = String(candidate?.name || '').toLowerCase();
      return fileName.endsWith('.exe') && !fileName.includes('setup') && !fileName.includes('blockmap');
    });

    const apkAsset = assets.find((candidate: any) => {
      const fileName = String(candidate?.name || '').toLowerCase();
      return fileName.endsWith('.apk');
    });

    const aabAsset = assets.find((candidate: any) => {
      const fileName = String(candidate?.name || '').toLowerCase();
      return fileName.endsWith('.aab');
    });

    if (!latestVersion) {
      return {
        success: false,
        currentVersion: resolvedCurrent,
        error: 'No release version was returned from GitHub.',
      };
    }

    const tagName = payload?.tag_name || `v${latestVersion}`;
    const releaseDownloadBase = `https://github.com/${GITHUB_REPO}/releases/download/${tagName}`;
    const result = compareReleaseVersions(resolvedCurrent, latestVersion);
    const windowsInstallerUrl = exeInstallerAsset?.browser_download_url || `${releaseDownloadBase}/Payroll-Pro-Setup-${latestVersion}.exe`;
    const windowsPortableUrl = exePortableAsset?.browser_download_url || `${releaseDownloadBase}/Payroll-Pro-${latestVersion}.exe`;
    const androidApkUrl = apkAsset?.browser_download_url || `${releaseDownloadBase}/app-release.apk`;
    const androidBundleUrl = aabAsset?.browser_download_url || `${releaseDownloadBase}/app-release.aab`;

    const isAndroidDevice = typeof navigator !== 'undefined' && (/android/i.test(navigator.userAgent) || Boolean((window as any).AndroidUpdater));
    const primaryAssetUrl = isAndroidDevice ? androidApkUrl : windowsInstallerUrl;

    return {
      success: true,
      currentVersion: resolvedCurrent,
      latestVersion,
      releaseUrl,
      assetUrl: primaryAssetUrl,
      upToDate: result >= 0,
      updateAvailable: result < 0,
      assetUrls: {
        windowsInstaller: windowsInstallerUrl,
        windowsPortable: windowsPortableUrl,
        androidApk: androidApkUrl,
        androidBundle: androidBundleUrl,
      },
    };
  } catch (error) {
    return {
      success: false,
      currentVersion: normalizeReleaseVersion(currentVersion || DEFAULT_APP_VERSION),
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

  if (typeof window !== 'undefined' && (window as any).AndroidUpdater?.openUrl) {
    (window as any).AndroidUpdater.openUrl(url);
    return;
  }

  if (typeof window !== 'undefined') {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      window.location.href = url;
    }
  }
}
