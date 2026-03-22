# Simple Time Capsule Template

This version includes a built-in **Firebase submission form** and an optional **old Google Form fallback link**.

Participants can:
- enter their name using the required format `SURNAME_FIRST NAME_M.I`,
- write a short message,
- optionally upload any file type,
- submit multiple times without creating duplicate person categories,
- still open the old Google Form if you decide to keep it visible.

The website stores:
- file uploads in **Firebase Storage**,
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

Participants must type their name like this:

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

Uploaded files are stored in Firebase Storage under:

```text
capsuleEntries/{person-slug}/{timestamp-fileName}
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
