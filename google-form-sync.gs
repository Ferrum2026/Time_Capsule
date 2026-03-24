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

  // Optional database secret (legacy). Leave blank to use ScriptApp OAuth token.
  databaseSecret: '',

  // Must match Google Form question titles exactly.
  nameField: 'Full name',
  messageField: 'Message to your future self'
};

  // Optional: explicit file upload question titles.
  // If empty, script auto-detects all FILE_UPLOAD questions in the form response.
  fileFieldTitles: [],

  // Optional: where uploaded form files should be attached in Drive.
  // Leave blank to keep the original Form upload location.
  driveFolderId: '4q0u9WSr3WvBLO9t96HPALANiEP8Uvn4SME83p3EpyM6IhtrV6nYNlRi14xX5TyCdm7ljv7a',

  // Set true to attempt "Anyone with the link can view" on uploaded files.
  makeFilesPublic: true
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

  syncNamedValues(e.namedValues);
}

/**
 * Extract, validate, normalize, and sync one submission.
 */
function syncNamedValues(namedValues) {
  const displayName = normalizeName(readField(namedValues, FIREBASE_SYNC_CONFIG.nameField));
  const message = String(readField(namedValues, FIREBASE_SYNC_CONFIG.messageField) || '').trim();

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
  const submissionPayload = {
    createdAt: nowIso,
    message: message,
    source: 'google-form',
    attachments: [],
    storageManifest: null,
    rawFormAnswers: namedValues
  };

  firebasePost(`${personPath}/submissions`, submissionPayload);
}

function readField(namedValues, fieldName) {
  const value = namedValues[fieldName] || namedValues[String(fieldName || '').trim()];
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
  const base = FIREBASE_SYNC_CONFIG.databaseUrl.replace(/\/$/, '');
  const secret = String(FIREBASE_SYNC_CONFIG.databaseSecret || '').trim();
  const authQuery = secret
    ? `auth=${encodeURIComponent(secret)}`
    : `access_token=${encodeURIComponent(ScriptApp.getOAuthToken())}`;

  const url = `${base}/${path}.json?${authQuery}`;
  const response = UrlFetchApp.fetch(url, {
    method,
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers,
    muteHttpExceptions: true
  });

  var status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Firebase write failed (' + status + '): ' + response.getContentText());
  }

  return JSON.parse(response.getContentText() || 'null');
}
