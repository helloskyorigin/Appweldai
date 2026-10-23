# Appweld: real engine, no payments

## User journey
Landing -> Design (`/create/`) -> Real website readiness and DNS TXT ownership (`/review/`) -> Build (`/building/`) -> Private download (`/download/`). **No checkout, login, subscription or payment.**

## What is actually implemented
- User chooses app name, valid Android package ID, square 512px icon, splash-screen color and HTTPS URL.
- Live website is shown in an embedded mobile-width frame where the website's embedding policy allows it. An external link opens the real website if not; iframe preview is not proof of Android WebView support.
- Server performs actual HTTPS checks with DNS/IP pinning and redirect validation; some logins, payment flows and native integrations still need physical-device testing.
- Server accepts a DNS TXT challenge `_appweld.<website-host>` or a matching `<meta name="appweld-verification">` in the public homepage. Only verified owners can submit free builds.
- Generator emits native Android API-36 source, WebView navigation, secure SSL handling, error/retry UI, file input chooser, external links, splash resources, APK and AAB, an ephemeral release signing key and key-backup ZIP.
- Build service uses Gradle + Android SDK, returns a secret job token and short-lived per-session download links. No permanent user account, storage database or payment information.

## Start local tests
```
cd backend && node --test test/*.test.mjs
cd ../android-worker && python -m unittest -v test_worker.py
```

## Development engine (requires Android SDK 36 + JDK 17 + Gradle 8.13)
```
cd <repository-root>
APPWELD_BUILDS_ENABLED=true node backend/server.mjs
```
Do not enable free builds on public infrastructure until domain verification, rate limiting, resource quotas, worker isolation, data retention and cost budgets have been validated.

## Docker / Cloud Run
```
docker build -f backend/Dockerfile -t appweld-engine .
docker run --rm -p 8080:8080 -e APPWELD_BUILDS_ENABLED=true appweld-engine
```
A single-instance container uses ephemeral memory-backed storage. Cloud Run restarts, scaling and timeouts can lose results. For **reliable public release**, use durable build-job state and temporary private Cloud Storage with lifecycle deletion rather than depending on in-memory maps. Configure domain and same-origin API routing for the frontend; Firebase static hosting by itself does not run this backend.

## Limitations
- A real APK/AAB **cannot be confirmed compiled** in environments without Android SDK and Gradle or GitHub Actions build evidence.
- Uploaded signing key backup contains the password and must only be downloaded by the person who controls the project; losing it can prevent updates.
- App works with a live website and generally requires internet. Embedded third-party OAuth and some native device flows may not work automatically.
- Google Play approval is separate and never guaranteed.
- Built-in demo signing keys used by CI are disposable; never use CI sample artifacts for production updates.
