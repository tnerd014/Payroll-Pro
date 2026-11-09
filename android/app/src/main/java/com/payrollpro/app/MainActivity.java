package com.payrollpro.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.print.PdfPrintHelper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.util.Properties;
import java.util.concurrent.Executor;
import javax.activation.DataHandler;
import javax.mail.Authenticator;
import javax.mail.Message;
import javax.mail.Multipart;
import javax.mail.PasswordAuthentication;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.mail.util.ByteArrayDataSource;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupPrintBridge();
        setupBiometricBridge();
        setupSmtpBridge();
        setupUpdaterBridge();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupPrintBridge();
        setupBiometricBridge();
        setupSmtpBridge();
        setupUpdaterBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupPrintBridge();
        setupBiometricBridge();
        setupSmtpBridge();
        setupUpdaterBridge();
    }

    // ----------------------------------------------
    // App Updater Bridge (Version & External APK Download)
    // ----------------------------------------------
    private void setupUpdaterBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public String getVersion() {
                        try {
                            PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                            return pInfo.versionName != null ? pInfo.versionName : "1.0.6";
                        } catch (Exception e) {
                            return "1.0.6";
                        }
                    }

                    @JavascriptInterface
                    public void openUrl(final String url) {
                        if (url == null || url.trim().isEmpty()) return;
                        runOnUiThread(() -> {
                            try {
                                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(intent);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        });
                    }
                }, "AndroidUpdater");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ----------------------------------------------
    // Print Bridge
    // ----------------------------------------------
    private void setupPrintBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void print() {
                        runOnUiThread(() -> {
                            try {
                                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                                if (printManager != null) {
                                    PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter("Payslips");
                                    printManager.print("Payslip Document", printAdapter, new PrintAttributes.Builder()
                                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                            .build());
                                }
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        });
                    }
                }, "AndroidPrinter");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ----------------------------------------------
    // Biometric Bridge
    // ----------------------------------------------
    private void setupBiometricBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public boolean isAvailable() {
                        try {
                            BiometricManager biometricManager = BiometricManager.from(MainActivity.this);
                            int canAuth;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                canAuth = biometricManager.canAuthenticate(
                                        BiometricManager.Authenticators.BIOMETRIC_STRONG |
                                                BiometricManager.Authenticators.DEVICE_CREDENTIAL);
                            } else {
                                canAuth = biometricManager.canAuthenticate(
                                        BiometricManager.Authenticators.BIOMETRIC_STRONG);
                            }
                            return canAuth == BiometricManager.BIOMETRIC_SUCCESS;
                        } catch (Exception e) {
                            return false;
                        }
                    }

                    @JavascriptInterface
                    public void authenticate(final String callbackId, final String title, final String subtitle) {
                        runOnUiThread(() -> {
                            try {
                                Executor executor = ContextCompat.getMainExecutor(MainActivity.this);
                                BiometricPrompt biometricPrompt = new BiometricPrompt(MainActivity.this, executor,
                                        new BiometricPrompt.AuthenticationCallback() {
                                            @Override
                                            public void onAuthenticationError(int errorCode,
                                                    @NonNull CharSequence errString) {
                                                super.onAuthenticationError(errorCode, errString);
                                                sendBiometricResult(callbackId, false, errString.toString());
                                            }

                                            @Override
                                            public void onAuthenticationSucceeded(
                                                    @NonNull BiometricPrompt.AuthenticationResult result) {
                                                super.onAuthenticationSucceeded(result);
                                                sendBiometricResult(callbackId, true, null);
                                            }

                                            @Override
                                            public void onAuthenticationFailed() {
                                                super.onAuthenticationFailed();
                                            }
                                        });

                                BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
                                        .setTitle(title != null && !title.isEmpty() ? title : "Biometric Verification");

                                if (subtitle != null && !subtitle.isEmpty()) {
                                    builder.setSubtitle(subtitle);
                                }

                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                                    builder.setAllowedAuthenticators(
                                            BiometricManager.Authenticators.BIOMETRIC_STRONG |
                                                    BiometricManager.Authenticators.DEVICE_CREDENTIAL);
                                } else {
                                    builder.setNegativeButtonText("Cancel");
                                }

                                biometricPrompt.authenticate(builder.build());
                            } catch (Exception e) {
                                sendBiometricResult(callbackId, false, e.getMessage());
                            }
                        });
                    }

                    private void sendBiometricResult(String callbackId, boolean success, String error) {
                        runOnUiThread(() -> {
                            try {
                                WebView wv = getBridge().getWebView();
                                String cleanError = error != null ? JSONObject.quote(error) : "null";
                                String script = String.format(
                                        "window.__handleAndroidBiometric && window.__handleAndroidBiometric('%s', %b, %s);",
                                        callbackId, success, cleanError);
                                wv.evaluateJavascript(script, null);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        });
                    }
                }, "AndroidBiometric");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ----------------------------------------------
    // Native SMTP Bridge
    // Exposed as window.AndroidSMTP in the WebView.
    // All methods run on a background thread to avoid
    // blocking the UI (Android NetworkOnMainThread).
    // Results are posted back via evaluateJavascript.
    // ----------------------------------------------
    private void setupSmtpBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.addJavascriptInterface(new SmtpBridge(webView), "AndroidSMTP");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private class SmtpBridge {
        private final WebView webView;

        SmtpBridge(WebView webView) {
            this.webView = webView;
        }

        /**
         * Tests an SMTP connection.
         * Called from JS as: AndroidSMTP.testConnection(callbackId, smtpJson)
         * smtpJson: { host, port, user, pass, secure, fromEmail }
         */
        @JavascriptInterface
        public void testConnection(final String callbackId, final String smtpJson) {
            new Thread(() -> {
                try {
                    JSONObject cfg = new JSONObject(smtpJson);
                    int port = cfg.getInt("port");
                    boolean secure = cfg.optBoolean("secure", port == 465);
                    Session session = buildSession(cfg);
                    Transport transport = session.getTransport(secure ? "smtps" : "smtp");
                    transport.connect(
                            cfg.getString("host"),
                            port,
                            cfg.getString("user"),
                            cfg.getString("pass"));
                    transport.close();
                    postSmtpResult(callbackId, true, null);
                } catch (Exception e) {
                    postSmtpResult(callbackId, false, e.getMessage());
                }
            }).start();
        }

        /**
         * Sends a payslip email with optional base64-encoded PDF attachment.
         * Called from JS as: AndroidSMTP.sendEmail(callbackId, payloadJson)
         * payloadJson: { smtp:{host,port,user,pass,secure,fromEmail}, recipient,
         * subject, body, htmlContent, attachPdf, fileName, pdfBase64? }
         */
        @JavascriptInterface
        public void sendEmail(final String callbackId, final String payloadJson) {
            try {
                JSONObject payload = new JSONObject(payloadJson);
                JSONObject cfg = payload.getJSONObject("smtp");
                boolean attachPdf = payload.optBoolean("attachPdf", false);
                String htmlContent = payload.optString("htmlContent", "");
                String pdfBase64 = payload.optString("pdfBase64", "");

                if (attachPdf) {
                    if (!pdfBase64.isEmpty()) {
                        byte[] pdfBytes = Base64.decode(pdfBase64, Base64.DEFAULT);
                        sendMimeMessage(callbackId, payload, cfg, pdfBytes);
                    } else if (!htmlContent.isEmpty()) {
                        // Generate PDF natively from HTML using Android PrintDocumentAdapter
                        generatePdfFromHtml(htmlContent, new PdfPrintHelper.Callback() {
                            @Override
                            public void onSuccess(byte[] pdfBytes) {
                                sendMimeMessage(callbackId, payload, cfg, pdfBytes);
                            }

                            @Override
                            public void onError(Exception error) {
                                // Fallback: dispatch without attachment if PDF layout fails
                                sendMimeMessage(callbackId, payload, cfg, null);
                            }
                        });
                    } else {
                        sendMimeMessage(callbackId, payload, cfg, null);
                    }
                } else {
                    sendMimeMessage(callbackId, payload, cfg, null);
                }
            } catch (Exception e) {
                postSmtpResult(callbackId, false, e.getMessage());
            }
        }

        private void sendMimeMessage(final String callbackId, JSONObject payload, JSONObject cfg, byte[] pdfBytes) {
            new Thread(() -> {
                try {
                    int port = cfg.getInt("port");
                    boolean secure = cfg.optBoolean("secure", port == 465);
                    Session session = buildSession(cfg);

                    String fromEmail = cfg.optString("fromEmail", "").trim();
                    if (fromEmail.isEmpty()) {
                        fromEmail = cfg.optString("user", "").trim();
                    }
                    String fromName = payload.optString("fromName", "Payroll Pro").trim();
                    if (fromName.isEmpty()) {
                        fromName = "Payroll Pro";
                    }
                    String recipient = payload.optString("recipient", "").trim();
                    if (recipient.isEmpty()) {
                        postSmtpResult(callbackId, false, "Recipient email address is empty.");
                        return;
                    }
                    String subject = payload.getString("subject");
                    String body = payload.optString("body", "");
                    String htmlContent = payload.optString("htmlContent", "");
                    String fileName = payload.optString("fileName", "payslip.pdf");

                    MimeMessage message = new MimeMessage(session);
                    message.setFrom(new InternetAddress(fromEmail, fromName));
                    message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipient));
                    message.setSubject(subject, "UTF-8");

                    // Build multipart body
                    Multipart multipart = new MimeMultipart();

                    // Plain text fallback
                    MimeBodyPart textPart = new MimeBodyPart();
                    textPart.setText(body, "UTF-8");
                    multipart.addBodyPart(textPart);

                    // HTML part
                    if (!htmlContent.isEmpty()) {
                        MimeBodyPart htmlPart = new MimeBodyPart();
                        htmlPart.setContent(htmlContent, "text/html; charset=UTF-8");
                        multipart.addBodyPart(htmlPart);
                    }

                    // PDF attachment
                    if (pdfBytes != null && pdfBytes.length > 0) {
                        MimeBodyPart pdfPart = new MimeBodyPart();
                        pdfPart.setDataHandler(new DataHandler(new ByteArrayDataSource(pdfBytes, "application/pdf")));
                        pdfPart.setFileName(fileName);
                        pdfPart.setDisposition(MimeBodyPart.ATTACHMENT);
                        multipart.addBodyPart(pdfPart);
                    }

                    message.setContent(multipart);

                    // Authenticate and send
                    Transport transport = session.getTransport(secure ? "smtps" : "smtp");
                    transport.connect(
                            cfg.getString("host"),
                            port,
                            cfg.getString("user"),
                            cfg.getString("pass"));
                    transport.sendMessage(message, message.getAllRecipients());
                    transport.close();

                    postSmtpResult(callbackId, true, null);
                } catch (Exception e) {
                    postSmtpResult(callbackId, false, e.getMessage());
                }
            }).start();
        }

        /** Builds a JavaMail Session matching the SMTP config. */
        private Session buildSession(JSONObject cfg) throws Exception {
            String host = cfg.getString("host");
            int port = cfg.getInt("port");
            boolean secure = cfg.optBoolean("secure", port == 465);
            String user = cfg.getString("user");
            String pass = cfg.getString("pass");

            Properties props = new Properties();
            props.put("mail.smtp.host", host);
            props.put("mail.smtp.port", String.valueOf(port));
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.ssl.trust", "*");
            props.put("mail.smtp.connectiontimeout", "25000");
            props.put("mail.smtp.timeout", "25000");
            props.put("mail.smtp.writetimeout", "25000");

            if (secure) {
                // SSL/TLS -- port 465
                props.put("mail.smtp.socketFactory.port", String.valueOf(port));
                props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
                props.put("mail.smtp.socketFactory.fallback", "false");
                props.put("mail.smtp.ssl.enable", "true");

                // Also populate standard SMTPS protocol properties
                props.put("mail.smtps.host", host);
                props.put("mail.smtps.port", String.valueOf(port));
                props.put("mail.smtps.auth", "true");
                props.put("mail.smtps.ssl.enable", "true");
                props.put("mail.smtps.ssl.trust", "*");
                props.put("mail.smtps.socketFactory.port", String.valueOf(port));
                props.put("mail.smtps.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
                props.put("mail.smtps.socketFactory.fallback", "false");
                props.put("mail.smtps.connectiontimeout", "25000");
                props.put("mail.smtps.timeout", "25000");
                props.put("mail.smtps.writetimeout", "25000");
            } else {
                // STARTTLS -- port 587
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.smtp.starttls.required", "true");
            }

            return Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(user, pass);
                }
            });
        }

        /** Posts result back to the JS callback via evaluateJavascript. */
        private void postSmtpResult(String callbackId, boolean success, String error) {
            runOnUiThread(() -> {
                try {
                    String errorJson = error != null ? JSONObject.quote(error) : "null";
                    String script = String.format(
                            "window.__handleAndroidSmtp && window.__handleAndroidSmtp('%s', %b, %s);",
                            callbackId, success, errorJson);
                    webView.evaluateJavascript(script, null);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }

    // ----------------------------------------------
    // Native Headless HTML to PDF Converter
    // Native Headless HTML-to-PDF Converter
    // ----------------------------------------------
    private void generatePdfFromHtml(final String htmlContent, final PdfPrintHelper.Callback callback) {
        runOnUiThread(() -> {
            try {
                final WebView pdfWebView = new WebView(MainActivity.this);
                pdfWebView.getSettings().setJavaScriptEnabled(true);
                pdfWebView.getSettings().setDomStorageEnabled(true);
                pdfWebView.getSettings().setLoadWithOverviewMode(true);
                pdfWebView.getSettings().setUseWideViewPort(true);

                pdfWebView.setWebViewClient(new WebViewClient() {
                    private boolean isFinished = false;

                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (isFinished) return;
                        isFinished = true;

                        view.postDelayed(() -> {
                            try {
                                PrintAttributes attributes = new PrintAttributes.Builder()
                                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                        .setResolution(new PrintAttributes.Resolution("pdf", "pdf", 300, 300))
                                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                        .build();

                                final PrintDocumentAdapter adapter = pdfWebView.createPrintDocumentAdapter("payslip");
                                final File tempPdfFile = File.createTempFile("payslip_", ".pdf", getCacheDir());

                                PdfPrintHelper.printAdapterToFile(adapter, attributes, tempPdfFile, callback);
                            } catch (Exception e) {
                                callback.onError(e);
                            }
                        }, 500);
                    }
                });

                pdfWebView.loadDataWithBaseURL("https://localhost/", htmlContent, "text/html", "UTF-8", null);
            } catch (Exception e) {
                callback.onError(e);
            }
        });
    }
}
