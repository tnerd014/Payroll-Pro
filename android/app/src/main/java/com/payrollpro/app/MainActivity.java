package com.payrollpro.app;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupPrintBridge();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupPrintBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupPrintBridge();
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
}
