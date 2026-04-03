document.addEventListener('DOMContentLoaded', () => {
  const firebaseConfig = window.__FIREBASE_CONFIG || null;
  const config = window.__APP_CONFIG || {};
  const ui = config.ui || {};

  const revealDate = new Date(config.revealIso || Date.now());
  const isForcedOpen = parseBoolean(config.forceOpenVault);
  const firebasePath = config.firebasePath || 'capsuleEntries';
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
  };

  setText(els.title, ui.siteTitle || 'Batch Fe Time Capsule Vault');
  setText(els.tagline, ui.siteTagline || 'A themed vault website with timer and submission form.');
  setText(els.vaultTitle, ui.vaultTitle || 'Batch Time Capsule Vault');
  setText(els.vaultDescription, ui.vaultDescription || 'This vault opens when the countdown reaches zero.');
  setSrc(els.siteLogo, ui.logoPath || 'assets/batch-logo-2026.svg');
  setVideoSource(els.filmVideo, ui.filmVideoPath);
  setVideoSource(els.btsVideo, ui.behindScenesVideoPath);
  setLinkHref(els.memoriesLink, ui.facebookPageUrl || ui.memoriesPageUrl || '');

  if (els.formLinkTop) els.formLinkTop.href = '#submission-form';
  if (els.revealDateLabel) els.revealDateLabel.textContent = `Reveal date: ${formatDate(revealDate)}`;

  let database = null;
  let countdownTimer = null;
  let entriesRefs = [];

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

  function normalizeExternalUrl(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (/^(www\.)?facebook\.com\//i.test(value)) return `https://${value.replace(/^https?:\/\//i, '')}`;
    if (/^www\./i.test(value)) return `https://${value}`;
    return '';
  }

  function setLinkHref(link, href) {
    if (!link) return;
    const normalizedUrl = normalizeExternalUrl(href);
    if (!normalizedUrl) {
      link.removeAttribute('href');
      link.removeAttribute('target');
      link.setAttribute('aria-disabled', 'true');
      link.classList.add('is-disabled');
      link.textContent = 'Facebook link not set yet';
      return;
    }
    link.href = normalizedUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
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
    if (!els.entriesBoard || !els.entriesStatus) return;
    if (!isOpen()) {
      els.entriesBoard.hidden = true;
      els.entriesStatus.textContent = 'Submitted memories will appear once the vault is open.';
      return;
    }
    els.entriesBoard.hidden = false;
    if (!els.entriesBoard.children.length) {
      els.entriesStatus.textContent = 'No submissions yet.';
    }
  }

  function createAttachmentNode(attachment) {
    const wrap = document.createElement('div');
    wrap.className = 'entry-attachment';
    const type = String(attachment?.type || '').toLowerCase();
    const name = String(attachment?.name || 'Attachment');
    const dataUrl = String(attachment?.dataUrl || '');
    if (!dataUrl) return wrap;

    if (type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = name;
      img.loading = 'lazy';
      img.className = 'entry-attachment-media';
      wrap.appendChild(img);
      return wrap;
    }

    if (type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = dataUrl;
      video.controls = true;
      video.className = 'entry-attachment-media';
      wrap.appendChild(video);
      return wrap;
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `Open ${name}`;
    wrap.appendChild(link);
    return wrap;
  }

  function looksLikePeopleMap(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
    const items = Object.values(candidate);
    if (!items.length) return false;
    return items.some((item) => {
      if (!item || typeof item !== 'object') return false;
      if (item.submissions && typeof item.submissions === 'object') return true;
      if (item.profile && typeof item.profile === 'object') return true;
      return typeof item.displayName === 'string';
    });
  }

  function looksLikeSubmissionList(candidate) {
    if (!candidate || typeof candidate !== 'object') return false;
    const items = Array.isArray(candidate) ? candidate : Object.values(candidate);
    if (!items.length) return false;
    return items.some((item) => {
      if (!item || typeof item !== 'object') return false;
      return typeof item.message === 'string' || Array.isArray(item.attachments);
    });
  }

  function normalizeEntriesData(rawData) {
    if (looksLikePeopleMap(rawData)) return rawData;
    if (!looksLikeSubmissionList(rawData)) return {};

    const list = Array.isArray(rawData) ? rawData : Object.values(rawData);
    return list.reduce((acc, item, index) => {
      const displayName = String(item?.displayName || item?.participantName || `Participant ${index + 1}`);
      const key = `legacy-${index + 1}`;
      acc[key] = {
        displayName,
        updatedAt: item?.createdAt || new Date().toISOString(),
        submissions: {
          [`submission-${index + 1}`]: {
            createdAt: item?.createdAt || new Date().toISOString(),
            message: item?.message || '',
            attachments: Array.isArray(item?.attachments) ? item.attachments : [],
          }
        }
      };
      return acc;
    }, {});
  }

  function renderEntries(data, sourceLabel) {
    if (!els.entriesBoard || !els.entriesStatus) return;
    if (!isOpen()) return;

    els.entriesBoard.innerHTML = '';
    const normalizedData = normalizeEntriesData(data);
    const people = Object.values(normalizedData || {});
    if (!people.length) {
      els.entriesStatus.textContent = 'No submissions yet.';
      return;
    }

    const sortedPeople = people.sort((a, b) => {
      const aTime = new Date(a?.updatedAt || 0).getTime();
      const bTime = new Date(b?.updatedAt || 0).getTime();
      return bTime - aTime;
    });

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

    const suffix = sourceLabel ? ` from ${sourceLabel}` : '';
    els.entriesStatus.textContent = `Loaded ${sortedPeople.length} participant${sortedPeople.length === 1 ? '' : 's'}${suffix}.`;
  }

  function subscribeEntries() {
    if (!database) return;
    const candidatePaths = Array.from(new Set(
      [firebasePath, 'capsuleEntries', 'entries', 'submissions']
        .map((path) => String(path || '').trim())
        .filter(Boolean)
    ));
    const snapshotsByPath = {};

    const renderFromBestSource = () => {
      for (const path of candidatePaths) {
        const data = snapshotsByPath[path];
        if (looksLikePeopleMap(data) || looksLikeSubmissionList(data)) {
          renderEntries(data, path);
          return;
        }
      }
      renderEntries({}, candidatePaths[0] || '');
    };

    entriesRefs.forEach((ref) => ref.off());
    entriesRefs = [];

    candidatePaths.forEach((path) => {
      const ref = database.ref(path);
      entriesRefs.push(ref);
      ref.on('value', (snapshot) => {
        snapshotsByPath[path] = snapshot.val() || {};
        renderFromBestSource();
      }, () => {
        snapshotsByPath[path] = {};
        renderFromBestSource();
      });
    });
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

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
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

      setStatus('Preparing files and saving everything to Firebase Realtime Database...', 'loading');

      const nowIso = new Date().toISOString();
      const attachments = [];
      for (const file of files) {
        attachments.push({
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size || 0,
          dataUrl: await readFileAsDataUrl(file),
        });
      }

      const personRef = database.ref(`${firebasePath}/${personKey}`);
      const newSubmissionRef = personRef.child('submissions').push();

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
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    database = firebase.database();
  }

  try {
    initializeFirebase();
  } catch (error) {
    setStatus(error.message || 'Firebase initialization failed.', 'error');
    if (els.entriesStatus) els.entriesStatus.textContent = error.message || 'Firebase initialization failed.';
  }

  if (database) {
    try {
      subscribeEntries();
    } catch (error) {
      if (els.entriesStatus) els.entriesStatus.textContent = error.message || 'Failed to subscribe to entries.';
    }
  }

  updateCountdown();
  updateEntriesVisibility();
  if (els.form) els.form.addEventListener('submit', handleFormSubmit);

  window.addEventListener('beforeunload', () => {
    if (countdownTimer) window.clearTimeout(countdownTimer);
    entriesRefs.forEach((ref) => ref.off());
  });

  const fileButton = document.querySelector(".custom-file-button");

if (fileButton && els.filesInput) {
  fileButton.addEventListener("click", () => {
    els.filesInput.click();
  });
}

const fileNames = document.getElementById("file-names");

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
});
