const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

