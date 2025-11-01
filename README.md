# Batch Time Capsule (static site)

Dark-futuristic single-page site that reads entries from Firebase Realtime Database.

## Files
- index.html
- style/main.css
- scripts/firebase-config.js (replace with your Firebase config)
- scripts/app.js
- google-apps-script.js (paste into Google Sheets > Apps Script for the form)

## Setup steps

1. **Create Firebase project**
   - Go to https://console.firebase.google.com
   - Create a new project (e.g., batch-capsule-2025)
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
     (Important: after testing, tighten rules. Recommended final rule: only allow read to public at reveal time, and writes only from a server/service account.)

2. **Edit `scripts/firebase-config.js`**
   - Replace placeholders with your Firebase project's config (found in Project Settings -> General -> SDK).

3. **Google Form & Sheet**
   - Create the Google Form with fields: `Name`, `Message` (long answer), `File Upload`.
   - Responses -> linked Google Sheet.
   - In the Sheet: Extensions > Apps Script -> paste `google-apps-script.js`, update `FIREBASE_DB_URL` and optionally `FIREBASE_PATH`.
   - Save and set up a trigger: `onFormSubmit` -> `From spreadsheet` -> `On form submit`.

4. **Deploy site**
   - Push repository to GitHub.
   - Enable GitHub Pages from repo Settings -> Pages -> Deploy from `main` branch (`/ (root)`).
   - Or host on Netlify/Vercel if preferred.

5. **Security**
   - After confirming pushes, update Realtime DB rules:
     - Allow reads only when you want to open capsule (e.g., set `.read` to false until reveal).
     - Or keep `.read` true and rely on front-end lock (less secure).
   - Better: Keep DB `.read` false until reveal. When you're ready, change rules to allow `.read` true (public) or deploy a server that authenticates reads for viewers.

6. **Reveal**
   - Set `REVEAL_ISO` in `scripts/app.js` to your chosen reveal date.
   - On reveal date, the site will automatically show entries.

## Admin tips
- Use a separate admin Firebase service account if you want to programmatically change rules later.
- If files are large, consider storing them in Firebase Storage and saving download URLs in the Realtime DB.
