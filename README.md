# Batch Time Capsule (static site)

Dark-futuristic single-page site that reads entries from Firebase Realtime Database and can now reveal them in contributor folders grouped by name and submission format.

## Files
- index.html
- main.css
- firebase-config.js (replace with your Firebase config)
- app.js
- google-apps-script.js (paste into Google Sheets > Apps Script for the form)

## Revised storage model

If you want each contributor name and submission format to have its own folder, use this structure in **both** Google Drive and Firebase:

```text
Google Drive
└── Time Capsule Root
    └── Jane Doe
        ├── message
        ├── image
        ├── video
        ├── audio
        └── file

Firebase Realtime Database
capsuleEntries/
  jane-doe/
    message/
      -Nx123...
        name: "Jane Doe"
        message: "See you in 2030"
        timestamp: "2026-03-21T10:00:00.000Z"
        format: "message"
        driveFolderUrl: "..."
    image/
      -Nx124...
        name: "Jane Doe"
        timestamp: "2026-03-21T10:00:00.000Z"
        format: "image"
        attachments:
          - name: "grad-photo.jpg"
            type: "image/jpeg"
            url: "..."
```

The front-end in `app.js` now supports both the old flat structure and this nested folder-based structure.

## What you need to change

1. **Keep the site pointed at the same Firebase root path**
   - `app.js` still reads from `capsuleEntries` by default.
   - You do **not** need a new front-end route; you need a new nested data shape under that path.

2. **Change the form ingestion script**
   - Your Google Form / Sheet submit handler must stop writing every submission into one flat collection.
   - Instead, it should:
     - create or reuse a contributor folder using the submitted name,
     - create or reuse a format subfolder (`message`, `image`, `video`, `audio`, or `file`),
     - store/copy uploaded files into the correct Google Drive subfolder,
     - write a matching entry into Firebase at `capsuleEntries/<name-slug>/<format>/...`.
   - This repository now includes an example `google-apps-script.js` that does exactly that.

3. **Make uploaded files publicly retrievable at reveal time**
   - If you store only Google Drive links, the reveal site can only render them if viewers have permission.
   - Safer options:
     - make the copied files readable at reveal time, or
     - store them in Firebase Storage and save public download URLs into the same nested Firebase record.

4. **Use stable slugs for Firebase keys**
   - Use `jane-doe` instead of raw names like `Jane Doe / Prefect` as the database key.
   - Keep the original display name inside each record as `name`.

5. **Keep the reveal lock separate from the storage layout**
   - The vault opening logic is still date-based in `app.js`.
   - The change is about where entries are stored and how they are organized after retrieval.

## Setup steps

1. **Create Firebase project**
   - Go to https://console.firebase.google.com
   - Create a new project (e.g., batch-capsule-2026)
   - Enable **Realtime Database** and set location.
   - Set database rules temporarily to allow writes from your Apps Script:
     ```json
     {
       "rules": {
         ".read": true,
         ".write": true
       }
     }
     ```
     After testing, tighten these rules.

2. **Edit `firebase-config.js`**
   - Replace placeholders with your Firebase project's config.

3. **Set up the Google Form + Sheet**
   - Create the Google Form with fields such as `Name`, `Message`, and `File Upload`.
   - Link the responses to a Google Sheet.
   - In the Sheet: Extensions > Apps Script -> paste `google-apps-script.js`.
   - Update:
     - `FIREBASE_DB_URL`
     - `FIREBASE_ROOT_PATH` (if you do not want `capsuleEntries`)
     - `DRIVE_ROOT_FOLDER_ID`
   - Save and create the trigger: `onFormSubmit` -> `From spreadsheet` -> `On form submit`.

4. **Deploy site**
   - Push repository to GitHub.
   - Enable GitHub Pages from repo Settings -> Pages -> Deploy from `main` branch (`/ (root)`).
   - Or host on Netlify/Vercel if preferred.

5. **Reveal**
   - Set `REVEAL_ISO` or your `window.__APP_CONFIG.revealIso` date.
   - When the reveal opens, the site will read the nested records and show each contributor with grouped folders.

## Notes

- The site will still anonymize entries while the vault is sealed.
- Once opened, contributors are grouped by name, and their submissions are grouped by inferred folder/format.
- If you prefer Firebase-only storage, skip the Drive copy step and write file URLs from Firebase Storage into the same nested structure.
