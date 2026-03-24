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

var FIREBASE_SYNC_CONFIG = {};
// Realtime Database URL (no trailing slash)
FIREBASE_SYNC_CONFIG.databaseUrl = 'https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app';
// Parent path in Realtime Database
FIREBASE_SYNC_CONFIG.firebasePath = 'capsuleEntries';
// Optional database secret (legacy). Leave blank for public/dev rules.
FIREBASE_SYNC_CONFIG.databaseSecret = '';
// Must match Google Form question titles exactly.
FIREBASE_SYNC_CONFIG.nameField = 'Full name';
FIREBASE_SYNC_CONFIG.messageField = 'Message to your future self';

// Required strict format: SURNAME_FIRST NAME_M.I
var STRICT_NAME_PATTERN = /^[A-Z][A-Z' -]*_[A-Z][A-Z' -]*_[A-Z](\.[A-Z])?\.?$/;

function onFormSubmit(e) {
  if (!e || !e.namedValues) {
    throw new Error('Missing event payload. Use an installable form-submit trigger.');
  }

  syncNamedValues(e.namedValues);
}

function syncNamedValues(namedValues) {
  var displayName = normalizeName(readField(namedValues, FIREBASE_SYNC_CONFIG.nameField));
  var message = String(readField(namedValues, FIREBASE_SYNC_CONFIG.messageField) || '').trim();

  if (!STRICT_NAME_PATTERN.test(displayName)) {
    throw new Error('Invalid name format. Use: SURNAME_FIRST NAME_M.I');
  }
  if (!message) {
    throw new Error('Message is required.');
  }

  var nowIso = new Date().toISOString();
  var personKey = slugifyName(displayName);
  var personPath = FIREBASE_SYNC_CONFIG.firebasePath + '/' + personKey;

  firebasePatch(personPath, {
    displayName: displayName,
    updatedAt: nowIso
  });

  firebasePut(personPath + '/profile', {
    displayName: displayName,
    normalizedName: personKey
  });

  firebasePost(personPath + '/submissions', {
    createdAt: nowIso,
    message: message,
    source: 'google-form',
    attachments: [],
    storageManifest: null,
    rawFormAnswers: namedValues
  });
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
