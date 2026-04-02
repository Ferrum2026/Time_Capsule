/**
 * Google Apps Script Web App endpoint for copying website-uploaded files
 * (from Firebase Storage download URLs) into Google Drive folders.
 *
 * Deploy:
 * 1) Apps Script -> Deploy -> New deployment -> Web app
 * 2) Execute as: Me
 * 3) Who has access: Anyone (or Anyone with link)
 * 4) Copy /exec URL into firebase-config.js -> appConfig.driveSync.webhookUrl
 */

var DRIVE_SYNC_CONFIG = {};
// Root folder where participant folders will be created.
DRIVE_SYNC_CONFIG.rootFolderId = '14q0u9WSr3WvBLO9t96HPALANiEP8Uvn4SME83p3EpyM6IhtrV6nYNlRi14xX5TyCdm7ljv7a';
// Optional shared key. If set, website must send same key in query param (?key=...).
DRIVE_SYNC_CONFIG.apiKey = 'AIzaSyB9ADMsJMGKO9jvUxpDdclVAHy4RZmileQ';

function doPost(e) {
  try {
    validateRequestKey(e);
    var payload = parsePayload(e);

    var displayName = String(payload.displayName || '').trim();
    var personKey = String(payload.personKey || '').trim();
    var attachments = payload.attachments || [];

    if (!displayName) {
      throw new Error('displayName is required.');
    }
    if (!attachments.length) {
      return jsonResponse({ ok: true, copiedCount: 0, message: 'No attachments to copy.' });
    }

    var folderName = displayName + ' [' + (personKey || 'no-key') + ']';
    var targetFolder = getOrCreateParticipantFolder(folderName);

    var copied = [];
    attachments.forEach(function(item) {
      var url = String(item && item.url ? item.url : '').trim();
      if (!url) return;

      var fileName = String(item && item.name ? item.name : 'uploaded-file').trim();
      var blob = UrlFetchApp.fetch(url).getBlob().setName(fileName);
      var file = targetFolder.createFile(blob);
      copied.push({
        name: file.getName(),
        id: file.getId(),
        url: file.getUrl()
      });
    });

    return jsonResponse({
      ok: true,
      folderId: targetFolder.getId(),
      folderUrl: targetFolder.getUrl(),
      copiedCount: copied.length,
      copied: copied
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function validateRequestKey(e) {
  var configuredKey = String(DRIVE_SYNC_CONFIG.apiKey || '').trim();
  if (!configuredKey) return;

  var headerKey = '';
  if (e && e.parameter && e.parameter.key) {
    headerKey = String(e.parameter.key).trim();
  }

  if (headerKey !== configuredKey) {
    throw new Error('Unauthorized request key.');
  }
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Missing JSON payload.');
  }

  return JSON.parse(e.postData.contents);
}

function getOrCreateParticipantFolder(folderName) {
  var root = getRootFolder();
  var existing = root.getFoldersByName(folderName);
  if (existing.hasNext()) {
    return existing.next();
  }
  return root.createFolder(folderName);
}

function getRootFolder() {
  var rootFolderId = String(DRIVE_SYNC_CONFIG.rootFolderId || '').trim();
  if (rootFolderId) {
    return DriveApp.getFolderById(rootFolderId);
  }
  return DriveApp.getRootFolder();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
