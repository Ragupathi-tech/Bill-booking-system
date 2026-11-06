$ErrorActionPreference = "Stop"

$BUILD_TOOLS = "C:\Android\build-tools\34.0.0"
$PLATFORM_JAR = "C:\Android\platforms\android-34\android.jar"
$WORK_DIR = "C:\Users\Hp\Documents\billbook\build-temp"
$OUTPUT_APK = "C:\Users\Hp\Documents\billbook\public\Sushi-Hotel-POS.apk"

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

Write-Host "Creating clean build directory..."
if (Test-Path $WORK_DIR) { Remove-Item -Recurse -Force $WORK_DIR }
New-Item -ItemType Directory -Force -Path "$WORK_DIR\src\com\sushihotel\pos" | Out-Null
New-Item -ItemType Directory -Force -Path "$WORK_DIR\res\values" | Out-Null
New-Item -ItemType Directory -Force -Path "$WORK_DIR\res\mipmap-hdpi" | Out-Null
New-Item -ItemType Directory -Force -Path "$WORK_DIR\classes" | Out-Null
New-Item -ItemType Directory -Force -Path "$WORK_DIR\compiled_res" | Out-Null

# Copy app icon if available
if (Test-Path "android\app\src\main\res\mipmap-hdpi\ic_launcher.png") {
    Copy-Item "android\app\src\main\res\mipmap-hdpi\ic_launcher.png" "$WORK_DIR\res\mipmap-hdpi\ic_launcher.png"
}

# 1. Manifest
$manifestContent = @"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.sushihotel.pos"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:usesCleartextTraffic="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
"@
[System.IO.File]::WriteAllText("$WORK_DIR\AndroidManifest.xml", $manifestContent, $utf8NoBom)

# 2. Strings
$stringsContent = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Sushi Hotel POS</string>
</resources>
"@
[System.IO.File]::WriteAllText("$WORK_DIR\res\values\strings.xml", $stringsContent, $utf8NoBom)

# 3. Java source
$javaContent = @"
package com.sushihotel.pos;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.KeyEvent;
import android.graphics.Color;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0f172a"));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        // Connect to active POS server on current local network
        webView.loadUrl("http://10.245.154.194:3001/");
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
"@
[System.IO.File]::WriteAllText("$WORK_DIR\src\com\sushihotel\pos\MainActivity.java", $javaContent, $utf8NoBom)

Write-Host "Compiling resources with aapt2..."
& "$BUILD_TOOLS\aapt2.exe" compile --dir "$WORK_DIR\res" -o "$WORK_DIR\compiled_res.zip"

Write-Host "Linking APK with aapt2..."
& "$BUILD_TOOLS\aapt2.exe" link -o "$WORK_DIR\base.apk" -I $PLATFORM_JAR --manifest "$WORK_DIR\AndroidManifest.xml" "$WORK_DIR\compiled_res.zip" --auto-add-overlay --java "$WORK_DIR\src"

Write-Host "Compiling Java with javac..."
$javaFiles = Get-ChildItem -Path "$WORK_DIR\src" -Recurse -Filter "*.java" | ForEach-Object { $_.FullName }
& javac --release 17 -cp $PLATFORM_JAR -d "$WORK_DIR\classes" $javaFiles

Write-Host "Translating class files to Dalvik DEX with d8..."
$classFiles = Get-ChildItem -Path "$WORK_DIR\classes" -Recurse -Filter "*.class" | ForEach-Object { $_.FullName }
cmd /c "$BUILD_TOOLS\d8.bat --lib $PLATFORM_JAR --output $WORK_DIR $classFiles"

Write-Host "Adding classes.dex into base.apk..."
cmd /c "cd /d $WORK_DIR && jar -uf base.apk classes.dex"

Write-Host "Zipaligning APK..."
& "$BUILD_TOOLS\zipalign.exe" -p -f 4 "$WORK_DIR\base.apk" "$WORK_DIR\aligned.apk"

Write-Host "Generating debug keystore if needed..."
$KEYSTORE = "$WORK_DIR\debug.keystore"
& keytool -genkeypair -v -keystore $KEYSTORE -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"

Write-Host "Signing APK with apksigner..."
cmd /c "$BUILD_TOOLS\apksigner.bat sign --ks $KEYSTORE --ks-pass pass:android --key-pass pass:android --out $OUTPUT_APK $WORK_DIR\aligned.apk"

Write-Host "Verifying final APK..."
cmd /c "$BUILD_TOOLS\apksigner.bat verify $OUTPUT_APK"

Write-Host "SUCCESS! APK created at: $OUTPUT_APK"
$apkSize = (Get-Item $OUTPUT_APK).Length
Write-Host "APK Size: $([math]::Round($apkSize / 1KB, 2)) KB"
