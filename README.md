# AIO Pro Inspect

Guided chimney-inspection app for AIO Pro Chimney (Greater St. Louis). The
technician picks what he's inspecting, the app walks him checkpoint by
checkpoint, requires specific photos at each one, records OK / Monitor /
Defect plus a note, and produces a customer-ready PDF with the company
logo, the photos and a quote.

**Everything is local to the device. Nothing is uploaded. No account, no server.**

> התקנה בטלפון: פותחים את `index.html` בדפדפן (Safari באייפון / Chrome באנדרואיד),
> ואז "Add to Home Screen". מעכשיו זה אייקון על המסך שעובד גם בלי אינטרנט.

---

## What's here

| Path | What it is |
|------|-----------|
| `index.html` | **The app.** One self-contained file — no build step. This is the version actually used in the field. jsPDF is inlined so it works fully offline. |
| `chimney-inspect/` | Version 2: a Vite + React + Capacitor 6 project for a real installable Android app. Needs Node + Android Studio to build. Kept as the native path if Play Store distribution is ever wanted. |
| `CLAUDE.md` | Project context / working notes. |

## Install on a phone (version 1)

**Live app:** https://aiopro1701-del.github.io/aiopro-inspect/

1. On the phone, open the live app URL above.
2. It's already in the browser — **Safari** on iPhone, **Chrome** on Android.
3. Add to home screen:
   - **iPhone:** Share button → *Add to Home Screen*
   - **Android:** three-dot menu → *Add to Home screen*
4. First thing inside: tap **SET** and fill in company details + logo — it prints on every report.

## How it works

- **Content layer** — the `TEMPLATES` array near the top of `index.html`. Each template is `template → stages → items`; each item carries `label`, `help`, `ref` (the code citation printed on the report) and `photos` (the required shots). Adding an appliance type touches nothing else.
- **Storage** — one record per job. Tries IndexedDB; falls back to `localStorage` automatically if IndexedDB is blocked (some browsers block it on a local `file://` page). A warning shows if device storage fills up.
- **PDF** — jsPDF, US-Letter portrait: logo header, customer block (incl. email), the job type, verdict tally, findings grouped worst-first with photos, footer on every page. **Inspection report only — no pricing.** Only answered checkpoints appear; blanks are omitted.

## Flow

System type → **what did we come to do** (Level 1 / Level 2 / Estimate / Repair) → customer details (incl. email) → checkpoints → report. On a Repair job each checkpoint also asks for an "after / repair" photo.

## Report delivery

Finishing the report calls **Create & send**. On a phone it opens the share sheet with the PDF attached — pick Gmail/Mail and send it to the customer and yourself (their address plus the company address from SET are pre-typed in the message body). On desktop it downloads the PDF and opens an email draft to both.

Fully hands-off auto-send (no tap, straight to both inboxes) would need a small email service (e.g. EmailJS / a serverless function) and an API key, and it means the report leaves the device — a deliberate change from the local-only design. Not wired up yet.

## Adding an appliance type

Copy the `gas-wh` object inside the `TEMPLATES` array, change the `id`, `name`,
`blurb` and the `stages`, and it appears on the start screen automatically.
Nothing else in the code needs to change.

## Current content

Three templates:
- `gas-wh` — Gas water heater vent — 5 stages, 24 checkpoints, 26 photos.
- `wood-stove` — Wood stove (freestanding solid-fuel) — 4 stages, 15 checkpoints, 17 photos.
- `open-fireplace` — Masonry fireplace (Level I) — 4 stages, 13 checkpoints, 14 photos.

## Installable app + offline

Served over HTTPS it's a full PWA: a web manifest, an app icon and a service
worker that caches the app shell, so once it's added to the home screen it opens
and runs **with no network** (jsPDF is inlined, storage is on-device). Bump the
`CACHE` name in `sw.js` when you want to force installed devices to pick up a new build.

## Backup / move to a new phone

Settings → **Export backup** writes a JSON file with every job (photos included)
and the company settings. **Import** on another device restores them. This is the
only copy — the app never uploads anything.

## Status

Verified end-to-end in a browser (screens, storage, and PDF generation all
tested). **Not yet run in a real field inspection** — that's the real test.

## Not to redo

- No login, no account, no server. Local-only is the design.
- The PDF is built with jsPDF, not browser print — on purpose.
- The checklist wording is deliberately field language, not code language.
