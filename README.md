# Batch Time Capsule (static site)

This project now supports:
- publishing a Google Form for submissions,
- automatically pushing each form response to Firebase Realtime Database,
- keeping capsule entries **locked** on the website until your reveal date.

## Files
- `index.html`
- `main.css`
- `firebase-config.js`
- `app.js`
- `google-apps-script.js` (copy into Google Apps Script)
- `firebase.rules.json` (sample rules with time-based read lock)

## 1) Configure the website

Edit `firebase-config.js`:
- `googleFormUrl`: paste your public Google Form URL (must start with `https://`).
- `revealIso`: set the reveal date/time in UTC (ex: `2026-06-01T00:00:00Z`).

If `googleFormUrl` is empty/invalid, the “Send Your Memory” buttons are disabled with a tooltip reminder. If `revealIso` is invalid, the capsule opens immediately and the date label will prompt you to set it.

Example:
```js
const appConfig = {
  googleFormUrl: "https://forms.gle/yourFormLink",
  revealIso: "2026-06-01T00:00:00Z"
};
```

## 2) Send Google Form responses to Firebase automatically

1. Create your Google Form with fields like:
   - `Name`
   - `Message`
   - `File Upload` (optional)
2. Link the form to a response Google Sheet.
3. In that Sheet, open **Extensions → Apps Script**.
4. Paste the content of `google-apps-script.js`.
5. Update these constants in the script:
   - `FIREBASE_DB_URL`
   - `FIREBASE_PATH`
6. Add trigger:
   - Function: `onFormSubmit`
   - Event source: `From spreadsheet`
   - Event type: `On form submit`

After this, every new response is posted to two locations in Realtime Database:
- `/capsuleEntries` (normalized shape used by the website)
- `/sheetSubmissions/<sheetName>` (full row data organized by sheet tab)

So you get both: website-ready entries and a clean per-sheet archive.

## 3) Lock entries until reveal day

The frontend already stays locked until `revealIso`.
For database-level protection, use `firebase.rules.json` and set the reveal timestamp (`now >= ...`) to your own date.

Convert reveal date to milliseconds (UTC):
```bash
date -d '2026-06-01T00:00:00Z' +%s
```
Then multiply by 1000 for Firebase rules.

> Important: The sample rules currently allow direct writes in `capsuleEntries` so Apps Script can post without authentication. For production hardening, move writes to an authenticated backend (Cloud Functions/service account) and set `.write` to false for clients.

## 4) Deploy

Host as static site (GitHub Pages / Netlify / Vercel). Make sure these files are deployed together.

## 5) Reveal day behavior

- Before reveal date: lock card + countdown, entries hidden.
- At/after reveal date: website auto-opens and loads entries from Firebase.
