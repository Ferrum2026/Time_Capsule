/**
 * Google Apps Script for the Batch Time Capsule.
 *
 * What this version changes:
 * - Creates/reuses a contributor folder in Google Drive using the submitted name.
 * - Creates/reuses a format subfolder inside that contributor folder (message/image/video/audio/file).
 * - Writes a matching nested structure to Firebase Realtime Database so the site can render
 *   folders when the vault opens.
 *
 * Install:
 * 1. Open the Google Sheet linked to your form.
 * 2. Extensions > Apps Script.
 * 3. Paste this file and update the constants below.
 * 4. Create a trigger for onFormSubmit -> From spreadsheet -> On form submit.
 */
const FIREBASE_DB_URL = 'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com';
const FIREBASE_ROOT_PATH = 'capsuleEntries';
const DRIVE_ROOT_FOLDER_ID = 'YOUR_DRIVE_ROOT_FOLDER_ID';

const FIELD_KEYS = {
  name: ['Name', 'Full Name', 'Your Name'],
  message: ['Message', 'Message to Future Self', 'Letter'],
  upload: ['File Upload', 'Upload', 'Media'],
  timestamp: ['Timestamp'],
};

function onFormSubmit(e) {
  if (!e || !e.namedValues) {
    throw new Error('onFormSubmit expects the spreadsheet trigger event object.');
  }

  const values = e.namedValues;
  const contributorName = readFirst(values, FIELD_KEYS.name) || 'Unnamed Contributor';
  const message = readFirst(values, FIELD_KEYS.message) || '';
  const timestamp = readFirst(values, FIELD_KEYS.timestamp) || new Date().toISOString();
  const uploadValue = readFirst(values, FIELD_KEYS.upload) || '';
  const uploadedFiles = resolveUploadedFiles(uploadValue);

  const contributorSlug = slugify(contributorName);
  const dbBasePath = `${FIREBASE_ROOT_PATH}/${contributorSlug}`;
  const driveRoot = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const contributorFolder = getOrCreateChildFolder(driveRoot, contributorName);

  if (message) {
    const messageFolder = getOrCreateChildFolder(contributorFolder, 'message');
    const messageEntry = {
      name: contributorName,
      message,
      timestamp,
      format: 'message',
      driveFolderUrl: messageFolder.getUrl(),
    };
    firebasePost(`${dbBasePath}/message`, messageEntry);
  }

  uploadedFiles.forEach((fileMeta) => {
    const format = detectFormatFromMime(fileMeta.mimeType);
    const formatFolder = getOrCreateChildFolder(contributorFolder, format);
    const copiedFile = fileMeta.file.makeCopy(fileMeta.file.getName(), formatFolder);

    const entry = {
      name: contributorName,
      timestamp,
      format,
      driveFolderUrl: formatFolder.getUrl(),
      attachments: [{
        name: copiedFile.getName(),
        type: fileMeta.mimeType,
        url: copiedFile.getUrl(),
        fileId: copiedFile.getId(),
      }],
    };

    firebasePost(`${dbBasePath}/${format}`, entry);
  });
}

function resolveUploadedFiles(cellValue) {
  if (!cellValue) return [];

  return String(cellValue)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((url) => {
      const fileId = extractDriveId(url);
      if (!fileId) {
        throw new Error(`Could not extract a Drive file ID from: ${url}`);
      }
      const file = DriveApp.getFileById(fileId);
      return {
        file,
        mimeType: file.getMimeType(),
      };
    });
}

function readFirst(namedValues, keys) {
  for (const key of keys) {
    const raw = namedValues[key];
    if (raw && raw.length && raw[0]) {
      return String(raw[0]).trim();
    }
  }
  return '';
}

function detectFormatFromMime(mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

function getOrCreateChildFolder(parentFolder, folderName) {
  const iterator = parentFolder.getFoldersByName(folderName);
  return iterator.hasNext() ? iterator.next() : parentFolder.createFolder(folderName);
}

function extractDriveId(url) {
  const match = String(url).match(/[-\w]{25,}/);
  return match ? match[0] : '';
}

function slugify(value) {
  return String(value || 'unnamed-contributor')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'unnamed-contributor';
}

function firebasePost(path, payload) {
  const endpoint = `${FIREBASE_DB_URL}/${path}.json`;
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify(payload),
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`Firebase write failed (${code}): ${response.getContentText()}`);
  }
}
