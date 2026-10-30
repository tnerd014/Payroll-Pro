package com.payrollpro.app;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.concurrent.Executor;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupPrintBridge();
        setupBiometricBridge();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupPrintBridge();
        setupBiometricBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupPrintBridge();
        setupBiometricBridge();
    }

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
                                    BiometricManager.Authenticators.DEVICE_CREDENTIAL
                                );
                            } else {
                                canAuth = biometricManager.canAuthenticate(
                                    BiometricManager.Authenticators.BIOMETRIC_STRONG
                                );
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
                                BiometricPrompt biometricPrompt = new BiometricPrompt(MainActivity.this, executor, new BiometricPrompt.AuthenticationCallback() {
                                    @Override
                                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                                        super.onAuthenticationError(errorCode, errString);
                                        sendResult(callbackId, false, errString.toString());
                                    }

                                    @Override
                                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                                        super.onAuthenticationSucceeded(result);
                                        sendResult(callbackId, true, null);
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
                                        BiometricManager.Authenticators.DEVICE_CREDENTIAL
                                    );
                                } else {
                                    builder.setNegativeButtonText("Cancel");
                                }

                                biometricPrompt.authenticate(builder.build());
                            } catch (Exception e) {
                                sendResult(callbackId, false, e.getMessage());
                            }
                        });
                    }

                    private void sendResult(String callbackId, boolean success, String error) {
                        runOnUiThread(() -> {
                            try {
                                String cleanError = error != null ? JSONObject.quote(error) : "null";
                                String script = String.format("window.__handleAndroidBiometric && window.__handleAndroidBiometric('%s', %b, %s);", callbackId, success, cleanError);
                                webView.evaluateJavascript(script, null);
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
}
