/**
 * Google Apps Script for Google Form -> Firebase Realtime Database
 *
 * This version stores each response in two places:
 * 1) `capsuleEntries` (normalized fields used by the website)
 * 2) `sheetSubmissions/<sheetName>` (organized raw data grouped by Sheet tab)
 *
 * Setup:
 * 1) Open the response Google Sheet connected to your form.
 * 2) Extensions -> Apps Script -> paste this file.
 * 3) Update FIREBASE_DB_URL (and paths if needed).
 * 4) Add trigger: onFormSubmit, From spreadsheet, On form submit.
 */

const FIREBASE_DB_URL = 'https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app';
const CAPSULE_PATH = 'capsuleEntries';
const SHEET_ARCHIVE_PATH = 'sheetSubmissions';

function onFormSubmit(e) {
  if (!e || !e.range || !e.source || !e.namedValues) {
    throw new Error('No valid form submission payload received.');
  }

  const row = e.namedValues; // keys are exact Google Form question titles
  const sheet = e.range.getSheet();
  const sheetName = sanitizePathSegment(sheet.getName());
  const rowIndex = e.range.getRow();

  const timestamp = resolveTimestamp(row, new Date());
  const normalizedEntry = {
    name: firstValue(row['Name']) || firstValue(row['name']) || 'Anonymous',
    message: firstValue(row['Message']) || firstValue(row['message']) || '',
    fileUrl: extractFileUrl(row),
    submittedAt: timestamp.toISOString(),
    source: 'google-form',
    sheetName,
    rowIndex
  };

  // Keeps current frontend working.
  postJson(`${FIREBASE_DB_URL}/${CAPSULE_PATH}.json`, normalizedEntry);

  // Stores full response grouped by sheet tab name.
  const archivedSubmission = {
    sheetName,
    rowIndex,
    submittedAt: timestamp.toISOString(),
    normalized: normalizedEntry,
    fields: flattenNamedValues(row)
  };
  postJson(`${FIREBASE_DB_URL}/${SHEET_ARCHIVE_PATH}/${sheetName}.json`, archivedSubmission);
}

function postJson(url, payload) {
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
  const fileField =
    row['Files'] ||
    row['File Upload'] ||
    row['Upload'] ||
    row['Attachment'] ||
    row['File'];

  if (!fileField) return '';
  if (Array.isArray(fileField)) {
    return String(fileField[0] || '').trim();
  }
  return String(fileField).trim();
}

function flattenNamedValues(namedValues) {
  const flattened = {};
  Object.keys(namedValues).forEach((key) => {
    flattened[key] = firstValue(namedValues[key]);
  });
  return flattened;
}

function resolveTimestamp(row, fallbackDate) {
  const timestampValue = firstValue(row['Timestamp']) || firstValue(row['timestamp']);
  const parsed = timestampValue ? new Date(timestampValue) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return fallbackDate;
}

function sanitizePathSegment(value) {
  return String(value || 'unknown-sheet')
    .trim()
    .replace(/[.#$\[\]/]/g, '_')
    .replace(/\s+/g, '_');
}
