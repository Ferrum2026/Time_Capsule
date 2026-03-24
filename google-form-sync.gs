/**
 * Google Form -> Firebase Realtime Database sync.
 *
 * Trigger setup:
 * - Apps Script editor (bound to the Google Form)
 * - Trigger: onFormSubmit, source: From form, event: On form submit
 *
 * Data written to:
 *   capsuleEntries/{person-slug}
 *     - displayName
 *     - updatedAt
 *     - profile
 *     - submissions/{autoId}
 */

var FIREBASE_SYNC_CONFIG = {
  // Realtime Database URL (no trailing slash)
  databaseUrl: 'https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app',

  // Parent path in Realtime Database
  firebasePath: 'capsuleEntries',

  // Optional database secret (legacy). Leave blank for public/dev rules.
  databaseSecret: '',

  // Must match Google Form question titles exactly.
  nameField: 'Full name',
  messageField: 'Message to your future self',

  // Optional: explicit file upload question titles.
  // If empty, script auto-detects all FILE_UPLOAD questions in the form response.
  fileFieldTitles: []
};

// Required strict format: SURNAME_FIRST NAME_M.I
var STRICT_NAME_PATTERN = /^[A-Z][A-Z' -]*_[A-Z][A-Z' -]*_[A-Z](\.[A-Z])?\.?$/;

/**
 * Trigger entrypoint (installable form submit trigger).
 */
function onFormSubmit(e) {
  if (!e || !e.namedValues) {
    throw new Error('Missing event payload. Use an installable form-submit trigger.');
  }

  syncFormSubmitEvent(e);
}

/**
 * Extract, validate, normalize, and sync one submission.
 */
function syncFormSubmitEvent(e) {
  var namedValues = e.namedValues || {};
  var displayName = normalizeName(readField(namedValues, FIREBASE_SYNC_CONFIG.nameField));
  var message = String(readField(namedValues, FIREBASE_SYNC_CONFIG.messageField) || '').trim();
  var attachments = extractDriveAttachments(e);

  if (!STRICT_NAME_PATTERN.test(displayName)) {
    throw new Error('Invalid name format. Use: SURNAME_FIRST NAME_M.I');
  }
  if (!message) {
    throw new Error('Message is required.');
  }

  var nowIso = new Date().toISOString();
  var personKey = slugifyName(displayName);
  var personPath = FIREBASE_SYNC_CONFIG.firebasePath + '/' + personKey;

  // Save the participant node and profile.
  firebasePatch(personPath, {
    displayName: displayName,
    updatedAt: nowIso
  });

  firebasePut(personPath + '/profile', {
    displayName: displayName,
    normalizedName: personKey
  });

  // Save one submission directly into Realtime Database.
  var submissionPayload = {
    createdAt: nowIso,
    message: message,
    source: 'google-form',
    attachments: attachments,
    storageManifest: null,
    rawFormAnswers: namedValues
  };

  firebasePost(personPath + '/submissions', submissionPayload);
}

function extractDriveAttachments(e) {
  if (!e || !e.response || typeof e.response.getItemResponses !== 'function') {
    return [];
  }

  var configuredTitles = (FIREBASE_SYNC_CONFIG.fileFieldTitles || [])
    .map(function(title) { return String(title || '').trim(); })
    .filter(function(title) { return Boolean(title); });

  var itemResponses = e.response.getItemResponses();
  var attachments = [];

  itemResponses.forEach(function(itemResponse) {
    var item = itemResponse.getItem();
    var title = String(item.getTitle() || '').trim();
    var itemType = item.getType && item.getType();

    var allowByTitle = configuredTitles.length === 0 || configuredTitles.indexOf(title) !== -1;
    var isFileUpload = itemType === FormApp.ItemType.FILE_UPLOAD;
    if (!allowByTitle || !isFileUpload) return;

    var responseValue = itemResponse.getResponse();
    var fileIds = Array.isArray(responseValue)
      ? responseValue
      : (responseValue ? [responseValue] : []);

    fileIds.forEach(function(fileId) {
      var attachment = mapDriveFileAttachment(fileId);
      if (attachment) {
        attachments.push(attachment);
      }
    });
  });

  return attachments;
}

function mapDriveFileAttachment(fileId) {
  var cleanId = String(fileId || '').trim();
  if (!cleanId) return null;

  try {
    var file = DriveApp.getFileById(cleanId);
    var mime = file.getMimeType() || 'application/octet-stream';
    return {
      id: cleanId,
      name: file.getName() || ('drive-file-' + cleanId),
      type: mime,
      size: Number(file.getSize() || 0),
      source: 'google-drive',
      url: 'https://drive.google.com/file/d/' + encodeURIComponent(cleanId) + '/view?usp=drivesdk',
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(cleanId)
    };
  } catch (error) {
    // Keep sync resilient when one file becomes inaccessible/deleted.
    return {
      id: cleanId,
      name: 'drive-file-' + cleanId,
      type: 'application/octet-stream',
      size: 0,
      source: 'google-drive',
      url: 'https://drive.google.com/file/d/' + encodeURIComponent(cleanId) + '/view?usp=drivesdk',
      error: String(error && error.message ? error.message : error)
    };
  }
}

function readField(namedValues, fieldName) {
  var value = namedValues[fieldName] || namedValues[String(fieldName || '').trim()];
  if (!value || !value.length) {
    throw new Error('Missing form field: ' + fieldName);
  }
  return String(value[0] || '').trim();
}

function normalizeName(rawValue) {
  return String(rawValue || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function slugifyName(name) {
  return normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'unnamed-participant';
}

function firebasePut(path, payload) {
  return firebaseRequest('put', path, payload);
}

function firebasePatch(path, payload) {
  return firebaseRequest('patch', path, payload);
}

function firebasePost(path, payload) {
  return firebaseRequest('post', path, payload);
}

function firebaseRequest(method, path, payload) {
  var base = FIREBASE_SYNC_CONFIG.databaseUrl.replace(/\/$/, '');
  var secret = String(FIREBASE_SYNC_CONFIG.databaseSecret || '').trim();
  var url = secret
    ? base + '/' + path + '.json?auth=' + encodeURIComponent(secret)
    : base + '/' + path + '.json';

  var response = UrlFetchApp.fetch(url, {
    method: method,
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Firebase write failed (' + status + '): ' + response.getContentText());
  }

  return JSON.parse(response.getContentText() || 'null');
}
