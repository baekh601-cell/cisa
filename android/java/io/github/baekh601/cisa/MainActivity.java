package io.github.baekh601.cisa;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * CISA 마스터 — 앱 안의 웹앱(assets/www)을 WebView로 띄우고, 웹에서 할 수 없는 기능을 AndroidApp 브리지로 제공한다.
 * 업데이트 확인: 저장소 기본 브랜치의 android/version.json 을 읽어 versionCode가 더 크면 웹앱이 다운로드 안내를 띄운다.
 */
public class MainActivity extends Activity {
    static final String VERSION_URL = "https://raw.githubusercontent.com/baekh601-cell/cisa/HEAD/android/version.json";
    static final String START_URL = "file:///android_asset/www/index.html";
    static final int REQ_FILE = 41;

    WebView web;
    ValueCallback<Uri[]> fileCallback;
    long lastBack;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setBars("#0c1220", "#101828", false);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0c1220"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        web.addJavascriptInterface(new Bridge(), "AndroidApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("file".equals(u.getScheme())) return false;
                openExternal(u.toString());
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "백업 파일 선택"), REQ_FILE);
                    return true;
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
            }
        });

        setContentView(web);
        web.loadUrl(START_URL);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE) {
            if (fileCallback != null) fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    // 뒤로 가기: 먼저 웹앱(시트 닫기 → 이전 화면 → 홈)에 맡기고, 홈에서는 두 번 눌러 종료
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.App&&App.handleBack)?App.handleBack():false", v -> {
            if ("true".equals(v)) return;
            long now = System.currentTimeMillis();
            if (now - lastBack < 2000) {
                finish();
            } else {
                lastBack = now;
                Toast.makeText(this, "한 번 더 누르면 종료합니다", Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    protected void onPause() {
        if (web != null) {
            web.evaluateJavascript("window.App&&App.onAppPause&&App.onAppPause()", null);
            web.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception e) {
            Toast.makeText(this, "링크를 열 수 없습니다", Toast.LENGTH_SHORT).show();
        }
    }

    @SuppressWarnings("deprecation")
    void setBars(String status, String nav, boolean light) {
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor(status));
        w.setNavigationBarColor(Color.parseColor(nav));
        int flags = w.getDecorView().getSystemUiVisibility();
        if (Build.VERSION.SDK_INT >= 23) {
            flags = light ? flags | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR : flags & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        }
        if (Build.VERSION.SDK_INT >= 26) {
            flags = light ? flags | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : flags & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        w.getDecorView().setSystemUiVisibility(flags);
    }

    static String httpGet(String address) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(address).openConnection();
            c.setConnectTimeout(8000);
            c.setReadTimeout(8000);
            c.setUseCaches(false);
            if (c.getResponseCode() != 200) return null;
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                return new String(out.toByteArray(), StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    /** 웹앱에서 window.AndroidApp 으로 호출하는 기능 */
    class Bridge {
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public String appVersion() {
            try {
                PackageInfo p = getPackageManager().getPackageInfo(getPackageName(), 0);
                long code = Build.VERSION.SDK_INT >= 28 ? p.getLongVersionCode() : p.versionCode;
                return p.versionName + "|" + code;
            } catch (Exception e) {
                return "0|0";
            }
        }

        @JavascriptInterface
        public void checkUpdate(final boolean manual) {
            new Thread(() -> {
                String body = httpGet(VERSION_URL + "?t=" + System.currentTimeMillis());
                final String js = "window.App&&App.onUpdateInfo&&App.onUpdateInfo(" + (body == null ? "null" : JSONObject.quote(body)) + "," + manual + ")";
                runOnUiThread(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            runOnUiThread(() -> openExternal(url));
        }

        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("CISA 백업", text));
            });
        }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void vibrate(String pattern) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                String[] parts = pattern.split(",");
                long[] t = new long[parts.length + 1];
                for (int i = 0; i < parts.length; i++) t[i + 1] = Long.parseLong(parts[i].trim());
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(t, -1));
                else v.vibrate(t, -1);
            } catch (Exception ignored) {
                // 진동 미지원 기기
            }
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface
        public void setTheme(final boolean light) {
            runOnUiThread(() -> setBars(light ? "#f3f5fa" : "#0c1220", light ? "#eaeef6" : "#101828", light));
        }

        /** 백업 저장: Android 10+ 는 다운로드 폴더, 그 이하는 공유 메뉴. 결과: downloads | share | fail */
        @JavascriptInterface
        public String saveFile(String name, String text) {
            try {
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                    cv.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (uri == null) return "fail";
                    try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                        if (os == null) return "fail";
                        os.write(text.getBytes(StandardCharsets.UTF_8));
                    }
                    cv.clear();
                    cv.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    getContentResolver().update(uri, cv, null, null);
                    return "downloads";
                }
                final Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_SUBJECT, name);
                i.putExtra(Intent.EXTRA_TEXT, text);
                runOnUiThread(() -> startActivity(Intent.createChooser(i, "백업 저장")));
                return "share";
            } catch (Exception e) {
                return "fail";
            }
        }
    }
}
