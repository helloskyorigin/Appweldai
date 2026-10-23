# Appweld — official website-to-Android repository

This is the canonical Appweld project: **website URL → customization → website preview → real compatibility/readiness checks → payment (later) → private APK/AAB delivery**.

**Product rules:** no account, login, dashboard or recurring subscription. The proposed launch price is **$9 one time**. Payments are deliberately **OFF** until the generated Android apps and the full delivery flow pass end-to-end tests.

## Repository map

- `public/index.html`, `public/styles.css`, `public/refinements.css`, `public/script.js` — responsive landing and visual system.
- `public/create/` — no-login customization, website preview and review flow. **Website preview is not an Android emulator.**
- `public/legal/` — legal, refund, acceptable-use, guide and contact pages; review these before charging customers.
- `backend/readiness.mjs` — actual HTTPS/HTML readiness observations with DNS/IP and redirect safety checks.
- `backend/cloud-server.mjs` — stateless Cloud Run build API (ownership verification, token-protected job status, locked artifact downloads).
- `backend/cloud-store.mjs` — Firestore-backed durable ownership proofs, build jobs, quotas and private GCS storage.
- `android-worker/build.py` — Android API-36 WebView project generator with signing/APK/AAB build path.
- `android-worker/cloud_job.py` — private Cloud Run Job task execution.
- `docs/REAL_ENGINE.md`, `docs/CLOUD_BUILD_PHASE1.md` — architecture, configuration and launch gates.
- `.github/workflows/android-build-smoke.yml` — Android APK/AAB compile smoke tests.
- `.github/workflows/backend-tests.yml` — backend readiness, ownership, quota and download-lock tests.

Firebase Hosting uses `public/`; `next.config.ts` also supports the frontend and a configurable backend proxy. Next.js scaffolding in `app/` and `components/` is preserved.

## Verified in code vs not yet production-ready

Implemented and covered by local or CI tests:
- HTTPS readiness checks and guarded redirects.
- Domain authorization via DNS TXT or HTML meta verification.
- Android source generation and CI compilation of sample signed APK/AAB.
- Firestore-backed job state, limits, and private GCS artifact access.
- Download lock **until genuine payment entitlement is added**.

**Not yet independently verified as a live, reliable customer service:**
1. Cloud Run API/Job, private bucket, Firestore and Firebase/Next API routing deployed together and tested end to end.
2. Generated apps installed on real Android devices; back navigation, links, login, file upload/download, errors/offline, redirects and keyboard tested on representative sites.
3. Genuine streamed **Android APK preview** behind per-session limits and private access, rather than a website iframe.
4. Dodo $9 one-time checkout with verified webhooks, idempotent order state, paid entitlement, secure short-lived delivery/recovery and customer support/refund policies.

**Do not claim live Android emulator previews, successful customer APK delivery or guaranteed Google Play approval yet. Keep paid checkout disabled.** The last successful sample CI build only proves that its sample compiled.

## Run locally

```bash
cd public && python3 -m http.server 3000
# OR from the repo root:
npm install && npm run dev

# Backend safety/unit tests:
npm test --prefix backend

# Android worker unit tests:
python3 -m unittest discover -s android-worker -p 'test_*.py'
```

Detailed Google Cloud deployment and guardrails: [docs/CLOUD_BUILD_PHASE1.md](docs/CLOUD_BUILD_PHASE1.md).

Migrated from `helloskyorigin/Appweld` to `helloskyorigin/Appweldai`.
