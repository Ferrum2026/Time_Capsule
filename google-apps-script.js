/**
 * Google Apps Script for Form -> Firebase Realtime Database
 *
 * Setup:
 * 1) Open the response Google Sheet connected to your form.
 * 2) Extensions -> Apps Script -> paste this file.
 * 3) Update FIREBASE_DB_URL and FIREBASE_PATH.
 * 4) Add trigger: onFormSubmit, From spreadsheet, On form submit.
 */

const FIREBASE_DB_URL = 'https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app';
const FIREBASE_PATH = 'capsuleEntries';

function onFormSubmit(e) {
  if (!e || !e.namedValues) {
    throw new Error('No form submission payload received.');
  }

  const row = e.namedValues; // keys are your exact Google Form question titles

  const payload = {
    name: firstValue(row['Name']) || 'Anonymous',
    message: firstValue(row['Message']) || '',
    fileUrl: extractFileUrl(row),
    submittedAt: new Date().toISOString(),
    source: 'google-form'
  };

  const url = `${FIREBASE_DB_URL}/${FIREBASE_PATH}.json`;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`Firebase write failed (${code}): ${response.getContentText()}`);
  }
}

function firstValue(fieldValue) {
  if (!fieldValue) return '';
  if (Array.isArray(fieldValue) && fieldValue.length > 0) {
    return String(fieldValue[0]).trim();
  }
  return String(fieldValue).trim();
}

function extractFileUrl(row) {
  // If your file upload question has a different title, update this key.
  const fileField = row['File Upload'] || row['Upload'] || row['Attachment'];
  if (!fileField) return '';

  if (Array.isArray(fileField)) {
    return String(fileField[0] || '').trim();
  }
  return String(fileField).trim();
}
