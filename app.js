document.addEventListener('DOMContentLoaded', () => {
  const firebaseConfig = window.__FIREBASE_CONFIG || null;
  const config = window.__APP_CONFIG || {};

  const revealDate = new Date(config.revealIso || Date.now());
  const isForcedOpen = config.forceOpenVault === true;
  const firebasePath = config.firebasePath || 'capsuleEntries';
  const legacyFormUrl = String(config.googleFormUrl || '').trim();
  const namePattern = /^[A-Z][A-Z' -]*_[A-Z][A-Z' -]*_[A-Z](\.[A-Z])?\.?$/;

  const els = {
    title: document.getElementById('site-title'),
    tagline: document.getElementById('site-tagline'),
    slogan: document.getElementById('slogan-text'),
    quote: document.getElementById('quote-text'),
    vaultTitle: document.getElementById('vault-title'),
    vaultDescription: document.getElementById('vault-description'),
    vaultState: document.getElementById('vault-state'),
    revealDateLabel: document.getElementById('reveal-date-label'),
    entriesHelp: document.getElementById('entries-help'),
    entriesGrid: document.getElementById('entries-grid'),
    lockedOverlay: document.getElementById('locked-overlay'),
    filmVideo: document.getElementById('film-video'),
    btsVideo: document.getElementById('bts-video'),
    heroImage: document.getElementById('hero-image'),
    throwbackImage: document.getElementById('throwback-image'),
    formLinkTop: document.getElementById('form-link-top'),
    legacyFormLinkTop: document.getElementById('legacy-form-link-top'),
    legacyFormLinkBoard: document.getElementById('legacy-form-link-board'),
    legacyFormHelp: document.getElementById('legacy-form-help'),
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
  };

  const ui = config.ui || {};
  els.title.textContent = ui.siteTitle || 'Simple Time Capsule Vault';
  els.tagline.textContent = ui.siteTagline || 'A clean vault website with a locked reveal and a Pinterest-style board.';
  els.slogan.textContent = ui.slogan || 'Your slogan goes here.';
  els.quote.textContent = ui.quote || '“Your quote goes here.”';
  els.vaultTitle.textContent = ui.vaultTitle || 'Batch Time Capsule Vault';
  els.vaultDescription.textContent = ui.vaultDescription || 'This is the main locked vault. After the reveal date, submitted files and messages will appear below.';
  els.siteLogo.src = (ui.logoPath || 'assets/batch-logo-2026.svg');
  els.heroImage.src = (ui.heroImagePath || 'assets/batch-banner-2026.svg');
  els.throwbackImage.src = (ui.throwbackImagePath || 'assets/batch-banner-2026.svg');
  setVideoSource(els.filmVideo, ui.filmVideoPath);
  setVideoSource(els.btsVideo, ui.behindScenesVideoPath);
  if (els.formLinkTop) {
    els.formLinkTop.href = '#submission-form';
  }
  applyLegacyFormLinks(legacyFormUrl);

  els.revealDateLabel.textContent = `Reveal date: ${formatDate(revealDate)}`;

  let database = null;
  let storage = null;

  function setVideoSource(video, path) {
    if (!path) return;
    video.src = path;
  }

  function applyLegacyFormLinks(url) {
    const links = [els.legacyFormLinkTop, els.legacyFormLinkBoard].filter(Boolean);
    if (!url) {
      links.forEach((link) => link.classList.add('hidden'));
      if (els.legacyFormHelp) {
        els.legacyFormHelp.textContent = 'Set googleFormUrl in firebase-config.js to show this fallback link. Use the Firebase form above to save entries in the board.';
        els.legacyFormHelp.classList.remove('hidden');
      }
      return;
    }

    links.forEach((link) => {
      link.href = url;
      link.classList.remove('hidden');
    });
    if (els.legacyFormHelp) {
      els.legacyFormHelp.textContent = 'Google Form submissions do not automatically sync to this Firebase board. Use the Firebase form above to save entries here.';
      els.legacyFormHelp.classList.remove('hidden');
    }
  }

  function formatDate(date) {
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function isOpen() {
    return isForcedOpen || Date.now() >= revealDate.getTime();
  }

  function updateCountdown() {
    const distance = revealDate.getTime() - Date.now();
    const safeDistance = Math.max(distance, 0);
    const days = Math.floor(safeDistance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((safeDistance / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((safeDistance / (1000 * 60)) % 60);
    const seconds = Math.floor((safeDistance / 1000) % 60);

    els.days.textContent = String(days).padStart(2, '0');
    els.hours.textContent = String(hours).padStart(2, '0');
    els.minutes.textContent = String(minutes).padStart(2, '0');
    els.seconds.textContent = String(seconds).padStart(2, '0');

    applyVaultState();
  }

  function applyVaultState() {
    if (isOpen()) {
      els.vaultState.textContent = 'Vault is open';
      els.vaultState.className = 'vault-state open';
      els.entriesHelp.textContent = 'The reveal date has passed. Submitted memories are now visible below.';
      els.lockedOverlay.classList.add('hidden');
    } else {
      els.vaultState.textContent = 'Vault is locked';
      els.vaultState.className = 'vault-state locked';
      els.entriesHelp.textContent = 'Locked right now. Visitors can only open this after the reveal date.';
      els.lockedOverlay.classList.remove('hidden');
    }
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

  function validateName(name) {
    const normalized = normalizeName(name);
    if (!namePattern.test(normalized)) {
      throw new Error('Use name format: SURNAME_FIRST NAME_M.I (letters, spaces, apostrophe, hyphen).');
    }
    return normalized;
  }

  function normalizeFirebaseData(raw) {
    if (!raw || typeof raw !== 'object') return [];

    return Object.entries(raw).map(([personKey, personNode]) => {
      const submissions = personNode && personNode.submissions && typeof personNode.submissions === 'object'
        ? Object.values(personNode.submissions)
        : [];

      submissions.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      return {
        key: personKey,
        displayName: personNode.displayName || 'Unnamed submitter',
        submissionCount: submissions.length,
        updatedAt: personNode.updatedAt || '',
        submissions,
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  function renderEntries(people) {
    if (!people.length) {
      els.entriesGrid.innerHTML = '<article class="entry-card"><h3>No memories yet</h3><p class="entry-meta">When submissions start arriving, each participant will appear here once, with every repeat entry nested underneath.</p></article>';
      return;
    }

    els.entriesGrid.innerHTML = people.map((person) => `
      <article class="entry-card person-card">
        <div class="person-card-header">
          <div>
            <h3>${escapeHtml(person.displayName)}</h3>
            <p class="entry-meta">${person.submissionCount} submission${person.submissionCount === 1 ? '' : 's'}${person.updatedAt ? ` • Last updated ${escapeHtml(formatDate(new Date(person.updatedAt)))}` : ''}</p>
          </div>
        </div>
        <div class="submission-list">
          ${person.submissions.map((entry) => `
            <section class="submission-item">
              <p class="entry-meta">${escapeHtml(formatDate(new Date(entry.createdAt || Date.now())))}</p>
              <p class="entry-message">${escapeHtml(entry.message || 'No text message for this entry.')}</p>
              ${(entry.attachments || []).length ? `<div class="entry-attachments">${entry.attachments.map((item) => renderAttachment(item)).join('')}</div>` : '<p class="entry-meta">No files uploaded for this submission.</p>'}
            </section>
          `).join('')}
        </div>
      </article>
    `).join('');
  }

  function renderAttachment(item) {
    const url = item && item.url ? item.url : '';
    const type = (item && item.type ? item.type : '').toLowerCase();
    const name = item && item.name ? item.name : 'Open file';
    if (!url) return '';

    if (type.startsWith('image/')) {
      return `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(name)}">`;
    }
    if (type.startsWith('video/')) {
      return `<video controls src="${escapeAttribute(url)}"></video>`;
    }
    if (type.startsWith('audio/')) {
      return `<audio controls src="${escapeAttribute(url)}"></audio>`;
    }
    return `<a class="entry-link" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(name)}</a>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function setStatus(message, type) {
    els.formStatus.textContent = message;
    els.formStatus.className = `form-status ${type || ''}`.trim();
  }

  async function uploadFiles(personKey, submissionKey, files) {
    if (!files.length || !storage) return [];

    const uploads = files.map(async (file) => {
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const path = `${firebasePath}/${personKey}/${submissionKey}/files/${safeName}`;
      const snapshot = await storage.ref(path).put(file);
      const url = await snapshot.ref.getDownloadURL();
      return {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size || 0,
        path,
        url,
      };
    });

    return Promise.all(uploads);
  }

  async function uploadSubmissionManifest(personKey, submissionKey, payload) {
    if (!storage) return null;

    const path = `${firebasePath}/${personKey}/${submissionKey}/submission.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const snapshot = await storage.ref(path).put(blob);
    const url = await snapshot.ref.getDownloadURL();
    return { path, url };
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    if (!database) {
      setStatus('Firebase Database is not ready yet. Check your Firebase config first.', 'error');
      return;
    }

    const submitButton = els.form.querySelector('button[type="submit"]');

    try {
      submitButton.disabled = true;
      const displayName = validateName(els.nameInput.value);
      const personKey = slugifyName(displayName);
      const message = String(els.messageInput.value || '').trim();
      const files = Array.from(els.filesInput.files || []);

      if (!message) {
        throw new Error('Please enter a short message before saving.');
      }

      setStatus('Syncing your submission to Firebase Storage and Database...', 'loading');

      const nowIso = new Date().toISOString();
      const personRef = database.ref(`${firebasePath}/${personKey}`);
      const newSubmissionRef = personRef.child('submissions').push();
      const submissionKey = newSubmissionRef.key || `submission-${Date.now()}`;

      let attachments = [];
      let manifest = null;
      let storageWarning = '';

      if (files.length || storage) {
        try {
          attachments = await uploadFiles(personKey, submissionKey, files);
          manifest = await uploadSubmissionManifest(personKey, submissionKey, {
            displayName,
            normalizedName: personKey,
            createdAt: nowIso,
            message,
            attachments,
          });
        } catch (storageError) {
          storageWarning = ' Saved to database, but Storage upload failed.';
        }
      }

      await personRef.child('profile').set({
        displayName,
        normalizedName: personKey,
      });

      await personRef.update({
        displayName,
        updatedAt: nowIso,
      });

      await newSubmissionRef.set({
        createdAt: nowIso,
        message,
        attachments,
        storageManifest: manifest,
      });

      els.form.reset();
      setStatus(`Saved successfully to Realtime Database.${storageWarning}`, 'success');
    } catch (error) {
      setStatus(error.message || 'Failed to save the entry.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  }

  function loadEntries() {
    if (!firebaseConfig || !firebase || !firebase.apps) {
      renderEntries([]);
      setStatus('Firebase config is missing. Add your project details in firebase-config.js.', 'error');
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      database = firebase.database();
      storage = firebase.storage();
    } catch (error) {
      renderEntries([]);
      setStatus(`Firebase initialization failed: ${error.message || 'Unknown error'}`, 'error');
      return;
    }

    database.ref(firebasePath).on('value', (snapshot) => {
      const entries = normalizeFirebaseData(snapshot.val());
      renderEntries(entries);
    }, () => {
      renderEntries([]);
    });
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
  loadEntries();
  els.form.addEventListener('submit', handleFormSubmit);
});
