# Appweld — premium website-to-Android landing

A dependency-free, responsive marketing experience for Appweld, featuring an editorial hero, scroll-linked website-to-phone transformation, live sample branding editor, readiness-report preview, deliverables, launch pricing, FAQs, and fully linked legal pages.

## Run locally

```bash
python3 -m http.server 3000
```

Visit `http://localhost:3000`. No build step is necessary. Designed for static hosting (including Firebase Hosting). The frontend has no login, account dashboard, analytics trackers, or recurring billing.

## Current state

- Landing page and sample customization are interactive.
- Entering a valid public URL navigates to `/create/`, a frontend-only preview.
- **No payment integration, domain verification, Android build pipeline, APK generation, AAB generation, or build storage is implemented yet.** `/create/` clearly labels this. Do not present this branch as a functioning converter or turn on paid checkout until the full pipeline has been independently tested.
- The $9 price is marked as an introductory planned offer; the $39 amount is labeled as a *planned standard price* rather than a fictitious former price.
- The inspection panel is marked SAMPLE REPORT; its pass states are demonstration content, not results for the visitor's website.

## Future production phases

1. URL ownership verification, safe URL fetching (including SSRF/redirect protections), and genuine Android compatibility checks.
2. Customized Android WebView template, build queue, signed APK/AAB generation, error handling and multi-device tests.
3. Dodo one-time checkout, signed webhook verification, idempotent jobs, short-lived artifact storage, user-controlled signing-key backup and recoverable download links.
4. Merchant/legal review, Android/Play policy evaluation, refunds, abuse protection, observability, and production UAT.

## Files

- `index.html` — full marketing page.
- `styles.css` — design system, responsive layouts, visual compositions and motion.
- `script.js` — navigation, URL validation, scroll chapter and customization interactions.
- `create/index.html` — clearly labeled, non-paying branding-preview step.
- `legal/*.html` — prelaunch legal, support and publishing-information pages.
- `firebase.json` — static hosting configuration.

## Accessibility and performance

Semantic headings, form labels, keyboard-accessible controls, focus styles, reduced-motion support, intersection-based entrance effects and transform-based scroll visuals are included. No external images or JavaScript libraries are used. Google Fonts are optional; local system fonts are used as fallback.
