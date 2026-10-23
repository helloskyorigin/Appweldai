# Appweld — durable Cloud build (phase 1, payment OFF)

This implementation fixes the previous in-memory `backend/server.mjs` prototype. **Do not advertise a working consumer app service until actual Cloud deployment, Android emulator preview, and device QA are complete.** Payment is not enabled here.

## Architecture

`App Studio → DNS/HTML owner check → durable Cloud API → Firestore job + quota records → private GCS input → Cloud Run Job → signed APK/AAB/keystore backup in private GCS → authenticated status`.

- `backend/cloud-server.mjs`: stateless Cloud Run API. Original `backend/server.mjs` stays available for local prototypes.
- `backend/cloud-store.mjs`: Firestore job/challenge state, atomic global/per-domain daily quota and SHA-256 token hash. Builds and proofs have explicit expiry timestamps.
- `android-worker/cloud_job.py`: one Cloud Run Job task per build; pulls private JSON spec, calls the already-tested Gradle signing generator, saves private artifacts, clears its input.
- `backend/Dockerfile.cloud` and `android-worker/Dockerfile.cloud`: separate, smaller API versus Android SDK images.
- Frontend doesn't expose download buttons while `downloadsLocked=true`.

## Configuration / activation

Requires a Google Cloud project with billing enabled. You need a Firestore Native database, an existing *private* GCS bucket with a lifecycle rule deleting objects under `builds/` after 1 day, a Cloud Run Job built from `android-worker/Dockerfile.cloud`, and a Cloud Run Service built from `backend/Dockerfile.cloud`.

API environment:

| Variable | Meaning |
| --- | --- |
| `GOOGLE_CLOUD_PROJECT` | Cloud project ID |
| `APPWELD_REGION` | Cloud Run region |
| `APPWELD_RUN_JOB` | Name of the Cloud Run Job |
| `APPWELD_PRIVATE_BUCKET` | Private GCS bucket for build input and files |
| `APPWELD_BUILDS_ENABLED` | **false by default**. Turn on ONLY after device QA and cost guardrails |
| `APPWELD_DAILY_BUILD_LIMIT` | Global daily quota, defaults to **10** |
| `APPWELD_DOMAIN_DAILY_LIMIT` | Per-domain daily quota, defaults to **1** |
| `APPWELD_QA_DOWNLOAD_KEY` | Optional secret (>=24 chars) for *private operator QA only*; NEVER put in frontend JS or browser storage |

Job environment: `APPWELD_PRIVATE_BUCKET`. The API sends `APPWELD_BUILD_ID` using Cloud Run Jobs execution environment override. Configure **max retries 0**, 1 task and a 20-minute timeout in the Job. Give the API service account only job execution-with-overrides + its required Firestore/GCS permissions. Give the Job identity only the required Firestore/GCS permissions. No public object access.

Firebase static hosting alone cannot execute this API. Route `/api/*` to your Cloud Run API (Next.js `APPWELD_API_ORIGIN` when hosting via Next.js, or Firebase Hosting API rewrite when configured). Existing `next.config.ts` supports a configured API origin.

### IAM and data lifecycle

- Firestore TTL policies for `appweld_jobs.expiresAt`, `appweld_proofs.expiresAt`, `appweld_quotas.expiresAt` (TTL deletions are asynchronous, access always checks `expiryMs` regardless).
- GCS lifecycle: `age=1` day delete objects under `builds/`, including orphan input/failed artifacts. App-level `expiresAt` gates access after one hour; GCS lifecycle is defense in depth.
- `APPWELD_QA_DOWNLOAD_KEY` must be a secret in Secret Manager. Never issue public signed GCS URLs or expose signing-key backups before a real paid entitlement.
- Firestore stores a **hash** of the browser build token, not the token. A customer must retain their token to query their own build status; no account/session recovery service exists yet.
- Observability: set up Cloud Monitoring alerts for daily cost, failed executions, GCS growth and API 429/503 rates. Put a daily spending budget/alert in the Google Cloud billing account; alerts alone don't hard-stop spending.
- Owner verification does not replace app-store policy review. Third-party OAuth, payment redirects, intents, keyboard, uploads/downloads and device permissions need real Android QA.

## Run local unit tests (no credentials required)

```bash
node --test backend/test/cloud-server.test.mjs backend/test/cloud-store.test.mjs
python3 -m py_compile android-worker/cloud_job.py
```

For actual Cloud E2E you must run the built API and Job images with provisioned service identities and verify a private test website. A GitHub Actions sample APK compilation is not evidence that Cloud Run deployment or real-browser emulator sessions work.

## Product gate before enabling customer access

1. Deploy API + Job, confirm job is retained across service restart, and verify actual signed artifacts in private storage.
2. Install and inspect output on real Android phone(s), including back navigation, redirects, file upload/download, offline error, OAuth and safe-area handling.
3. Implement a **genuine streamed Android session of the already-built APK** (for example Appetize with private authenticated sessions). An HTML iframe is a website preview, not Android emulation.
4. Add per-session preview quotas, anonymized error telemetry and privacy limitations. Preview upload must not expose APK/aab publicly.
5. Add server-side paid entitlement and only then unlock APK/AAB/signing-key backup. Payment integration stays out of scope in this phase.


## Free owner-verified download phase — payment OFF

After the Cloud API and Cloud Run Job have been deployed and tested, set
`APPWELD_BUILDS_ENABLED=true` and `APPWELD_FREE_TEST_DOWNLOADS=true` on the API.
An owner who passes DNS/HTML verification and holds the secret job token can
download the *real* APK, AAB and signing-key backup when Gradle reports success.
Other users cannot download, even if they guess a build identifier. One
build/domain/day and a low global daily quota remain enforced.

This is a real output/download integration, NOT browser-based Android emulation.
The existing live website iframe can be tried only where embedding is permitted.
Never label it as an Android emulator. Do not activate payment during QA.
