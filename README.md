# Simple Time Capsule Template

This version includes a built-in **Firebase submission form** and an optional **old Google Form fallback link**.

Participants can:
- enter their name using the required format `SURNAME_FIRST NAME_M.I`,
- write a short message,
- optionally upload any file type,
- submit multiple times without creating duplicate person categories,
- still open the old Google Form if you decide to keep it visible.

The website stores:
- every submission payload (`submission.json`) and file uploads in **Firebase Storage**,
- submission records in **Firebase Realtime Database**,
- repeated submissions under the same participant key,
- no Google Drive folders at all.

---

## 1. Main files to edit

- `firebase-config.js` — Firebase project settings, reveal date, optional old Google Form URL, and UI text.
- `index.html` — page structure including the participant form and fallback Google Form link.
- `app.js` — countdown, form handling, Firebase upload logic, fallback Google Form toggle, and grouped entry rendering.
- `main.css` — page styling.

---

## 2. Required participant format

Participants should type their name like this (input is normalized to uppercase automatically):

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
- `attachments[]`
- `storageManifest` (path + URL of the JSON snapshot in Storage)

Firebase Storage stores files under:

```text
capsuleEntries/{person-slug}/{submissionKey}/files/{timestamp-fileName}
```

Each submission also writes a JSON snapshot to:

```text
capsuleEntries/{person-slug}/{submissionKey}/submission.json
```

---

## 4. Optional old Google Form link

If you still want to show the old Google Form for people who are already used to it, set this in `firebase-config.js`:

```js
googleFormUrl: 'https://forms.gle/your-old-link'
```

If `googleFormUrl` is blank, the fallback Google Form buttons stay hidden.

---

## 5. Firebase setup

Enable these Firebase products:
- **Realtime Database**
- **Storage**

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

- The main submission flow is now Firebase-only.
- The optional Google Form link is just a fallback shortcut and does not create Google Drive folders.
- File uploads are saved first, then the submission record is written.
- The reveal area groups entries by participant name instead of showing each submission as a separate top-level category.

---


## 8. Google Form trigger (Apps Script)

If you are submitting from **Google Form** and got:

```text
ReferenceError: document is not defined
```

that means browser code (`app.js`) was pasted into Apps Script. Apps Script has no `document` object.

Use `google-form-sync.gs` instead:

1. Open your Google Form → **Script editor**.
2. Paste `google-form-sync.gs` content.
3. Update these values in `FIREBASE_SYNC_CONFIG`:
   - `databaseUrl`
   - `storageBucket`
   - `firebasePath`
   - `databaseSecret` (optional; only if your Realtime Database rules require `auth`)
   - `nameField` and `messageField` (must match Form question titles exactly)
4. Add an installable trigger: **onFormSubmit** → **From form** → **On form submit**.

5. You can run `onFormSubmit()` manually for debugging: it will read the **latest form response** if no trigger payload is provided.
6. (Optional) run `testFirebaseWrite()` once in Apps Script to verify data appears under `capsuleEntries/...`.

The script will try the configured `storageBucket` first and then fallback to `PROJECT_ID.appspot.com` automatically. It also matches form field titles case-insensitively if spacing/case differs.

This script validates format `SURNAME_FIRST NAME_M.I`, writes each submission to Realtime Database, and uploads `submission.json` to Firebase Storage under:

If Firebase Storage fails, the message is still saved in Realtime Database.

```text
capsuleEntries/{person-slug}/{submissionKey}/submission.json
```

