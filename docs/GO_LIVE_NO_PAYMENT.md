# Real Appweld live build activation (no payment)

## What is now actually wired
- Android website preview: live iframe in `/create/`, with external-browser fallback.
- Cloud Run API behind Firebase Hosting `/api/**` rewrite.
- DNS/HTML ownership verification, quotas, durable Firestore build jobs, isolated Gradle Cloud Run Job.
- Secret-token downloads of actual signed APK + AAB + signing-key backup when `APPWELD_FREE_TEST_DOWNLOADS=true` and build is `ready`.
- **No payment, no login**.

## Operator activation (requires YOUR Google Cloud project)

Run from the repository root:
```bash
PROJECT_ID=YOUR_EXISTING_PROJECT_ID bash scripts/deploy-cloud.sh
```
This requires authenticated `gcloud` + `firebase`, billing-enabled project, IAM provisioning privileges, and an unused globally unique private bucket name. Use `APPWELD_PRIVATE_BUCKET=your-unique-bucket` when needed. Deployment costs money and is not part of the free test.

After provisioning, set private bucket Object Lifecycle delete at 1 day and Firestore TTL for `appweld_jobs.expiresAt`, `appweld_proofs.expiresAt`, and `appweld_quotas.expiresAt`. Establish cost alerts and test build limits **before public traffic**. Keep signing backups private.

## Verification (no invented success)
1. `curl https://YOUR-SITE/api/capabilities` must return `buildsEnabled:true`, `freeTestDownloadsEnabled:true`.
2. Open `/create/`, enter a public HTTPS domain you own, app name, package ID, 512x512 PNG icon and splash color. The website iframe works only if that site permits framing (otherwise use “Open actual website”).
3. `/review/`: complete HTTPS readiness and DNS TXT/HTML ownership.
4. `/building/`: actual Android Cloud Run Job, asynchronous status.
5. `/download/`: download signed APK, AAB, signing-key backup with private browser build token. Install APK on an Android phone and test website, back, login and uploads.
6. **Preview caveat:** website iframe is not an Android emulator. A genuine streamed APK preview needs an emulator provider and separate integration; no such service is configured.

If `/api/capabilities` is 404 or HTML, Cloud Run API or Firebase rewrite is not deployed. Do not label it “working” until a real test build is downloaded.
