# Simple Time Capsule Template

This is a **clean and simple** version of the Time Capsule website.

It is made for people who want:
- a locked vault with a countdown,
- a Pinterest-style board layout,
- easy spots for logo, images, and videos,
- a Google Form submission link,
- Google Drive folder creation for each person,
- Firebase Realtime Database storage for messages.

---

## 1. The easiest file to edit

Open this file first:

- `firebase-config.js`

This is your **main control panel**.

Inside that file, you can easily change:
- the reveal date and time,
- the Google Form link,
- the site title,
- the slogan,
- the quote,
- the logo path,
- the image paths,
- the film video path,
- the behind-the-scenes video path.

### The timer line you will change most often

```js
revealIso: '2027-12-31T23:59:59'
```

If you want to test the open vault right away, change this:

```js
forceOpenVault: true
```

---

## 2. Where to put your own logo, images, and videos

Use the folder:

- `media/`

Example files you can place there:
- `media/my-logo.png`
- `media/main-photo.jpg`
- `media/day-one.jpg`
- `media/batch-film.mp4`
- `media/bts-loop.mp4`

Then update `firebase-config.js` like this:

```js
logoPath: 'media/my-logo.png',
heroImagePath: 'media/main-photo.jpg',
throwbackImagePath: 'media/day-one.jpg',
filmVideoPath: 'media/batch-film.mp4',
behindScenesVideoPath: 'media/bts-loop.mp4'
```

---

## 3. What each file does

- `index.html` = the page structure.
- `main.css` = the design and Pinterest board style.
- `app.js` = countdown, lock state, and Firebase display.
- `firebase-config.js` = the easy settings file.
- `google-apps-script.js` = the Google Form automation script.
- `media/README.md` = tells you where to drop your own files.

---

## 4. How the Google Form should work

Your form should ask for:

1. **Name**
2. **Message to Future Self**
3. **File Upload**

### IMPORTANT name rule

Tell users to type their name exactly like this:

```text
SURNAME_FIRSTNAME_MIDDLEINITIAL
```

Example:

```text
CRUZ_JUAN_P
```

> If you want to allow two surnames or more complex names, you can relax the rule later inside `google-apps-script.js`.

---

## 5. What the Google Apps Script does

The file `google-apps-script.js` is ready to paste into Apps Script.

When a person submits the form, it will:

1. read the form answers,
2. validate the name format,
3. create a Google Drive folder using that exact name,
4. copy uploaded files into that folder,
5. save the message and file links into Firebase Realtime Database.

---

## 6. What you MUST replace in `google-apps-script.js`

Search for these lines and replace them:

```js
const FIREBASE_DB_URL = 'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com';
const DRIVE_ROOT_FOLDER_ID = 'PUT_YOUR_GOOGLE_DRIVE_ROOT_FOLDER_ID_HERE';
```

---

## 7. Firebase setup

Create a Firebase project and enable **Realtime Database**.

Then copy your config values into `firebase-config.js`.

For quick testing, you can use simple rules like this:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

After testing, make your rules safer.

---

## 8. Recommended super-simple workflow

### Step A
Duplicate this repository into a **new GitHub repository**.

### Step B
Edit `firebase-config.js`.

### Step C
Put your logo/images/videos into `media/`.

### Step D
Paste `google-apps-script.js` into Google Apps Script.

### Step E
Connect the trigger to the Google Form response sheet.

### Step F
Deploy the site with GitHub Pages.

---

## 9. If you want to test everything quickly

Use these temporary settings in `firebase-config.js`:

```js
forceOpenVault: true,
filmVideoPath: 'media/batch-film.mp4',
behindScenesVideoPath: 'media/bts-loop.mp4'
```

Then add your sample files into `media/`.

---

## 10. Final note

This template is intentionally simple.

It is built so you can copy it into a new repository, rename things, replace your media, and update one easy settings file without digging through lots of code.
