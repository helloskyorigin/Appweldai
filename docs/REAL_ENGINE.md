# Appweld — Real Android Conversion Engine (integration milestone)

**What is implemented in this commit**

- Real, server-side HTTPS website check. It probes actual response content, follows up to 3 redirects only after checking each destination's DNS, pins the approved IPv4 address, blocks private/link-local/metadata addresses, enforces timeouts and a max HTML sample, and reports *observed* HTTPS, title and mobile-viewport signals.
- `review` now fetches `/api/readiness` and fails closed if the server is unavailable. It never reports a fabricated PASS.
- Real Android Gradle **project generation** (`android-worker/build.py`). Given a paid, authorized input specification, it creates a WebView-based Android project with the user's app identity, icon and splash color and `targetSdk 36`. When Android SDK and Gradle are installed, the builder invokes Gradle APK/AAB release tasks, generates a new signing key and prepares signed file artifacts.
- The fake click-through build stage is disabled. **No payment, files, or build success is claimed without an actual backend job.**

## Still required before taking $9 payments

- Deploy `appweld-api` to Cloud Run and proxy `/api/readiness` from Firebase Hosting (or point a Next.js proxy to it).
- Verify **website ownership** or written authorization before packaging somebody else's website.
- Run and test the Android worker in an environment with SDK/Gradle and on at least one physical Android device. Check login/payment/navigation/links on representative sites.
- Add Dodo Payments one-time checkout, server-verified signed webhooks, Firestore order state, and per-order idempotency. Never trust checkout redirects as payment proof.
- Wire Cloud Run Job execution to a **paid** order via private Cloud Storage; keep signing keys and downloads private, use short-lived recovery links and automatic deletion.
- Update real terms/refunds/delivery disclosure before live checkout. Review Google Play's WebView/quality policies; AAB export is not store approval.
- Enforce durable distributed throttling before opening heavy user-triggered builds. **Never expose the build worker as a public build endpoint.**

## Try readiness locally

```sh
cd backend
npm test
PORT=8181 npm start
# In a second terminal:
curl -i http://localhost:8181/healthz
curl -i -X POST http://localhost:8181/api/readiness -H 'Content-Type: application/json' -d '{"url":"https://example.com"}'
```

For a Cloud Run deployment, after selecting a billed Google Cloud project:

```sh
cd backend
gcloud run deploy appweld-api --source . --region asia-south1 --allow-unauthenticated \
  --max-instances 1 --memory 256Mi --timeout 30
```

**Important:** Only after Cloud Run service `appweld-api` is deployed, add the following Firebase Hosting rewrite (`hosting.rewrites`) and deploy Hosting:

```json
[{ "source": "/api/**", "run": { "serviceId": "appweld-api", "region": "asia-south1" }}]
```

This rewrite is intentionally *not* enabled in the main `firebase.json` yet: Firebase Hosting may refuse deployment if the referenced service does not exist. Until connected, the Review screen explicitly reports that the live checker is unavailable.

For Next.js deployment, set `APPWELD_API_ORIGIN` to the deployed Cloud Run service's exact HTTPS origin at build/deploy time (the optional rewrite is in `next.config.ts`).

## Prepare the Android source project locally

Input `spec.json`:

```json
{
  "url":"https://example.com",
  "appName":"My App",
  "splashColor":"#D8E6B5",
  "iconPngBase64":"BASE64_ENCODED_VALID_512_PNG",
  "orderId":"server-issued-paid-order-id"
}
```

```sh
python3 android-worker/build.py spec.json /tmp/appweld-test --prepare-only
python3 -m unittest discover -s android-worker -p 'test_*.py'
```

To produce signed APK/AAB, install JDK17, Android SDK platform 36 and build-tools 36.0.0 plus Gradle 8.13, then run without `--prepare-only`. Or build the container image from `android-worker/Dockerfile` and run it in a **private, paid-order environment**.

### Security and truthfulness

- Source preparation and signed-build **code paths exist**, but the Android SDK is not installed in the current coding environment, so no real APK could be compiled or installed during this commit.
- Logo PNG is validated as 512×512 with checked PNG chunk CRCs before project creation; icon upload is required in the frontend.
- The generated Android app keeps content on the original website. Unsupported OAuth/third-party payment flows still require native/device-level work; this starter does not pretend otherwise.
- Signing-key backup contains a keystore and plaintext recovery password inside a ZIP: **never host or email it publicly**. Production downloads need per-order authentication and short-lived access. Delete private artifacts after the stated retention window.
- The node checker has a best-effort in-memory rate limit; use durable rate limiting and monitoring before a public high-traffic rollout.
