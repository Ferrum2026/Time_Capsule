 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/google-apps-script.js b/google-apps-script.js
index 9583aefb3f62b45d80030041bc1ed651d606506b..7f13bad0050641b23b12a3c9d96a399291c8665d 100644
--- a/google-apps-script.js
 b/google-apps-script.js
@@ -1,147 1,194 @@
 /**
- * Google Apps Script for the Batch Time Capsule.
 * READY-TO-PASTE GOOGLE APPS SCRIPT
  *
- * What this version changes:
- * - Creates/reuses a contributor folder in Google Drive using the submitted name.
- * - Creates/reuses a format subfolder inside that contributor folder (message/image/video/audio/file).
- * - Writes a matching nested structure to Firebase Realtime Database so the site can render
- *   folders when the vault opens.
 * USE THIS TRIGGER:
 * - Function: onFormSubmit
 * - Event source: From form
 * - Event type: On form submit
  *
- * Install:
- * 1. Open the Google Sheet linked to your form.
- * 2. Extensions > Apps Script.
- * 3. Paste this file and update the constants below.
- * 4. Create a trigger for onFormSubmit -> From spreadsheet -> On form submit.
 * WHAT THIS SCRIPT DOES:
 * 1. Reads answers directly from the Google Form submit event.
 * 2. Validates the name format: SURNAME_FIRSTNAME_MIDDLEINITIAL
 * 3. Creates or reuses one Google Drive folder for that person.
 * 4. Copies uploaded files into that person's folder.
 * 5. Saves the message  copied file info into Firebase Realtime Database.
  */

 const FIREBASE_DB_URL = 'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com';
 const FIREBASE_ROOT_PATH = 'capsuleEntries';

const DRIVE_ROOT_FOLDER_ID = 'PUT_YOUR_GOOGLE_DRIVE_ROOT_FOLDER_ID_HERE';

const FIELD_NAMES = {
   name: ['Name', 'Full Name', 'Your Name'],

  message: ['Message to Future Self', 'Message', 'Letter'],
  upload: ['File Upload', 'Upload File', 'Media Upload']
 };
 
 function onFormSubmit(e) {

  try {
    if (!e || !e.response) {
      throw new Error('Missing form event object. Create the trigger as: From form -> On form submit.');
    }

    validateConfig();

    const formResponse = e.response;
    const answerMap = mapFormAnswers(formResponse);
    const timestamp = formResponse.getTimestamp().toISOString();
    const rawName = readFirstAnswer(answerMap, FIELD_NAMES.name);
    const message = readFirstAnswer(answerMap, FIELD_NAMES.message);
    const uploadValues = readAnswerList(answerMap, FIELD_NAMES.upload);
 

    validateNameFormat(rawName);

    const driveRoot = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
    const personFolder = getOrCreateFolder(driveRoot, rawName);
    const uploadedFiles = resolveUploadedFiles(uploadValues);

    const firebaseEntry = {
      name: rawName,
      message: message || '',
       timestamp,

      driveFolderUrl: personFolder.getUrl(),
      attachments: uploadedFiles.map((sourceFile) => copyFileToFolder(sourceFile, personFolder))
     };


    const firebaseResult = firebasePush(`${FIREBASE_ROOT_PATH}/${slugify(rawName)}`, firebaseEntry);
    Logger.log(`Saved submission for ${rawName}. Firebase response: ${firebaseResult}`);
  } catch (error) {
    Logger.log(`onFormSubmit failed: ${error && error.stack ? error.stack : error}`);
    throw error;
   }
}
 
function validateConfig() {
  if (!FIREBASE_DB_URL || FIREBASE_DB_URL.indexOf('YOUR_PROJECT_ID') !== -1) {
    throw new Error('Please replace FIREBASE_DB_URL with your real Firebase Realtime Database URL.');
  }
 

  if (!DRIVE_ROOT_FOLDER_ID || DRIVE_ROOT_FOLDER_ID.indexOf('PUT_YOUR_GOOGLE_DRIVE_ROOT_FOLDER_ID_HERE') !== -1) {
    throw new Error('Please replace DRIVE_ROOT_FOLDER_ID with your real Google Drive folder ID.');
  }
}

function mapFormAnswers(formResponse) {
  const answerMap = {};
 
  formResponse.getItemResponses().forEach((itemResponse) => {
    const title = String(itemResponse.getItem().getTitle() || '').trim();
    const rawResponse = itemResponse.getResponse();
    answerMap[title] = normalizeResponseValue(rawResponse);
   });

  return answerMap;
 }
 

function normalizeResponseValue(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((item) => normalizeResponseValue(item));
  return [String(value).trim()].filter(Boolean);
 }
 

function readFirstAnswer(answerMap, allowedTitles) {
  for (const title of allowedTitles) {
    const values = answerMap[title];
    if (values && values.length) {
      return String(values[0]).trim();
     }
   }
   return '';
 }
 

function readAnswerList(answerMap, allowedTitles) {
  for (const title of allowedTitles) {
    const values = answerMap[title];
    if (values && values.length) {
      return values;
    }
  }
  return [];
}

function validateNameFormat(name) {
  const trimmed = String(name || '').trim();
  const rule = /^[A-Z]_[A-Z]_[A-Z]$/;

  if (!trimmed) {
    throw new Error('The Name field is empty.');
  }

  if (!rule.test(trimmed)) {
    throw new Error('Name must follow this exact format: SURNAME_FIRSTNAME_MIDDLEINITIAL');
  }
}

function resolveUploadedFiles(uploadValues) {
  return uploadValues.map((value) => {
    const cleanedValue = String(value || '').trim();
    if (!cleanedValue) {
      throw new Error('Found an empty upload value in the form response.');
    }

    const fileId = looksLikeDriveId(cleanedValue) ? cleanedValue : extractDriveId(cleanedValue);
    return DriveApp.getFileById(fileId);
  });
 }
 
function copyFileToFolder(sourceFile, destinationFolder) {
  const copiedFile = sourceFile.makeCopy(sourceFile.getName(), destinationFolder);
  return {
    name: copiedFile.getName(),
    type: copiedFile.getMimeType(),
    url: copiedFile.getUrl(),
    fileId: copiedFile.getId(),
    driveFolderUrl: destinationFolder.getUrl()
  };
 }
 

function looksLikeDriveId(value) {
  return /^[-\w]{25,}$/.test(String(value).trim());
}

function extractDriveId(value) {
  const match = String(value).match(/[-\w]{25,}/);
  if (!match) {
    throw new Error(`Could not find a Google Drive file ID in this value: ${value}`);
  }
  return match[0];
}

function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
 }
 
 function slugify(value) {

  return String(value || 'unnamed')
     .trim()
     .toLowerCase()
     .replace(/[^a-z0-9]/g, '-')

    .replace(/(^-|-$)/g, '') || 'unnamed';
 }
 

function firebasePush(path, payload) {
  const endpoint = `${stripTrailingSlash(FIREBASE_DB_URL)}/${path}.json`;
   const response = UrlFetchApp.fetch(endpoint, {
     method: 'post',
     contentType: 'application/json',

    muteHttpExceptions: true
   });
 
   const code = response.getResponseCode();
  const body = response.getContentText();

   if (code < 200 || code >= 300) {

    throw new Error(`Firebase write failed (${code}): ${body}`);
   }

  return body;
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/$/, '');
 }
 
EOF
)
