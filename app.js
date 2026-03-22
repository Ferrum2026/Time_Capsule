document.addEventListener('DOMContentLoaded', () => {
  const firebaseConfig = window.__FIREBASE_CONFIG || null;
  const config = window.__APP_CONFIG || {};

  const revealDate = new Date(config.revealIso || Date.now());
  const isForcedOpen = config.forceOpenVault === true;
  const firebasePath = config.firebasePath || 'capsuleEntries';

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
    formLinkBoard: document.getElementById('form-link-board'),
    siteLogo: document.getElementById('site-logo'),
    days: document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    minutes: document.getElementById('cd-minutes'),
    seconds: document.getElementById('cd-seconds'),
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
  setLink(els.formLinkTop, config.googleFormUrl);
  setLink(els.formLinkBoard, config.googleFormUrl);

  els.revealDateLabel.textContent = `Reveal date: ${formatDate(revealDate)}`;

  function setLink(element, url) {
    if (!url) return;
    element.href = url;
  }

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

  function normalizeFirebaseData(raw) {
    if (!raw || typeof raw !== 'object') return [];
    const result = [];

    function visit(node, inheritedName = '') {
      if (!node || typeof node !== 'object') return;

      const directName = typeof node.name === 'string' && node.name.trim() ? node.name.trim() : inheritedName;
      const message = typeof node.message === 'string' ? node.message.trim() : '';
      const timestamp = typeof node.timestamp === 'string' ? node.timestamp : '';
      const attachments = Array.isArray(node.attachments) ? node.attachments : [];
      const hasEntryData = Boolean(directName || message || attachments.length);

      if (hasEntryData && (message || attachments.length)) {
        result.push({
          name: directName || 'Unnamed submitter',
          message,
          timestamp,
          attachments,
        });
      }

      Object.values(node).forEach((value) => {
        if (value && typeof value === 'object') {
          visit(value, directName);
        }
      });
    }

    visit(raw, '');
    return result;
  }

  function renderEntries(entries) {
    if (!entries.length) {
      els.entriesGrid.innerHTML = '<article class="entry-card"><h3>No memories yet</h3><p class="entry-meta">When your Firebase data starts arriving, it will appear here.</p></article>';
      return;
    }

    const html = entries.map((entry) => {
      const mediaHtml = (entry.attachments || []).map((item) => renderAttachment(item)).join('');
      return `
        <article class="entry-card">
          <h3>${escapeHtml(entry.name || 'Unnamed submitter')}</h3>
          <p class="entry-meta">${escapeHtml(entry.timestamp || 'No timestamp saved')}</p>
          ${entry.message ? `<p class="entry-message">${escapeHtml(entry.message)}</p>` : '<p class="entry-message">No text message for this entry.</p>'}
          ${mediaHtml ? `<div class="entry-attachments">${mediaHtml}</div>` : ''}
        </article>
      `;
    }).join('');

    els.entriesGrid.innerHTML = html;
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

  function loadEntries() {
    if (!firebaseConfig || !firebase || !firebase.apps) {
      renderEntries([]);
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    firebase.database().ref(firebasePath).on('value', (snapshot) => {
      const entries = normalizeFirebaseData(snapshot.val());
      renderEntries(entries);
    }, () => {
      renderEntries([]);
    });
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
  loadEntries();
});
