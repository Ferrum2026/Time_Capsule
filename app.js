document.addEventListener('DOMContentLoaded', () => {
  const firebaseConfig = window.__FIREBASE_CONFIG || null;
  const config = window.__APP_CONFIG || {};

  const revealDate = new Date(config.revealIso || Date.now());
  const isForcedOpen = parseBoolean(config.forceOpenVault);
  const firebasePath = config.firebasePath || 'capsuleEntries';
  const driveSyncConfig = config.driveSync || {};
  const isDriveSyncEnabled = parseBoolean(driveSyncConfig.enabled);
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

  els.revealDateLabel.textContent = `Reveal date: ${formatDate(revealDate)}`;

  let database = null;

  function setVideoSource(video, path) {
    if (!path) return;
    video.src = path;
  }

  function formatDate(date) {
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
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
      throw new Error('Use UPPERCASE strict format: SURNAME_FIRST NAME_M.I');
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
    const dataUrl = item && item.dataUrl ? item.dataUrl : '';
    const url = item && item.url ? item.url : '';
    const downloadUrl = item && item.downloadUrl ? item.downloadUrl : '';
    const type = (item && item.type ? item.type : '').toLowerCase();
    const name = item && item.name ? item.name : 'Open file';
    const mediaUrl = dataUrl || downloadUrl || url;
    if (!mediaUrl) return '';

    if (type.startsWith('image/')) {
      return `<a class="entry-link" href="${escapeAttribute(mediaUrl)}" target="_blank" rel="noreferrer"><img src="${escapeAttribute(mediaUrl)}" alt="${escapeAttribute(name)}"></a>`;
    }
    if (type.startsWith('video/')) {
      return `<video controls src="${escapeAttribute(mediaUrl)}"></video>`;
    }
    if (type.startsWith('audio/')) {
      return `<audio controls src="${escapeAttribute(mediaUrl)}"></audio>`;
    }
    return `<a class="entry-link" href="${escapeAttribute(mediaUrl)}" target="_blank" rel="noreferrer" download="${escapeAttribute(name)}">${escapeHtml(name)}</a>`;
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

  async function withTimeout(taskPromise, timeoutMs, timeoutMessage) {
    let timeoutId = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    try {
      return await Promise.race([taskPromise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function buildAttachmentPayloads(files) {
    const payloads = files.map(async (file) => {
      const dataUrl = await withTimeout(
        readFileAsDataUrl(file),
        30000,
        `Reading file timed out: ${file.name}`
      );
      return {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size || 0,
        dataUrl,
      };
    });

    return Promise.all(payloads);
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

      if (!message) {
        throw new Error('Please enter a short message before saving.');
      }

      setStatus('Preparing files and saving everything to Firebase Realtime Database...', 'loading');

      const nowIso = new Date().toISOString();
      const attachments = files.length ? await buildAttachmentPayloads(files) : [];
      const personRef = database.ref(`${firebasePath}/${personKey}`);
      const newSubmissionRef = personRef.child('submissions').push();

      await withTimeout(Promise.all([
        personRef.child('profile').set({
          displayName,
          normalizedName: personKey,
        }),
        personRef.update({
          displayName,
          updatedAt: nowIso,
        }),
        newSubmissionRef.set({
          createdAt: nowIso,
          message,
          attachments,
        })
      ]), 30000, 'Database write timed out. Check Firebase Realtime Database rules and try again.');

      let uploadWarning = '';
      if (files.length && storage) {
        try {
          setStatus('Database saved. Uploading files to Firebase Storage...', 'loading');
          const attachments = await uploadFiles(personKey, submissionKey, files);
          const manifest = await uploadSubmissionManifest(personKey, submissionKey, {
            displayName,
            normalizedName: personKey,
            createdAt: nowIso,
            message,
            attachments,
          });
          await withTimeout(newSubmissionRef.update({
            attachments,
            storageManifest: manifest,
          }), 30000, 'Database update timed out while attaching uploaded files.');

          if (isDriveSyncEnabled && attachments.length) {
            setStatus('Files uploaded to Firebase. Mirroring copies to Google Drive...', 'loading');
            await syncSubmissionToDrive({
              personKey,
              displayName,
              normalizedName: personKey,
              createdAt: nowIso,
              message,
              attachments,
            });

            await withTimeout(newSubmissionRef.update({
              attachments,
              storageManifest: manifest,
            }), 30000, 'Failed to attach uploaded file metadata to the submission.');
          } catch (uploadError) {
            uploadWarning = ` Entry text was saved, but file upload failed: ${uploadError.message || 'unknown error'}`;
          }
        }
      }

      els.form.reset();
      setStatus('Saved successfully to Firebase Realtime Database.', 'success');
    } catch (error) {
      setStatus(error.message || 'Failed to save the entry.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  }

  function loadEntries() {
    if (!firebaseConfig || typeof firebase === 'undefined' || !firebase.apps) {
      throw new Error('Firebase config is missing. Add your project details in firebase-config.js.');
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

      database = firebase.database();
    } catch (error) {
      renderEntries([]);
      setStatus(`Firebase initialization failed: ${error.message || 'Unknown error'}`, 'error');
      return;
    }
  }

  function subscribeToEntries() {
    database.ref(firebasePath).on('value', (snapshot) => {
      const entries = normalizeFirebaseData(snapshot.val());
      renderEntries(entries);
    }, (error) => {
      renderEntries([]);
      if (error && error.code === 'PERMISSION_DENIED') {
        els.entriesHelp.textContent = 'Entries are secured by Firebase rules and are unavailable before reveal/admin access.';
      }
    });
  }

  async function startApp() {
    try {
      await initializeFirebase();
      subscribeToEntries();
    } catch (error) {
      renderEntries([]);
      setStatus(error.message || 'Firebase initialization failed.', 'error');
    }
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
  startApp();
  els.form.addEventListener('submit', handleFormSubmit);
});
