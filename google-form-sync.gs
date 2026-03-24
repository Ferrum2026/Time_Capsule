/**
 * Simple Google Form -> Firebase Realtime Database sync.
 *
 * How it works:
 * - Runs immediately on each Form submit (installable trigger required).
 * - Groups repeat submissions under the same person key when the same name format is used.
 * - Stores every submission in:
 *   capsuleEntries/{person-slug}/submissions/{autoId}
 */

const FIREBASE_SYNC_CONFIG = {
  // Realtime Database URL (no trailing slash)
  databaseUrl: 'https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app',

  // Parent path in Realtime Database
  firebasePath: 'capsuleEntries',

  // Optional. If your DB rules require auth, set your database secret here.
  // Leave blank to use ScriptApp OAuth token.
  databaseSecret: '',

  // Google Form question titles (must match exactly)
  nameField: 'Full name',
  messageField: 'Message to your future self'
};

// Required strict format: SURNAME_FIRST NAME_M.I
const STRICT_NAME_PATTERN = /^[A-Z][A-Z' -]*_[A-Z][A-Z' -]*_[A-Z](\.[A-Z])?\.?$/;

function onFormSubmit(e) {
  const namedValues = getNamedValuesFromEventOrLatestResponse(e);

  const displayName = normalizeName(readField(namedValues, FIREBASE_SYNC_CONFIG.nameField));
  const message = String(readField(namedValues, FIREBASE_SYNC_CONFIG.messageField) || '').trim();

  if (!STRICT_NAME_PATTERN.test(displayName)) {
    throw new Error('Invalid name format. Use: SURNAME_FIRST NAME_M.I');
  }
  if (!message) {
    throw new Error('Message is required.');
  }

  const nowIso = new Date().toISOString();
  const personKey = slugifyName(displayName);
  const personPath = `${FIREBASE_SYNC_CONFIG.firebasePath}/${personKey}`;

  // 1) Maintain grouped person metadata.
  firebasePatch(personPath, {
    displayName,
    updatedAt: nowIso
  });

  firebasePut(`${personPath}/profile`, {
    displayName,
    normalizedName: personKey
  });

  // 2) Add one submission record under the same person group.
  const submissionPayload = {
    createdAt: nowIso,
    message,
    source: 'google-form',
    rawFormAnswers: namedValues
  };
  firebasePost(`${personPath}/submissions`, submissionPayload);
}

function getNamedValuesFromEventOrLatestResponse(e) {
  if (e && e.namedValues) return e.namedValues;

  // Editor/manual fallback: use the most recent Form response.
  const form = FormApp.getActiveForm();
  if (!form) {
    throw new Error('No active Form found. Bind this script to your Google Form.');
  }

  const responses = form.getResponses();
  if (!responses.length) {
    throw new Error('No form responses found to test with.');
  }

  const latest = responses[responses.length - 1];
  const itemResponses = latest.getItemResponses();
  const namedValues = {};
  itemResponses.forEach((itemResponse) => {
    const title = String(itemResponse.getItem().getTitle() || '').trim();
    const answer = itemResponse.getResponse();
    const text = Array.isArray(answer) ? answer.join(', ') : String(answer || '').trim();
    namedValues[title] = [text];
  });

  return namedValues;
}

function readField(namedValues, fieldName) {
  const value = namedValues[fieldName];
  if (!value || !value.length) {
    throw new Error(`Missing form field: ${fieldName}`);
  }
  return String(value[0] || '').trim();
}

function normalizeName(rawValue) {
  return String(rawValue || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
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
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(`Firebase write failed (${status}): ${response.getContentText()}`);
  }

  return JSON.parse(response.getContentText() || 'null');
}
