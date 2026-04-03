document.addEventListener('DOMContentLoaded', () => {
  const firebaseConfig = window.__FIREBASE_CONFIG || null;
  const config = window.__APP_CONFIG || {};
  const ui = config.ui || {};

  const revealDate = new Date(config.revealIso || Date.now());
  const isForcedOpen = true; // simple always-open mode
  const firebasePath = config.firebasePath || 'capsuleEntries';
  const maxFileSizeBytes = 5 * 1024 * 1024 * 1024; // 5 GB per file
  const namePattern = /^[A-Z][A-Z' -]*_[A-Z][A-Z' -]*_[A-Z](\.[A-Z])?\.?$/;

  const els = {
    title: document.getElementById('site-title'),
    tagline: document.getElementById('site-tagline'),
    vaultTitle: document.getElementById('vault-title'),
    vaultDescription: document.getElementById('vault-description'),
    vaultState: document.getElementById('vault-state'),
    revealDateLabel: document.getElementById('reveal-date-label'),
    filmVideo: document.getElementById('film-video'),
    btsVideo: document.getElementById('bts-video'),
    memoriesLink: document.getElementById('memories-link'),
    formLinkTop: document.getElementById('form-link-top'),
    siteLogo: document.getElementById('site-logo'),
    days: document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    minutes: document.getElementById('cd-minutes'),
    seconds: document.getElementById('cd-seconds'),
    form: document.getElementById('capsule-form'),
    nameInput: document.getElementById('name-input'),
    messageInput: document.getElementById('message-input'),
    filesInput: document.getElementById('files-input'),
    formStatus: document.getElementById('form-status'),
    entriesStatus: document.getElementById('entries-status'),
    entriesBoard: document.getElementById('entries-board'),
    entriesSection: document.getElementById('entries-section'),
  };

  setText(els.title, ui.siteTitle || 'Batch Fe Time Capsule Vault');
  setText(els.tagline, ui.siteTagline || 'A themed vault website with timer and submission form.');
  setText(els.vaultTitle, ui.vaultTitle || 'Batch Time Capsule Vault');
  setText(els.vaultDescription, ui.vaultDescription || 'This vault opens when the countdown reaches zero.');
  setSrc(els.siteLogo, ui.logoPath || 'assets/batch-logo-2026.svg');
  setVideoSource(els.filmVideo, ui.filmVideoPath);
  setVideoSource(els.btsVideo, ui.behindScenesVideoPath);
  setLinkHref(els.memoriesLink, ui.facebookPageUrl || ui.memoriesPageUrl || '#');

  if (els.formLinkTop) els.formLinkTop.href = '#submission-form';
  if (els.revealDateLabel) els.revealDateLabel.textContent = `Reveal date: ${formatDate(revealDate)}`;

  let database = null;
  let storage = null;
  let countdownTimer = null;
  let latestEntriesData = {};
  let hasSubscribedEntries = false;

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function setSrc(el, value) {
    if (el && value) el.src = value;
  }

  function setVideoSource(video, path) {
    if (!video || !path) return;
    video.src = path;
  }

  function setLinkHref(link, href) {
    if (!link || !href) return;
    link.href = href;
  }

  function formatDate(date) {
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    return ['true', '1', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
  }

  function isOpen() {
    return isForcedOpen || Date.now() >= revealDate.getTime();
  }

  function updateCountdown() {
    const now = Date.now();
    const distance = revealDate.getTime() - now;
    const safeDistance = Math.max(distance, 0);
    const days = Math.floor(safeDistance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((safeDistance / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((safeDistance / (1000 * 60)) % 60);
    const seconds = Math.floor((safeDistance / 1000) % 60);

    setText(els.days, String(days).padStart(2, '0'));
    setText(els.hours, String(hours).padStart(2, '0'));
    setText(els.minutes, String(minutes).padStart(2, '0'));
    setText(els.seconds, String(seconds).padStart(2, '0'));

    applyVaultState();

    if (!isOpen()) {
      const waitMs = 1000 - (now % 1000 || 1000);
      countdownTimer = window.setTimeout(updateCountdown, waitMs);
    }
  }

  function applyVaultState() {
    if (!els.vaultState) return;
    if (isOpen()) {
      els.vaultState.textContent = isForcedOpen ? 'Vault is open (forced)' : 'Vault is open';
      els.vaultState.className = 'vault-state open';
      if (countdownTimer) {
        window.clearTimeout(countdownTimer);
        countdownTimer = null;
      }
      els.days.textContent = '00';
      els.hours.textContent = '00';
      els.minutes.textContent = '00';
      els.seconds.textContent = '00';
    } else {
      els.vaultState.textContent = 'Vault is still locked...';
      els.vaultState.className = 'vault-state locked';
    }
    updateEntriesVisibility();
  }

  function updateEntriesVisibility() {
    if (!els.entriesBoard || !els.entriesStatus || !els.entriesSection) return;
    if (!isOpen()) {
      els.entriesSection.hidden = true;
      els.entriesSection.style.display = 'none';
      els.entriesBoard.innerHTML = '';
      els.entriesStatus.textContent = 'Submitted memories will appear once the vault is open.';
      return;
    }

    els.entriesSection.hidden = false;
    els.entriesSection.style.display = '';
    els.entriesBoard.hidden = false;
    if (!hasSubscribedEntries) {
      subscribeEntries();
      return;
    }
    renderEntries(latestEntriesData);
  }

  function createAttachmentNode(attachment) {
    const wrap = document.createElement('div');
    wrap.className = 'entry-attachment';
    const type = String(attachment?.type || '').toLowerCase();
    const name = String(attachment?.name || 'Attachment');
    const fileUrl = String(attachment?.downloadUrl || attachment?.dataUrl || '');
    if (!fileUrl) return wrap;

    if (type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = fileUrl;
      img.alt = name;
      img.loading = 'lazy';
      img.className = 'entry-attachment-media';
      wrap.appendChild(img);
      return wrap;
    }

    if (type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = fileUrl;
      video.controls = true;
      video.className = 'entry-attachment-media';
      wrap.appendChild(video);
      return wrap;
    }

    const link = document.createElement('a');
    link.href = fileUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `Open ${name}`;
    wrap.appendChild(link);
    return wrap;
  }

  function renderEntries(data) {
    if (!els.entriesBoard || !els.entriesStatus) return;
    if (!isOpen()) return;

    els.entriesBoard.innerHTML = '';
    const entries = Object.values(data || {});
    if (!entries.length) {
      els.entriesStatus.textContent = 'No submissions yet.';
      return;
    }

    const groupedByName = new Map();
    for (const person of entries) {
      const displayName = String(
        person?.displayName ||
        person?.profile?.displayName ||
        'Unnamed participant'
      ).trim();
      const groupingKey = displayName.toUpperCase();

      if (!groupedByName.has(groupingKey)) {
        groupedByName.set(groupingKey, { displayName, submissions: [] });
      }

      const group = groupedByName.get(groupingKey);
      const submissions = Object.values(person?.submissions || {});
      group.submissions.push(...submissions);
    }

    const sortedPeople = Array.from(groupedByName.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
    );

    for (const person of sortedPeople) {
      const card = document.createElement('article');
      card.className = 'entry-card';

      const title = document.createElement('h4');
      title.textContent = person?.displayName || 'Unnamed participant';
      card.appendChild(title);

      const submissions = Object.values(person?.submissions || {}).sort((a, b) => {
        const aTime = new Date(a?.createdAt || 0).getTime();
        const bTime = new Date(b?.createdAt || 0).getTime();
        return bTime - aTime;
      });

      if (!submissions.length) {
        const empty = document.createElement('p');
        empty.textContent = 'No messages yet.';
        card.appendChild(empty);
      }

      for (const submission of submissions) {
        const block = document.createElement('div');
        block.className = 'entry-submission';

        const meta = document.createElement('small');
        const stamp = submission?.createdAt ? formatDate(new Date(submission.createdAt)) : 'Unknown time';
        meta.textContent = `Submitted: ${stamp}`;
        block.appendChild(meta);

        const message = document.createElement('p');
        message.textContent = String(submission?.message || '');
        block.appendChild(message);

        const attachments = Array.isArray(submission?.attachments) ? submission.attachments : [];
        if (attachments.length) {
          const filesWrap = document.createElement('div');
          filesWrap.className = 'entry-attachments';
          attachments.forEach((attachment) => filesWrap.appendChild(createAttachmentNode(attachment)));
          block.appendChild(filesWrap);
        }
        card.appendChild(block);
      }

      els.entriesBoard.appendChild(card);
    }

    els.entriesStatus.textContent = `Loaded ${sortedPeople.length} participant${sortedPeople.length === 1 ? '' : 's'}.`;
  }

  function subscribeEntries() {
    if (!database || !els.entriesStatus || hasSubscribedEntries) return;
    hasSubscribedEntries = true;
    els.entriesStatus.textContent = 'Loading submissions from Firebase...';

    database.ref(firebasePath).on(
      'value',
      (snapshot) => {
        latestEntriesData = snapshot.val() || {};
        if (!isOpen()) updateEntriesVisibility();
        else renderEntries(latestEntriesData);
      },
      (error) => {
        els.entriesStatus.textContent = `Failed to load submissions: ${error?.message || 'Unknown error'}`;
      }
    );
  }

  function normalizeName(rawValue) {
    return String(rawValue || '').trim().replace(/\s+/g, ' ').toUpperCase();
  }

  function slugifyName(name) {
    return normalizeName(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'unnamed-participant';
  }

  function validateName(name) {
    const normalized = normalizeName(name);
    if (!namePattern.test(normalized)) {
      throw new Error('Use UPPERCASE strict format: SURNAME_FIRST NAME_M.I');
    }
    return normalized;
  }

  function setStatus(message, type) {
    if (!els.formStatus) return;
    els.formStatus.textContent = message;
    els.formStatus.className = `form-status ${type || ''}`.trim();
  }

  function sanitizeFileName(name) {
    return String(name || 'file')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'file';
  }

  async function uploadFileToStorage(file, personKey, submissionKey) {
    if (!storage) throw new Error('Firebase Storage is not ready.');
    if (file.size > maxFileSizeBytes) {
      throw new Error(`"${file.name}" exceeds the 5 GB limit per file.`);
    }

    const safeName = sanitizeFileName(file.name);
    const objectPath = `${firebasePath}/${personKey}/${submissionKey}/${Date.now()}-${safeName}`;
    const storageRef = storage.ref(objectPath);
    const snapshot = await storageRef.put(file, {
      contentType: file.type || 'application/octet-stream',
    });
    const downloadUrl = await snapshot.ref.getDownloadURL();

    return {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size || 0,
      downloadUrl,
      storagePath: objectPath,
    };
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    if (!database) {
      setStatus('Firebase is not ready yet. Check your Firebase config first.', 'error');
      return;
    }
    const submitButton = els.form.querySelector('button[type="submit"]');

    try {
      submitButton.disabled = true;
      const displayName = validateName(els.nameInput.value);
      const personKey = slugifyName(displayName);
      const message = String(els.messageInput.value || '').trim();
      const files = Array.from(els.filesInput.files || []);
      if (!message) throw new Error('Please enter a short message before saving.');
      for (const file of files) {
        if (file.size > maxFileSizeBytes) {
          throw new Error(`"${file.name}" is larger than 5 GB. Please choose a smaller file.`);
        }
      }

      setStatus('Uploading files (up to 5 GB each) and saving to Firebase...', 'loading');

      const nowIso = new Date().toISOString();
      const personRef = database.ref(`${firebasePath}/${personKey}`);
      const newSubmissionRef = personRef.child('submissions').push();
      const submissionKey = newSubmissionRef.key || `submission-${Date.now()}`;
      const attachments = [];
      for (const file of files) {
        attachments.push(await uploadFileToStorage(file, personKey, submissionKey));
      }

      await Promise.all([
        personRef.child('profile').set({ displayName, normalizedName: personKey }),
        personRef.update({ displayName, updatedAt: nowIso }),
        newSubmissionRef.set({ createdAt: nowIso, message, attachments })
      ]);

      els.form.reset();
      setStatus('Saved successfully to Firebase Realtime Database.', 'success');
    } catch (error) {
      setStatus(error.message || 'Failed to save the entry.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  }

  function initializeFirebase() {
    if (!firebaseConfig || typeof firebase === 'undefined' || !firebase.apps) {
      throw new Error('Firebase config is missing. Add your project details in firebase-config.js.');
    }
    if (!firebase.storage) {
      throw new Error('Firebase Storage SDK is missing. Add firebase-storage-compat script in index.html.');
    }
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    storage = firebase.storage();
  }

  try {
    initializeFirebase();
  } catch (error) {
    setStatus(error.message || 'Firebase initialization failed.', 'error');
    if (els.entriesStatus) els.entriesStatus.textContent = error.message || 'Firebase initialization failed.';
  }

  updateCountdown();
  if (els.form) els.form.addEventListener('submit', handleFormSubmit);

  window.addEventListener('beforeunload', () => {
    if (countdownTimer) window.clearTimeout(countdownTimer);
  });

  const fileButton = document.querySelector(".custom-file-button");

if (fileButton && els.filesInput) {
  fileButton.addEventListener("click", () => {
    els.filesInput.click();
  });
}

const fileNames = document.getElementById("file-names");

if (els.filesInput && fileNames) {
  els.filesInput.addEventListener("change", () => {
    const files = Array.from(els.filesInput.files);

    if (files.length === 0) {
      fileNames.textContent = "No files selected";
      return;
    }

    if (files.length === 1) {
      fileNames.textContent = files[0].name;
    } else {
      fileNames.textContent = files.map(f => f.name).join(", ");
    }
  });
}
});
