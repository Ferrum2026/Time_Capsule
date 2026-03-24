# Simple Time Capsule Template

This version includes a built-in **Firebase submission form** with optional **Google Drive mirroring** for uploaded files.

Participants can:
- enter their name using the required format `SURNAME_FIRST NAME_M.I`,
- write a short message,
- optionally upload any file type,
- submit multiple times without creating duplicate person categories,
- optionally mirror uploaded files to Google Drive after Firebase upload succeeds.

The website stores:
- every submission payload (`submission.json`) and file uploads in **Firebase Storage**,
- submission records in **Firebase Realtime Database**,
- repeated submissions under the same participant key,
- optional mirrored copies to Google Drive via webhook if enabled.

---

## 1. Main files to edit

- `firebase-config.js` — Firebase project settings, reveal date, optional Google Drive mirror webhook, and UI text.
- `index.html` — page structure including the participant form and storage-priority guidance.
- `app.js` — countdown, form handling, Firebase upload logic, optional Google Drive mirroring, and grouped entry rendering.
- `main.css` — page styling.

---

## 2. Required participant format

Participants must type their name in UPPERCASE exactly like this:

```text
SURNAME_FIRST NAME_M.I
```

Example:

```text
DELA CRUZ_JUAN_P.
```

If they always reuse the same name format, all later submissions stay inside the same Firebase category.

---

## 3. How the data is organized

Realtime Database path:

```text
capsuleEntries/{person-slug}
```

Each person node stores:
- `displayName`
- `updatedAt`
- `profile`
- `submissions/{autoId}`

Each submission stores:
- `createdAt`
- `message`
- `attachments[]` containing `{ name, type, size, dataUrl }`

---

## 4. Optional Google Drive mirror

Google Forms are currently on hold.

If you want to mirror files to Google Drive after Firebase upload, configure this in `firebase-config.js`:

```js
driveSync: {
  enabled: true,
  webhookUrl: 'https://script.google.com/macros/s/your-web-app-id/exec',
  apiKey: ''
}
```

If `driveSync.enabled` is `false`, uploads stay Firebase-only.

## 5. Firebase setup

Enable this Firebase product:
- **Realtime Database**

Then place your Firebase web config inside `firebase-config.js`.

For quick testing only, you can use open development rules.
After testing, lock them down before real use.

---

## 6. How to test quickly

In `firebase-config.js`, set:

```js
forceOpenVault: true
```

Then open `index.html` through a local web server and submit a sample entry.

---

## 7. Notes

- The main submission flow is Firebase-first (no Google Forms in the current flow).
- Optional Google Drive mirror runs only after Firebase upload succeeds.
- File uploads are saved first, then the submission record is written.
- The reveal area groups entries by participant name instead of showing each submission as a separate top-level category.

---
