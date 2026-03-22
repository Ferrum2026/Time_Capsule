/**
 * SIMPLE GOOGLE FORM -> GOOGLE DRIVE -> FIREBASE SCRIPT
 *
 * WHAT THIS DOES:
 * 1. Reads the Google Form answer.
 * 2. Checks the name format: SURNAME_FIRSTNAME_MIDDLEINITIAL
 * 3. Creates a folder in Google Drive using that exact name.
 * 4. Copies uploaded files into that person's folder.
 * 5. Saves the message + file links into Firebase Realtime Database.
 *
 * INSTALL:
 * 1. Open the Google Sheet connected to your Google Form.
 * 2. Click Extensions -> Apps Script.
 * 3. Replace everything there with this file.
 * 4. Fill in the constants below.
 * 5. Add a trigger:
 *    - Function: onFormSubmit
 *    - Event source: From spreadsheet
 *    - Event type: On form submit
 */

const FIREBASE_DB_URL = 'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com';
const FIREBASE_ROOT_PATH = 'capsuleEntries';
const DRIVE_ROOT_FOLDER_ID = 'PUT_YOUR_GOOGLE_DRIVE_ROOT_FOLDER_ID_HERE';

const FIELD_NAMES = {
  timestamp: ['Timestamp'],
  name: ['Name', 'Full Name', 'Your Name'],
  message: ['Message to Future Self', 'Message', 'Letter'],
  upload: ['File Upload', 'Upload File', 'Media Upload']
};

function onFormSubmit(e) {
  if (!e || !e.namedValues) {
    throw new Error('Missing form event data. Make sure this runs from the spreadsheet trigger.');
  }

  const values = e.namedValues;
  const timestamp = readAnswer(values, FIELD_NAMES.timestamp) || new Date().toISOString();
  const rawName = readAnswer(values, FIELD_NAMES.name);
  const message = readAnswer(values, FIELD_NAMES.message);
  const uploadCell = readAnswer(values, FIELD_NAMES.upload);

  validateNameFormat(rawName);

  const driveRoot = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const personFolder = getOrCreateFolder(driveRoot, rawName);
  const uploadedFiles = getUploadedFiles(uploadCell);

  const firebaseEntry = {
    name: rawName,
    message: message || '',
    timestamp,
    attachments: []
  };

  uploadedFiles.forEach((fileInfo) => {
    const copiedFile = fileInfo.file.makeCopy(fileInfo.file.getName(), personFolder);
    firebaseEntry.attachments.push({
      name: copiedFile.getName(),
      type: copiedFile.getMimeType(),
      url: copiedFile.getUrl(),
      driveFolderUrl: personFolder.getUrl()
    });
  });

  firebasePush(`${FIREBASE_ROOT_PATH}/${slugify(rawName)}`, firebaseEntry);
}

function validateNameFormat(name) {
  const trimmed = String(name || '').trim();
  const rule = /^[A-Z]+_[A-Z]+_[A-Z]$/;
  if (!rule.test(trimmed)) {
    throw new Error('Name must follow this format exactly: SURNAME_FIRSTNAME_MIDDLEINITIAL');
  }
}

function readAnswer(namedValues, allowedNames) {
  for (const key of allowedNames) {
    const value = namedValues[key];
    if (value && value[0]) return String(value[0]).trim();
  }
  return '';
}

function getUploadedFiles(uploadCell) {
  if (!uploadCell) return [];

  return String(uploadCell)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((url) => {
      const fileId = extractDriveId(url);
      const file = DriveApp.getFileById(fileId);
      return { file };
    });
}

function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
}

function extractDriveId(url) {
  const match = String(url).match(/[-\w]{25,}/);
  if (!match) {
    throw new Error(`Could not find a Google Drive file ID in this value: ${url}`);
  }
  return match[0];
}

function slugify(value) {
  return String(value || 'unnamed')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'unnamed';
}

function firebasePush(path, payload) {
  const response = UrlFetchApp.fetch(`${FIREBASE_DB_URL}/${path}.json`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`Firebase error ${code}: ${response.getContentText()}`);
  }
}
