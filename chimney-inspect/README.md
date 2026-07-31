# AIO Pro Inspect

A guided chimney inspection app. The tech picks what he is inspecting, the app walks
him checkpoint by checkpoint, makes him take the specific photos, records OK / Monitor /
Defect and a note at each one, and produces a customer-ready PDF with the logo, the
photos and a quote.

Everything is stored on the phone. Nothing is uploaded anywhere.

---

## What you need on the Windows machine

Install these once, in this order:

1. **Node.js 20 LTS** — https://nodejs.org (take the LTS installer, accept the defaults)
2. **Android Studio** — https://developer.android.com/studio
   During first launch let it install the **Android SDK**, **SDK Platform-Tools** and an
   **Android SDK Platform** (API 34 or newer).
3. **JDK 17** — Android Studio ships with it. If a build complains about the Java version,
   set `JAVA_HOME` to the JDK inside the Android Studio folder.

Check the install by opening PowerShell and running:

```powershell
node -v
npm -v
```

---

## Run it on the laptop first

```powershell
cd path\to\chimney-inspect
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). The camera buttons fall back to a
file picker in the browser, so you can click through a whole inspection and produce a real
PDF without a phone. Do that once before building the app — it is the fastest way to see
whether the checklist wording is right.

---

## Build the Android app

```powershell
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

The last command opens Android Studio on the project. Then:

- Plug in your phone with **USB debugging** on (Settings → About phone → tap Build number
  seven times → Developer options → USB debugging).
- Press the green **Run** button in Android Studio. The app installs on the phone.

To get an installable file you can send to a technician instead:

**Build → Build Bundle(s) / APK(s) → Build APK(s)**

The APK lands in `android\app\build\outputs\apk\debug\`. Send it to the tech, they enable
"install from unknown sources" once, and it installs. That is enough for your own crew.
Play Store distribution needs a signed release build and a one-time $25 developer account.

After any change to the code, re-run:

```powershell
npm run build
npx cap sync android
```

---

## iPhone

Not from this machine. Building for iOS requires macOS with Xcode, plus an Apple Developer
account at $99/year. The code here is ready for it — the iOS platform is one command
(`npx cap add ios`) whenever you have a Mac in front of you, or you use a cloud Mac build
service. Android first is the right order regardless.

---

## Where things live

```
src/data/checklists.js    the entire inspection content — edit this to change what gets asked
src/screens/Inspect.jsx   the checkpoint screen
src/screens/Report.jsx    summary, quote, PDF button
src/lib/pdf.js            how the customer report is laid out
src/lib/store.js          job storage (files on the phone, IndexedDB in the browser)
src/lib/native.js         camera, save, share — each with a browser fallback
```

### Adding another appliance type

`src/data/checklists.js` is the only file you touch. Copy the `gas-wh` template object,
change the `id`, `name` and the stages. Each item takes:

```js
{
  id: 'unique-id',
  label: 'What the tech sees on screen',
  help: 'What to actually look at, in field language',
  ref: 'Code citation printed on the report',
  photos: [{ id: 'slot-id', label: 'Caption under the camera slot' }],
}
```

The app picks it up automatically — no other code changes.

---

## First things to do

1. Open **SET** (top right) and put in the company details and the logo. The logo prints on
   every report from then on.
2. Run one real inspection in the field and note what wording is wrong, what checkpoint is
   missing, and what photo you wanted that the app did not ask for.
3. Fix those in `checklists.js`, `npm run build`, `npx cap sync android`, run again.

---

## Known state

Every source file compiles clean, and the import graph resolves. It has **not** been run
against a live `npm install`, because the machine it was written on has no network access —
so the first `npm install` on your laptop is the real test. If a dependency version fights
you, the fix is almost always to let npm resolve it: delete `package-lock.json` and
`node_modules`, then `npm install` again.
