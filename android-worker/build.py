#!/usr/bin/env python3
"""Appweld Android packaging worker.

Input spec: JSON file containing url, appName, iconPngBase64, splashColor and
optional packageName. Generates a native Android WebView wrapper project and,
when tools are installed, signed APK/AAB plus a signing-key recovery bundle.

This is a build component, NOT authorization/payment validation. The caller
must verify domain ownership and payment before invoking it in production.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import urllib.parse
import zipfile

MAX_ICON_BYTES = 2 * 1024 * 1024


def valid_spec(spec):
    url = urllib.parse.urlsplit(str(spec.get('url') or ''))
    if url.scheme != 'https' or not url.hostname or '.' not in url.hostname or url.username or url.password or url.port not in (None, 443):
        raise ValueError('A public HTTPS URL with no credentials or custom port is required')
    # Worker is not allowed to fetch an untrusted network URL. The API must
    # validate DNS/IP and redirects before approving a build.
    appname = str(spec.get('appName') or '').strip()
    if not (1 <= len(appname) <= 28) or any(ord(c) < 32 for c in appname):
        raise ValueError('App name must contain 1 to 28 printable characters')
    color = str(spec.get('splashColor') or '#D8E6B5').upper()
    if not re.fullmatch(r'#[0-9A-F]{6}', color):
        raise ValueError('Invalid splash color')
    icon = spec.get('iconPngBase64') or ''
    if icon.startswith('data:image/png;base64,'):
        icon = icon.split(',', 1)[1]
    try:
        png = base64.b64decode(icon, validate=True)
    except Exception as e:
        raise ValueError('Icon must be a base64-encoded PNG') from e
    if len(png) > MAX_ICON_BYTES or png[:8] != b'\x89PNG\r\n\x1a\n' or len(png) < 24:
        raise ValueError('Icon must be a valid PNG no larger than 2 MB')
    size = (int.from_bytes(png[16:20], 'big'), int.from_bytes(png[20:24], 'big'))
    if size != (512, 512):
        raise ValueError('Icon PNG must be 512 x 512')
    # Verify a proper PNG structure; header-only or truncated fake images are rejected.
    import zlib
    pos=8; ended=False
    while pos+12 <= len(png):
        length=int.from_bytes(png[pos:pos+4],'big')
        if length > MAX_ICON_BYTES or pos+12+length > len(png):
            raise ValueError('Icon PNG contains a malformed chunk')
        kind=png[pos+4:pos+8]; data=png[pos+8:pos+8+length]
        crc=int.from_bytes(png[pos+8+length:pos+12+length],'big')
        if zlib.crc32(kind+data) & 0xffffffff != crc:
            raise ValueError('Icon PNG checksum failed')
        pos+=12+length
        if kind == b'IEND':
            ended=True
            break
    if not ended or pos != len(png):
        raise ValueError('Icon PNG is incomplete')
    fingerprint = hashlib.sha256((url.hostname + str(spec.get('orderId') or '')).encode()).hexdigest()[:16]
    package = str(spec.get('packageName') or f'ai.appweld.customer.a{fingerprint}')
    if not re.fullmatch(r'(?:[a-z][a-z0-9_]*\.){2,}[a-z][a-z0-9_]*', package):
        raise ValueError('Invalid Android package name')
    return dict(url=urllib.parse.urlunsplit(url), appName=appname, splashColor=color, icon=png, packageName=package)


def android_java(url, color):
    java_url = json.dumps(url, ensure_ascii=True)
    java_host = json.dumps(urllib.parse.urlsplit(url).hostname, ensure_ascii=True)
    java_color = json.dumps(color, ensure_ascii=True)
    return r'''package ai.appweld.wrapper;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.WebResourceError;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;

public final class MainActivity extends Activity {
    private static final String HOME_URL = __URL__;
    private static final String ALLOWED_HOST = __HOST__;
    private WebView web;
    private ProgressBar loading;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.parseColor(__COLOR__));
        getWindow().setNavigationBarColor(Color.BLACK);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor(__COLOR__));
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSafeBrowsingEnabled(true);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri target = request.getUrl();
                if ("https".equalsIgnoreCase(target.getScheme()) && ALLOWED_HOST.equalsIgnoreCase(target.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, target)); } catch (Exception ignored) { }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) { loading.setVisibility(View.GONE); }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) loading.setVisibility(View.GONE);
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); // Never bypass invalid certificate errors.
                loading.setVisibility(View.GONE);
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        loading = new ProgressBar(this);
        FrameLayout.LayoutParams center = new FrameLayout.LayoutParams(90, 90, android.view.Gravity.CENTER);
        root.addView(loading, center);
        setContentView(root);
        web.loadUrl(HOME_URL);
    }
    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() { if (web != null) { web.destroy(); web = null; } super.onDestroy(); }
}
'''.replace('__URL__', java_url).replace('__HOST__', java_host).replace('__COLOR__',java_color)


def prepare_project(spec, folder):
    info = valid_spec(spec)
    target = Path(folder)
    project = target / 'android'
    java = project / 'app/src/main/java/ai/appweld/wrapper'
    values = project / 'app/src/main/res/values'
    mipmap = project / 'app/src/main/res/mipmap-nodpi'
    for directory in [java, values, mipmap]: directory.mkdir(parents=True, exist_ok=True)
    (java / 'MainActivity.java').write_text(android_java(info['url'],info['splashColor']))
    (mipmap / 'ic_launcher.png').write_bytes(info['icon'])
    from xml.sax.saxutils import escape
    (values / 'strings.xml').write_text('<resources><string name="app_name">'+escape(info['appName'])+'</string></resources>')
    (values / 'styles.xml').write_text('<resources><style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar">'
        '<item name="android:windowLightStatusBar">true</item><item name="android:windowActionModeOverlay">true</item></style></resources>')
    (project / 'app/src/main/AndroidManifest.xml').write_text('''<manifest xmlns:android="http://schemas.android.com/apk/res/android">
 <uses-permission android:name="android.permission.INTERNET"/>
 <application android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:theme="@style/AppTheme" android:usesCleartextTraffic="false" android:allowBackup="false">
   <activity android:name="ai.appweld.wrapper.MainActivity" android:exported="true"><intent-filter>
   <action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/>
   </intent-filter></activity></application></manifest>''')
    (project / 'settings.gradle').write_text("pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }\nrootProject.name = 'AppweldGenerated'\ninclude ':app'\n")
    (project / 'build.gradle').write_text("plugins { id 'com.android.application' version '8.13.2' apply false }\n")
    (project / 'gradle.properties').write_text('org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\n')
    (project / 'app/build.gradle').write_text('''plugins { id 'com.android.application' }
android {
 namespace 'ai.appweld.wrapper'
 compileSdk 36
 defaultConfig {
  applicationId '__PACKAGE__'
  minSdk 26
  targetSdk 36
  versionCode 1
  versionName '1.0.0'
 }
 signingConfigs {
  release {
   storeFile file(System.getenv('APPWELD_KEYSTORE_PATH'))
   storePassword System.getenv('APPWELD_KEY_PASSWORD')
   keyAlias 'appweld'
   keyPassword System.getenv('APPWELD_KEY_PASSWORD')
  }
 }
 buildTypes { release { minifyEnabled false; signingConfig signingConfigs.release } }
 compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }
}
'''.replace('__PACKAGE__', info['packageName']))
    meta = {'appName':info['appName'],'url':info['url'],'packageName':info['packageName'],'targetSdk':36,'minimumSdk':26}
    (target / 'build-metadata.json').write_text(json.dumps(meta,indent=2))
    return project, meta


def build(spec, target, *, prepare_only=False):
    project,meta=prepare_project(spec,target)
    if prepare_only:return meta
    signing=Path(target) / 'signing'
    signing.mkdir(exist_ok=True)
    password=secrets.token_urlsafe(32)
    keystore=signing / 'appweld-release.p12'
    subprocess.run(['keytool','-genkeypair','-noprompt','-storetype','PKCS12','-keystore',str(keystore),'-alias','appweld',
      '-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Appweld Customer App,O=Appweld,C=US',
      '-storepass',password,'-keypass',password],check=True,timeout=90)
    env={**os.environ,'APPWELD_KEYSTORE_PATH':str(keystore),'APPWELD_KEY_PASSWORD':password}
    subprocess.run(['gradle','--no-daemon','--console=plain','--project-dir',str(project),':app:assembleRelease',':app:bundleRelease'],
       env=env,check=True,timeout=900)
    dist=Path(target)/'dist';dist.mkdir(exist_ok=True)
    apk=project/'app/build/outputs/apk/release/app-release.apk'
    aab=project/'app/build/outputs/bundle/release/app-release.aab'
    if not apk.is_file() or not aab.is_file():raise RuntimeError('Build finished without APK/AAB artifacts')
    shutil.copy2(apk,dist/'android-app.apk');shutil.copy2(aab,dist/'android-app.aab')
    with zipfile.ZipFile(dist/'signing-key-backup.zip','w',zipfile.ZIP_DEFLATED) as z:
        z.write(keystore,'appweld-release.p12')
        z.writestr('IMPORTANT.txt','Store this signing key and password offline. NEVER share them publicly.\n'
          +'Package: '+meta['packageName']+'\nKeystore password: '+password+'\nAlias: appweld\n')
    return meta

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('spec',help='JSON file with validated app spec')
    parser.add_argument('output_dir')
    parser.add_argument('--prepare-only',action='store_true',help='Write actual Gradle project without compiling')
    args=parser.parse_args()
    spec=json.loads(Path(args.spec).read_text())
    result=build(spec,args.output_dir,prepare_only=args.prepare_only)
    print(json.dumps({'ok':True,'mode':'project_only' if args.prepare_only else 'signed_artifacts','result':result}))
