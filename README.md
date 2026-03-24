# Simple Time Capsule Template

This version includes a built-in **Firebase submission form** that stores submissions (including files) directly in **Firebase Realtime Database**.

Participants can:
- enter their name using the required format `SURNAME_FIRST NAME_M.I`,
- write a short message,
- optionally upload any file type,
- submit multiple times without creating duplicate person categories,
- upload files that are saved directly in the same database submission record.

The website stores:
- participant profile and submission records in **Firebase Realtime Database**,
- message text and uploaded file payloads stored together per submission,
- repeated submissions under the same participant key.

---

## 1. Main files to edit

- `firebase-config.js` — Firebase project settings, reveal date, and UI text.
- `index.html` — page structure including the participant form and storage-priority guidance.
- `app.js` — countdown, form handling, file-to-dataURL conversion, Realtime Database writes, and grouped entry rendering.
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

## 4. Data model

Google Forms are currently on hold.

Each submission is written under `capsuleEntries/{person-slug}/submissions/{autoId}` with:

- `createdAt`
- `message`
- `attachments[]` containing `{ name, type, size, dataUrl }`

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

- The main submission flow is Firebase Realtime Database-only (no Google Forms in the current flow).
- File uploads are encoded and stored in the same submission object as the message and participant key.
- The reveal area groups entries by participant name instead of showing each submission as a separate top-level category.

---
