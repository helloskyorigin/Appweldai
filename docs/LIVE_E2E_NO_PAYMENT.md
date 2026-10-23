# Appweld — live build, downloads and real Android preview (payment OFF)

The UI code, API handlers, Android build worker and GCS/Firestore orchestration are implemented.
**They do not become a live service from a GitHub push alone.** A billing-enabled GCP
project and Firebase Hosting deployment are required.

## Customer's real workflow
1. /create/ — set own public HTTPS website, app name, stable package ID, mandatory
   square icon and splash color. The **Real website** preview tab loads the original
   website at phone width; some sites disallow third-party iframe embedding.
2. /review/ — HTTPS reachability, mobile viewport and DNS TXT or HTML meta
   ownership verification. Website owner only.
3. /building/ — call /api/build; Cloud Run Job compiles a signed APK/AAB and private signing backup.
4. /download/ — API status plus token-authorized private APK/AAB/keystore downloads,
   enabled by APPWELD_BUILDS_ENABLED=true and APPWELD_FREE_TEST_DOWNLOADS=true.
   No login, checkout or payment.
5. If Appetize credentials are configured: after successful build and **explicit
   user consent**, POST /api/build/:id/preview uploads the **actual APK**
   to Appetize, then embeds the Android emulator. No mock phone/image.
   Upload is single-use per build; provider may retain the APK under its terms.

## Configuring actual Android emulator preview (optional paid third-party)
- Get API token from Appetize. Do not put it in JavaScript or Firebase public config.
- Store it in Google Cloud Secret Manager e.g. secret `appweld-appetize-token`.
- Grant Cloud Run API's service account Secret Manager Secret Accessor for that secret.
- Set the Cloud Run API's secret environment variable
  `APPETIZE_API_TOKEN=appweld-appetize-token:latest` using `--update-secrets`.
- Set `APPWELD_ANDROID_PREVIEW_ENABLED=true` with `--update-env-vars`.
- GET /api/capabilities should then report `realAndroidPreviewAvailable: true`.
- The preview API only responds after an owner-verified completed APK build and
  a valid bearer build token. The browser asks for user consent before initiating.
- Third-party emulator sessions and APK uploads may incur fees. Rate-limit and
  restrict preview usage. By default the feature is disabled.

## Deployment (requires access to user's project)
```sh
PROJECT_ID=YOUR_GCP_PROJECT_ID bash scripts/deploy-cloud.sh
# After verifying API Cloud Run service:
firebase deploy --project YOUR_GCP_PROJECT_ID --only hosting
```
Firebase Hosting rewrite: /api/** -> Cloud Run service `appweld-api` in
`asia-south1`. Confirm same Firebase project as Cloud Run.

## Acceptance checks (not optional)
- GET /api/capabilities returns JSON and buildsEnabled=true.
- Verify a domain you control; submit real 512x512 PNG and valid package ID.
- Build job state must transition queued → building → ready in Firestore.
- Test APK and AAB are nonempty, signed, with actual chosen app name/package/icon.
- Download all files from browser; unauthorized GET without the token returns 404.
- Install APK on physical Android and check navigation, keyboard, site-specific
  login, file upload, external intents, retry and downloads. Do not promise
  Google Play approval or OAuth compatibility.
- Only claim streamed **Android preview working** after actual Appetize account
  upload and browser emulator interaction succeed.

Server secrets and costs must be managed by the Google Cloud project owner.
