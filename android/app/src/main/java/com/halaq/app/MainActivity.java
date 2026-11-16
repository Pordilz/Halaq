package com.halaq.app;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.io.File;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "HalaqIntegrity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Screen-capture shielding: keep the WebView out of screenshots,
        // screen recordings and the "recent apps" preview. This holds session
        // tokens and financial data, so it must not be capturable by default.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);

        super.onCreate(savedInstanceState);
        checkDeviceIntegrity();
    }

    /**
     * Conservative, NON-BLOCKING integrity signal. Root detection is a
     * heuristic (a rooted device can evade it), never a security boundary.
     * We only log a warning and tell the web layer so it can warn the user —
     * we never crash, exit, or lock anyone out.
     */
    private void checkDeviceIntegrity() {
        boolean compromised = false;

        // 1. Common su binaries / root manager APKs.
        String[] rootPaths = {
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
        };
        for (String path : rootPaths) {
            if (new File(path).exists()) {
                compromised = true;
                break;
            }
        }

        // 2. Development/test build tags are common on rooted custom ROMs.
        if (!compromised && Build.TAGS != null && Build.TAGS.contains("test-keys")) {
            compromised = true;
        }

        if (!compromised) return;

        Log.w(TAG, "Device appears rooted (heuristic); warning web layer only.");
        notifyWebLayer();
    }

    /** Post a custom event the web layer can listen for; failures are ignored. */
    private void notifyWebLayer() {
        final String js = "window.dispatchEvent(new CustomEvent('halaq:device-integrity',"
            + "{detail:{compromised:true}}));";
        try {
            if (getBridge() != null) {
                final WebView webView = getBridge().getWebView();
                if (webView != null) {
                    // Defer until the WebView's message queue is ready.
                    webView.post(() -> webView.evaluateJavascript(js, null));
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not post integrity event to the WebView", e);
        }
    }
}
