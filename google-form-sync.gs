/**
 * SIMPLE Google Form -> Firebase Realtime Database sync.
 *
 * WHAT YOU DO:
 * 1) Paste this in the Form's Apps Script project.
 * 2) Set CONFIG below.
 * 3) Create installable trigger:
 *    Function: onFormSubmit
 *    Event source: From form
 *    Event type: On form submit
 *
 * OPTIONAL TEST FROM EDITOR:
 * - Run syncLatestResponse() (NOT onFormSubmit).
 */

const CONFIG = {
  databaseUrl: 'https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app',
  firebasePath: 'capsuleEntries',
  nameField: 'Full name',
  messageField: 'Message to your future self',

  // Optional: set if your DB rules require auth=...
  // Leave blank to use ScriptApp OAuth token.
  databaseSecret: ''
};

/**
 * Trigger entrypoint (real form submit).
 */
function onFormSubmit(e) {
  if (!e || !e.namedValues) {
    throw new Error('No event payload. Do NOT run onFormSubmit manually. Use syncLatestResponse() for testing.');
  }
  syncNamedValues(e.namedValues);
}

/**
 * Manual test helper: syncs the latest Form response.
 */
function syncLatestResponse() {
  const form = FormApp.getActiveForm();
  if (!form) throw new Error('No active Form found. Bind script to a Form.');

  const responses = form.getResponses();
  if (!responses.length) throw new Error('No responses yet.');

  const latest = responses[responses.length - 1];
  const namedValues = {};
  latest.getItemResponses().forEach((r) => {
    const title = String(r.getItem().getTitle() || '').trim();
    const value = r.getResponse();
    namedValues[title] = [Array.isArray(value) ? value.join(', ') : String(value || '').trim()];
  });

  syncNamedValues(namedValues);
}

/**
 * Core sync logic:
 * - Same normalized name => same person group
 * - Every submit => new record under submissions
 */
function syncNamedValues(namedValues) {
  const displayName = normalizeName(readField(namedValues, CONFIG.nameField));
  const message = String(readField(namedValues, CONFIG.messageField) || '').trim();
  if (!displayName) throw new Error(`Missing/empty field: ${CONFIG.nameField}`);
  if (!message) throw new Error(`Missing/empty field: ${CONFIG.messageField}`);

  const now = new Date().toISOString();
  const personKey = slugify(displayName);
  const personPath = `${CONFIG.firebasePath}/${personKey}`;

  // Person/group metadata
  firebaseRequest('patch', personPath, {
    displayName: displayName,
    updatedAt: now
  });

  firebaseRequest('put', `${personPath}/profile`, {
    displayName: displayName,
    normalizedName: personKey
  });

  // Append one submission
  firebaseRequest('post', `${personPath}/submissions`, {
    createdAt: now,
    message: message,
    source: 'google-form',
    rawFormAnswers: namedValues
  });
}

function readField(namedValues, fieldName) {
  const value = namedValues[fieldName];
  if (!value || !value.length) return '';
  return String(value[0] || '').trim();
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function slugify(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'unnamed-participant';
}

function firebaseRequest(method, path, payload) {
  const base = CONFIG.databaseUrl.replace(/\/$/, '');
  const secret = String(CONFIG.databaseSecret || '').trim();
  const authQuery = secret
    ? `auth=${encodeURIComponent(secret)}`
    : `access_token=${encodeURIComponent(ScriptApp.getOAuthToken())}`;
  const url = `${base}/${path}.json?${authQuery}`;

  const res = UrlFetchApp.fetch(url, {
    method: method,
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`Firebase error ${code}: ${res.getContentText()}`);
  }
  return JSON.parse(res.getContentText() || 'null');
}
