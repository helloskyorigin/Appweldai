# Appweld — official website-to-Android repository

This repository is the canonical Appweld project.

## Source of truth

- `public/index.html` — responsive landing and scroll storytelling
- `public/styles.css`, `public/refinements.css`, `public/script.js` — visual system and interactions
- `public/create/` — no-login sample app studio; not a real APK generator yet
- `public/legal/` — privacy, terms, refunds, acceptable use, guide, contact
- `firebase.json` — Firebase Hosting serves the `public/` directory
- `next.config.ts` — Next.js rewrites serve the same landing and legal/studio pages

Existing Next.js scaffolding under `app/` and `components/` is preserved for future development.

## Run locally

Static preview: `cd public && python3 -m http.server 3000`

Next.js: `npm install && npm run dev` and open http://localhost:3000

## Current status

- $9 introductory one-time offer (proposed); no accounts or subscriptions.
- Landing, sample customization and informational legal/support pages built.
- **Not yet implemented:** real domain ownership validation, Android compatibility checks, Dodo checkout, verified payments, APK/AAB build/signing, and delivery. Do not enable paid checkout before these are working.
- Examples and previews are illustrative; Play Store approval is not guaranteed.

Migrated from `helloskyorigin/Appweld` into `helloskyorigin/Appweldai` on request.
