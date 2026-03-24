/**
 * Google Apps Script bridge: Google Form -> Firebase Realtime Database + Firebase Storage.
 *
 * IMPORTANT:
 * - This runs in Apps Script, not in the browser.
 * - Attach this to your Google Form (Script editor) and create an installable trigger:
 *   Trigger: onFormSubmit, Event type: From form -> On form submit.
 */

const FIREBASE_SYNC_CONFIG = {
  databaseUrl: 'https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app',
  storageBucket: 'batchcapsule.appspot.com',
  firebasePath: 'capsuleEntries',
  databaseSecret: '',
  nameField: 'Full name',
  messageField: 'Message to your future self'
};

const STRICT_NAME_PATTERN = /^[A-Z][A-Z' -]*_[A-Z][A-Z' -]*_[A-Z](\.[A-Z])?\.?$/;

function onFormSubmit(e) {
  if (!e || !e.namedValues) {
    throw new Error('Missing event payload. Run this from a real Form Submit trigger.');
  }

  const name = normalizeName(readField(e.namedValues, FIREBASE_SYNC_CONFIG.nameField));
  const message = String(readField(e.namedValues, FIREBASE_SYNC_CONFIG.messageField) || '').trim();

  if (!STRICT_NAME_PATTERN.test(name)) {
    throw new Error('Use UPPERCASE strict format: SURNAME_FIRST NAME_M.I');
  }
  if (!message) {
    throw new Error('Message is required.');
  }

  const personKey = slugifyName(name);
  const submissionKey = Utilities.getUuid();
  const nowIso = new Date().toISOString();

  const submissionPayload = {
    createdAt: nowIso,
    message,
    attachments: [],
    source: 'google-form',
    rawFormAnswers: e.namedValues
  };

  const manifestPath = `${FIREBASE_SYNC_CONFIG.firebasePath}/${personKey}/${submissionKey}/submission.json`;
  const manifestUrl = uploadJsonManifest(manifestPath, {
    displayName: name,
    normalizedName: personKey,
    submissionKey,
    ...submissionPayload
  });

  firebasePatch(`${FIREBASE_SYNC_CONFIG.firebasePath}/${personKey}`, {
    displayName: name,
    updatedAt: nowIso
  });

  firebasePut(`${FIREBASE_SYNC_CONFIG.firebasePath}/${personKey}/profile`, {
    displayName: name,
    normalizedName: personKey
  });

  firebasePut(`${FIREBASE_SYNC_CONFIG.firebasePath}/${personKey}/submissions/${submissionKey}`, {
    ...submissionPayload,
    storageManifest: {
      path: manifestPath,
      url: manifestUrl
    }
  });
}

function uploadJsonManifest(path, payload) {
  const token = ScriptApp.getOAuthToken();
  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(FIREBASE_SYNC_CONFIG.storageBucket)}/o?uploadType=media&name=${encodeURIComponent(path)}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${token}`
    },
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`Storage upload failed (${code}): ${response.getContentText()}`);
  }

  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(FIREBASE_SYNC_CONFIG.storageBucket)}/o/${encodeURIComponent(path)}?alt=media`;
}

function firebasePut(path, payload) {
  return firebaseRequest('put', path, payload);
}

function firebasePatch(path, payload) {
  return firebaseRequest('patch', path, payload);
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
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`Database write failed (${code}): ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText() || 'null');
}

function readField(namedValues, fieldName) {
  const value = namedValues[fieldName];
  if (!value || !value.length) {
    throw new Error(`Missing form field: ${fieldName}`);
  }
  return String(value[0] || '').trim();
}

function normalizeName(rawValue) {
  return String(rawValue || '').trim().replace(/\s+/g, ' ');
}

function slugifyName(name) {
  return normalizeName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'unnamed-participant';
}
