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

1. Get `index.html` onto the phone (email it to yourself, or use the hosted URL if GitHub Pages is enabled).
2. Open it in the browser — **Safari** on iPhone, **Chrome** on Android.
3. Add to home screen:
   - **iPhone:** Share button → *Add to Home Screen*
   - **Android:** three-dot menu → *Add to Home screen*
4. First thing inside: tap **SET** and fill in company details + logo — it prints on every report.

## How it works

- **Content layer** — the `TEMPLATES` array near the top of `index.html`. Each template is `template → stages → items`; each item carries `label`, `help`, `ref` (the code citation printed on the report) and `photos` (the required shots). Adding an appliance type touches nothing else.
- **Storage** — one record per job. Tries IndexedDB; falls back to `localStorage` automatically if IndexedDB is blocked (some browsers block it on a local `file://` page). A warning shows if device storage fills up.
- **PDF** — jsPDF, US-Letter portrait: logo header, customer block, verdict tally, findings grouped worst-first with photos, quote table, footer on every page.

## Adding an appliance type

Copy the `gas-wh` object inside the `TEMPLATES` array, change the `id`, `name`,
`blurb` and the `stages`, and it appears on the start screen automatically.
Nothing else in the code needs to change.

## Current content

One template: `gas-wh` (gas water heater vent) — 5 stages, 24 checkpoints, 26 photo slots.

## Status

Verified end-to-end in a browser (screens, storage, and PDF generation all
tested). **Not yet run in a real field inspection** — that's the real test.

## Not to redo

- No login, no account, no server. Local-only is the design.
- The PDF is built with jsPDF, not browser print — on purpose.
- The checklist wording is deliberately field language, not code language.
