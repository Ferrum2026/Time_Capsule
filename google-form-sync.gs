/**
 * SIMPLE Google Form -> Firebase Realtime Database sync (ES5-compatible).
 *
 * Install trigger:
 * - Function: onFormSubmit
 * - Event source: From form
 * - Event type: On form submit
 *
 * Manual editor test:
 * - Run syncLatestResponse() (NOT onFormSubmit)
 */

var CONFIG = {
  databaseUrl: 'https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app',
  firebasePath: 'capsuleEntries',
  nameField: 'Full name',
  messageField: 'Message to your future self',
  databaseSecret: '' // optional
};

function onFormSubmit(e) {
  if (!e || !e.namedValues) {
    throw new Error('No event payload. Do NOT run onFormSubmit manually. Use syncLatestResponse() for testing.');
  }
  syncNamedValues(e.namedValues);
}

function syncLatestResponse() {
  var form = FormApp.getActiveForm();
  if (!form) throw new Error('No active Form found. Bind script to a Form.');

  var responses = form.getResponses();
  if (!responses.length) throw new Error('No responses yet.');

  var latest = responses[responses.length - 1];
  var namedValues = {};
  var itemResponses = latest.getItemResponses();

  for (var i = 0; i < itemResponses.length; i++) {
    var itemResponse = itemResponses[i];
    var title = String(itemResponse.getItem().getTitle() || '').trim();
    var value = itemResponse.getResponse();
    var text = Array.isArray(value) ? value.join(', ') : String(value || '').trim();
    namedValues[title] = [text];
  }

  syncNamedValues(namedValues);
}

function syncNamedValues(namedValues) {
  var displayName = normalizeName(readField(namedValues, CONFIG.nameField));
  var message = String(readField(namedValues, CONFIG.messageField) || '').trim();

  if (!displayName) throw new Error('Missing/empty field: ' + CONFIG.nameField);
  if (!message) throw new Error('Missing/empty field: ' + CONFIG.messageField);

  var now = new Date().toISOString();
  var personKey = slugify(displayName);
  var personPath = CONFIG.firebasePath + '/' + personKey;

  firebaseRequest('patch', personPath, {
    displayName: displayName,
    updatedAt: now
  });

  firebaseRequest('put', personPath + '/profile', {
    displayName: displayName,
    normalizedName: personKey
  });

  firebaseRequest('post', personPath + '/submissions', {
    createdAt: now,
    message: message,
    source: 'google-form',
    rawFormAnswers: namedValues
  });
}

function readField(namedValues, fieldName) {
  var value = namedValues[fieldName];
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
  var base = CONFIG.databaseUrl.replace(/\/$/, '');
  var secret = String(CONFIG.databaseSecret || '').trim();
  var authQuery = secret
    ? 'auth=' + encodeURIComponent(secret)
    : 'access_token=' + encodeURIComponent(ScriptApp.getOAuthToken());
  var url = base + '/' + path + '.json?' + authQuery;

  var res = UrlFetchApp.fetch(url, {
    method: method,
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Firebase error ' + code + ': ' + res.getContentText());
  }
  return JSON.parse(res.getContentText() || 'null');
}
