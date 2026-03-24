# Simple Time Capsule Template

This version includes a built-in **Firebase submission form** that stores messages in **Firebase Realtime Database** and files in **Firebase Storage**.

Participants can:
- enter their name using the required format `SURNAME_FIRST NAME_M.I`,
- write a short message,
- optionally upload any file type,
- submit multiple times without creating duplicate person categories,
- upload files that are stored in Firebase Storage and linked in each DB submission.

The website stores:
- participant profile and submission records in **Firebase Realtime Database**,
- uploaded files in **Firebase Storage**,
- repeated submissions under the same participant key.

---

## 1. Main files to edit

- `firebase-config.js` — Firebase project settings, reveal date, and UI text.
- `index.html` — page structure including the participant form and storage-priority guidance.
- `app.js` — countdown, form handling, Firebase upload flow (Storage + Realtime Database), and grouped entry rendering.
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
- `attachments[]` containing `{ name, type, size, path, url }`
- `storageManifest` containing `{ path, url }`

Firebase Storage stores files under:

```text
capsuleEntries/{person-slug}/{submissionKey}/files/{timestamp-fileName}
```

## 4. Data model

Google Forms are currently on hold.

Each submission is written under `capsuleEntries/{person-slug}/submissions/{autoId}` with:

- `createdAt`
- `message`
- `attachments[]` containing `{ name, type, size, path, url }`

## 5. Firebase setup

Enable these Firebase products:
- **Authentication** (Anonymous sign-in)
- **Realtime Database**
- **Firebase Storage**

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

- The main submission flow uses Firebase Realtime Database + Firebase Storage (no Google Forms in the current flow).
- Set `forceOpenVault: false` to use the countdown lock; set `true` only for testing the open state.
- The reveal area groups entries by participant name instead of showing each submission as a separate top-level category.

---

## 8. Secure the reveal (important)

UI locks can be bypassed with browser dev tools, so you must secure data at Firebase rules level.

- Keep `requireAuth: true` in `firebase-config.js`.
- Enable Anonymous Auth in Firebase Console.
- Publish strict Realtime Database rules (see `database.rules.json`).
- Set `settings/revealAt` in Realtime Database as a Unix timestamp in milliseconds (example: `1798761599000` for December 31, 2026 23:59:59 UTC).

Example deployment command:

```bash
firebase deploy --only database
```

