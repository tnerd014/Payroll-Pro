const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

let mainWindow = null;
let updateState = {
  status: 'idle',
  version: '',
  latestVersion: '',
  releaseUrl: '',
  downloadUrl: '',
  downloadPath: '',
  downloadPercent: 0,
  message: '',
  restartRequired: false,
};
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const GITHUB_REPO = 'tnerd014/Payroll-Pro';

function emitUpdateState(nextState = {}) {
  updateState = { ...updateState, ...nextState };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-state-changed', updateState);
  }
}

function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/i, '');
}

function compareVersions(current, incoming) {
  const currentParts = normalizeVersion(current).split('.').map(v => Number.parseInt(v, 10) || 0);
  const incomingParts = normalizeVersion(incoming).split('.').map(v => Number.parseInt(v, 10) || 0);

  const maxLength = Math.max(currentParts.length, incomingParts.length);
  for (let i = 0; i < maxLength; i++) {
    const currentPart = currentParts[i] || 0;
    const incomingPart = incomingParts[i] || 0;
    if (incomingPart > currentPart) return 1;
    if (incomingPart < currentPart) return -1;
  }
  return 0;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Custom Antigravity Frameless Title Bar
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff',
    show: false,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: isDev, // Disable DevTools console in installed production app
    },
  });

  // Security: Lock down console/DevTools in production/installed builds
  if (!isDev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });

    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        input.key === 'F12' ||
        (input.control && input.shift && ['I', 'i', 'J', 'j', 'C', 'c'].includes(input.key))
      ) {
        event.preventDefault();
      }
    });

    mainWindow.webContents.on('context-menu', (event) => {
      event.preventDefault();
    });
  }

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174';
  if (isDev) {
    const tryLoad = () => {
      if (!mainWindow) return;
      mainWindow.loadURL(devUrl).catch(() => {
        setTimeout(tryLoad, 1000);
      });
    };
    tryLoad();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default browser and deny arbitrary protocols/popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Security: Prevent in-app navigation to arbitrary external websites
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isAppUrl = isDev 
      ? url.startsWith(devUrl) 
      : url.startsWith('file:');
    if (!isAppUrl) {
      event.preventDefault();
      if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // Quiet background update check (5s after startup and every 4 hours in production)
    if (!isDev) {
      setTimeout(() => {
        performUpdateCheck().catch(() => {});
      }, 5000);

      setInterval(() => {
        performUpdateCheck().catch(() => {});
      }, 4 * 60 * 60 * 1000);
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Native Window Controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.on('window-reload', () => {
  if (mainWindow) mainWindow.webContents.reload();
});

ipcMain.on('window-force-reload', () => {
  if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
});

ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('get-update-state', () => updateState);

async function performUpdateCheck() {
  const currentVersion = app.getVersion();
  let latestVersion = '';
  let releaseUrl = `https://github.com/${GITHUB_REPO}/releases`;
  let assetUrl = '';

  // 1. Primary Strategy: Check static latest.yml on GitHub Releases (Rate-limit immune CDN)
  try {
    const ymlRes = await fetch(`https://github.com/${GITHUB_REPO}/releases/latest/download/latest.yml`, {
      headers: { 'User-Agent': 'Payroll-Pro-Desktop-App' },
    });
    if (ymlRes.ok) {
      const ymlText = await ymlRes.text();
      const versionMatch = ymlText.match(/version:\s*([^\r\n]+)/i);
      const pathMatch = ymlText.match(/(?:path|url):\s*([^\r\n]+\.exe)/i);
      if (versionMatch && versionMatch[1]) {
        latestVersion = normalizeVersion(versionMatch[1]);
        const assetName = pathMatch && pathMatch[1] ? pathMatch[1].trim() : `Payroll-Pro-Setup-${latestVersion}.exe`;
        assetUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${latestVersion}/${assetName}`;
        releaseUrl = `https://github.com/${GITHUB_REPO}/releases/tag/v${latestVersion}`;
      }
    }
  } catch (err) {
    console.warn('Direct latest.yml check failed, falling back:', err);
  }

  // 2. Secondary Strategy: Check latest.json manifest
  if (!latestVersion) {
    try {
      const jsonRes = await fetch(`https://github.com/${GITHUB_REPO}/releases/latest/download/latest.json`, {
        headers: { 'User-Agent': 'Payroll-Pro-Desktop-App' },
      });
      if (jsonRes.ok) {
        const manifest = await jsonRes.json();
        if (manifest && manifest.version) {
          latestVersion = normalizeVersion(manifest.version);
          releaseUrl = manifest.releaseUrl || releaseUrl;
          assetUrl = manifest.platforms?.windows?.installer || `https://github.com/${GITHUB_REPO}/releases/download/v${latestVersion}/Payroll-Pro-Setup-${latestVersion}.exe`;
        }
      }
    } catch (err) {
      console.warn('Direct latest.json check failed:', err);
    }
  }

  // 3. Fallback: GitHub REST API
  if (!latestVersion) {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Payroll-Pro-Desktop-App',
    };
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, { headers });
    if (response.ok) {
      const payload = await response.json();
      latestVersion = normalizeVersion(payload?.tag_name || payload?.name || '');
      releaseUrl = payload?.html_url || releaseUrl;
      const eligibleAsset = (payload?.assets || []).find((asset) => {
        const name = String(asset?.name || '').toLowerCase();
        return name.endsWith('.exe') && name.includes('setup') && !name.includes('blockmap');
      }) || (payload?.assets || []).find((asset) => {
        const name = String(asset?.name || '').toLowerCase();
        return name.endsWith('.exe') && !name.includes('blockmap') && !name.includes('portable');
      }) || (payload?.assets || []).find((asset) => String(asset?.name || '').toLowerCase().endsWith('.exe'));

      const tagName = payload?.tag_name || `v${latestVersion}`;
      assetUrl = eligibleAsset?.browser_download_url || `https://github.com/${GITHUB_REPO}/releases/download/${tagName}/Payroll-Pro-Setup-${latestVersion}.exe`;
    }
  }

  if (!latestVersion) {
    return {
      success: false,
      error: 'Unable to check for updates. Could not determine latest version.',
    };
  }

  const result = compareVersions(currentVersion, latestVersion);
  const updateAvailable = result < 0;

  if (updateAvailable && updateState.status === 'idle') {
    emitUpdateState({
      status: 'available',
      version: currentVersion,
      latestVersion,
      releaseUrl,
      downloadUrl: assetUrl,
      message: `Payroll Pro v${latestVersion} is available`,
    });
  }

  return {
    success: true,
    currentVersion,
    latestVersion,
    releaseUrl,
    assetUrl,
    upToDate: result >= 0,
    updateAvailable,
  };
}

ipcMain.handle('check-for-updates', async () => {
  try {
    return await performUpdateCheck();
  } catch (error) {
    return {
      success: false,
      error: error && error.message ? error.message : 'Unable to check for updates right now.',
    };
  }
});

ipcMain.handle('download-update', async (_, options = {}) => {
  try {
    const downloadUrl = options.downloadUrl || options.assetUrl || updateState.downloadUrl;
    if (!downloadUrl) {
      return { success: false, error: 'No installer URL was supplied for the update.' };
    }

    const targetVersion = options.latestVersion || updateState.latestVersion || app.getVersion();
    const updateDir = path.join(app.getPath('userData'), 'updates');
    if (!fs.existsSync(updateDir)) {
      fs.mkdirSync(updateDir, { recursive: true });
    }

    const finalPath = path.join(updateDir, `Payroll-Pro-Setup-${targetVersion}.exe`);
    const tempPath = path.join(updateDir, `Payroll-Pro-Setup-${targetVersion}.exe.part`);

    // If already fully downloaded and valid (>25MB), reuse it
    if (fs.existsSync(finalPath)) {
      const stats = fs.statSync(finalPath);
      if (stats.size > 25 * 1024 * 1024) {
        emitUpdateState({
          status: 'downloaded',
          version: app.getVersion(),
          latestVersion: targetVersion,
          releaseUrl: options.releaseUrl || updateState.releaseUrl || '',
          downloadUrl,
          downloadPath: finalPath,
          downloadPercent: 100,
          message: 'Update downloaded. Restart to install.',
          restartRequired: true,
        });
        return { success: true, downloadPath: finalPath, latestVersion: targetVersion, downloadPercent: 100 };
      }
    }

    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }

    emitUpdateState({
      status: 'downloading',
      version: app.getVersion(),
      latestVersion: targetVersion,
      releaseUrl: options.releaseUrl || updateState.releaseUrl || '',
      downloadUrl,
      downloadPath: finalPath,
      downloadPercent: 0,
      message: 'Downloading update…',
      restartRequired: false,
    });

    const response = await fetch(downloadUrl, {
      redirect: 'follow',
      headers: {
        Accept: 'application/octet-stream',
        'User-Agent': 'Payroll-Pro-Desktop-App',
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed with HTTP ${response.status}.`);
    }

    const contentLength = Number(response.headers.get('content-length') || '0');
    if (!response.body) {
      throw new Error('Download response body is empty.');
    }

    const fileStream = fs.createWriteStream(tempPath);
    const nodeStream = Readable.fromWeb(response.body);

    let downloaded = 0;
    let lastEmitPercent = -1;
    let lastEmitTime = 0;

    nodeStream.on('data', (chunk) => {
      downloaded += chunk.length;
      const now = Date.now();
      const percent = contentLength > 0
        ? Math.min(100, Math.max(0, Math.round((downloaded / contentLength) * 100)))
        : 0;

      // Throttle IPC state updates to avoid saturating renderer process
      if (percent !== lastEmitPercent && now - lastEmitTime > 150) {
        lastEmitPercent = percent;
        lastEmitTime = now;
        emitUpdateState({
          status: 'downloading',
          version: app.getVersion(),
          latestVersion: targetVersion,
          releaseUrl: options.releaseUrl || updateState.releaseUrl || '',
          downloadUrl,
          downloadPath: finalPath,
          downloadPercent: percent,
          message: `Downloading update… ${percent}%`,
          restartRequired: false,
        });
      }
    });

    await pipeline(nodeStream, fileStream);

    // Verify file integrity
    const fileStats = fs.statSync(tempPath);
    if (fileStats.size < 20 * 1024 * 1024) {
      fs.unlinkSync(tempPath);
      throw new Error(`Downloaded installer appears corrupted (${(fileStats.size / (1024 * 1024)).toFixed(1)}MB).`);
    }

    if (fs.existsSync(finalPath)) {
      try { fs.unlinkSync(finalPath); } catch {}
    }
    fs.renameSync(tempPath, finalPath);

    emitUpdateState({
      status: 'downloaded',
      version: app.getVersion(),
      latestVersion: targetVersion,
      releaseUrl: options.releaseUrl || updateState.releaseUrl || '',
      downloadUrl,
      downloadPath: finalPath,
      downloadPercent: 100,
      message: 'Download complete. Restart to install.',
      restartRequired: true,
    });

    return {
      success: true,
      downloadPath: finalPath,
      latestVersion: targetVersion,
      downloadPercent: 100,
    };
  } catch (error) {
    emitUpdateState({
      status: 'error',
      message: error && error.message ? error.message : 'Update download failed.',
      downloadPercent: 0,
      restartRequired: false,
    });
    return {
      success: false,
      error: error && error.message ? error.message : 'Update download failed.',
    };
  }
});

ipcMain.handle('install-pending-update', async () => {
  try {
    const installerPath = updateState.downloadPath;
    if (!installerPath || !fs.existsSync(installerPath)) {
      return { success: false, error: 'No downloaded installer was found.' };
    }

    try {
      const { spawn } = require('child_process');
      const child = spawn(installerPath, ['--updated'], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
    } catch {
      await shell.openPath(installerPath);
    }

    setTimeout(() => {
      app.isQuitting = true;
      app.quit();
    }, 500);
    return { success: true, installerPath };
  } catch (error) {
    return {
      success: false,
      error: error && error.message ? error.message : 'Unable to start the installation.',
    };
  }
});

ipcMain.handle('dismiss-update-notice', async () => {
  emitUpdateState({
    status: 'idle',
    version: app.getVersion(),
    latestVersion: '',
    releaseUrl: '',
    downloadUrl: '',
    downloadPath: '',
    downloadPercent: 0,
    message: '',
    restartRequired: false,
  });
  return { success: true };
});

ipcMain.handle('open-update-release', async (_, url) => {
  try {
    if (url) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'No release URL was supplied.' };
  } catch (error) {
    return { success: false, error: error && error.message ? error.message : 'Unable to open release page.' };
  }
});

ipcMain.handle('open-instruction-manual', async () => {
  try {
    const fs = require('fs');
    const candidates = [
      path.join(__dirname, '../Payroll_Pro_Instruction_Manual.pdf'),
      path.join(app.getAppPath(), 'Payroll_Pro_Instruction_Manual.pdf'),
      path.join(__dirname, '../public/Payroll_Pro_Instruction_Manual.pdf'),
      path.join(__dirname, '../dist/Payroll_Pro_Instruction_Manual.pdf'),
      path.join(process.resourcesPath || '', 'Payroll_Pro_Instruction_Manual.pdf'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        await shell.openPath(p);
        return { success: true, path: p };
      }
    }
    const devUrl = 'http://localhost:5174/Payroll_Pro_Instruction_Manual.pdf';
    await shell.openExternal(devUrl);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Render HTML to PDF Buffer via hidden offscreen BrowserWindow
async function renderHtmlToPdfBuffer(htmlContent) {
  const printWin = new BrowserWindow({
    show: false,
    width: 1024,
    height: 1400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      javascript: false,
    },
  });

  try {
    const dataUri = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    await printWin.loadURL(dataUri);
    // Allow font styles and CSS layout to fully stabilize
    await new Promise((resolve) => setTimeout(resolve, 350));
    const pdfBuffer = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: {
        marginType: 'custom',
        top: 0.3,
        bottom: 0.3,
        left: 0.3,
        right: 0.3,
      },
    });
    return pdfBuffer;
  } finally {
    if (!printWin.isDestroyed()) {
      printWin.destroy();
    }
  }
}

// IPC: Test SMTP Connection
ipcMain.handle('test-smtp-connection', async (event, config) => {
  try {
    const dns = require('dns');
    try { dns.setDefaultResultOrder('ipv4first'); } catch (e) {}

    const nodemailer = require('nodemailer');
    const port = Number(config.port) || 587;
    // Auto-align TLS protocol: Port 465 is implicit SSL/TLS; Port 587/25 is explicit STARTTLS
    const secure = port === 465 ? true : Boolean(config.secure && port !== 587 && port !== 25);

    const transporter = nodemailer.createTransport({
      host: (config.host || '').trim(),
      port: port,
      secure: secure,
      family: 4,
      auth: {
        user: (config.user || '').trim(),
        pass: (config.pass || '').trim().replace(/\s+/g, ''),
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 25000,
      greetingTimeout: 25000,
      socketTimeout: 25000,
    });
    await transporter.verify();
    return { success: true };
  } catch (err) {
    let msg = err.message || String(err);
    if (msg.includes('ETIMEDOUT') || msg.includes('timeout') || msg.includes('Greeting never received')) {
      msg = `Connection timeout: Could not establish handshake with ${config.host || 'mail server'} on port ${config.port || 587}. Please verify your internet connection, or confirm that your network/firewall permits outbound SMTP traffic.`;
    } else if (msg.includes('535') || msg.includes('BadCredentials') || msg.includes('Username and Password not accepted')) {
      msg = `Authentication rejected: Incorrect username or password. For Gmail, you MUST generate and use a 16-character Google 'App Password' instead of your personal password.`;
    }
    return { success: false, error: msg };
  }
});

// IPC: Render Payslip HTML to PDF Base64
ipcMain.handle('render-payslip-pdf', async (event, htmlContent) => {
  try {
    const buffer = await renderHtmlToPdfBuffer(htmlContent);
    return { success: true, base64: buffer.toString('base64') };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

// IPC: Send Payslip Email with PDF Attachment via Nodemailer
ipcMain.handle('send-payslip-email', async (event, payload) => {
  try {
    const nodemailer = require('nodemailer');
    const { smtp, recipient, subject, body, htmlContent, attachPdf, fileName } = payload;

    let attachments = [];
    if (attachPdf && htmlContent) {
      const pdfBuf = await renderHtmlToPdfBuffer(htmlContent);
      attachments.push({
        filename: fileName || 'Payslip.pdf',
        content: pdfBuf,
        contentType: 'application/pdf',
      });
    }

    const port = Number(smtp.port) || 587;
    const secure = port === 465 ? true : Boolean(smtp.secure && port !== 587 && port !== 25);

    const transporter = nodemailer.createTransport({
      host: (smtp.host || '').trim(),
      port: port,
      secure: secure,
      family: 4,
      auth: {
        user: (smtp.user || '').trim(),
        pass: (smtp.pass || '').trim().replace(/\s+/g, ''),
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 20000,
    });

    const info = await transporter.sendMail({
      from: `"${smtp.fromName || 'Payroll Department'}" <${smtp.fromEmail || smtp.user}>`,
      to: recipient,
      subject: subject,
      text: body,
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937; white-space: pre-wrap;">${body}</div>`,
      attachments,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('send-payslip-email IPC error:', err);
    return { success: false, error: err.message || String(err) };
  }
});

