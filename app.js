// app.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("🧭 Time Capsule website loaded.");

  const appConfig = window.__APP_CONFIG || {};
  const revealDate = appConfig.revealIso ? new Date(appConfig.revealIso) : new Date();

  const revealDateText = document.getElementById("reveal-date-text");
  const lockStatus = document.getElementById("lock-status");
  const lockSection = document.getElementById("capsule-lock");
  const capsuleStateTitle = document.getElementById("capsule-state-title");
  const entryListTitle = document.getElementById("entry-list-title");
  const entryDetailTitle = document.getElementById("entry-detail-title");
  const entriesList = document.getElementById("entries-list");
  const entryDetail = document.getElementById("entry-detail");
  const revealSequence = document.getElementById("reveal-sequence");

  const countdownElems = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs"),
  };

  let revealStarted = false;
  let capsuleOpened = false;
  let entries = [];
  let selectedEntryId = null;

  if (revealDateText) {
    revealDateText.textContent = revealDate.toDateString();
  }

  function getDisplayName(entry, index) {
    const trimmedName = (entry.name || "").trim();
    if (capsuleOpened && trimmedName) return trimmedName;
    return `Anonymous ${index + 1}`;
  }

  function normalizeAttachments(entry) {
    const knownUrls = [
      entry.fileUrl,
      entry.photoUrl,
      entry.imageUrl,
      entry.videoUrl,
      entry.audioUrl,
    ].filter(Boolean);

    const fromFiles = Array.isArray(entry.files)
      ? entry.files
      : entry.files && typeof entry.files === "object"
        ? Object.values(entry.files)
        : [];

    const collected = [...knownUrls];

    fromFiles.forEach((file) => {
      if (!file) return;
      if (typeof file === "string") {
        collected.push(file);
        return;
      }
      if (typeof file === "object") {
        if (file.url) collected.push(file.url);
        else if (file.downloadURL) collected.push(file.downloadURL);
      }
    });

    return [...new Set(collected)].map((url) => ({
      url,
      lowerUrl: url.toLowerCase(),
    }));
  }

  function renderAttachment(target, attachment) {
    const { url, lowerUrl } = attachment;

    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Memory attachment";
      img.loading = "lazy";
      target.appendChild(img);
      return;
    }

    if (lowerUrl.match(/\.(mp4|mov|avi|webm|m4v)$/i)) {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.preload = "metadata";
      target.appendChild(video);
      return;
    }

    if (lowerUrl.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
      const audio = document.createElement("audio");
      audio.src = url;
      audio.controls = true;
      audio.preload = "metadata";
      target.appendChild(audio);
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open attached file";
    link.className = "attachment-link";
    target.appendChild(link);
  }

  function renderSelectedEntry() {
    if (!entryDetail || !entryDetailTitle) return;

    if (!entries.length) {
      entryDetailTitle.textContent = capsuleOpened ? "Opened vault" : "Vault locked";
      entryDetail.innerHTML = "<p>No entries yet — the capsule is still being filled.</p>";
      return;
    }

    const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || entries[0];
    selectedEntryId = selectedEntry.id;

    const selectedIndex = entries.findIndex((entry) => entry.id === selectedEntryId);
    const displayName = getDisplayName(selectedEntry, selectedIndex);

    entryDetailTitle.textContent = displayName;
    entryDetail.innerHTML = "";

    const meta = document.createElement("p");
    meta.className = "entry-meta";
    meta.textContent = selectedEntry.timestamp || "No timestamp";
    entryDetail.appendChild(meta);

    if (!capsuleOpened) {
      const lockedMsg = document.createElement("p");
      lockedMsg.textContent = "Identity, message, and files remain sealed until the reveal moment.";
      entryDetail.appendChild(lockedMsg);

      const attachments = normalizeAttachments(selectedEntry);
      if (attachments.length) {
        const attachmentCount = document.createElement("p");
        attachmentCount.className = "muted";
        attachmentCount.textContent = `${attachments.length} attachment(s) sealed in this memory.`;
        entryDetail.appendChild(attachmentCount);
      }
      return;
    }

    const message = document.createElement("p");
    message.textContent = selectedEntry.message || "No message provided.";
    entryDetail.appendChild(message);

    const attachments = normalizeAttachments(selectedEntry);
    if (attachments.length) {
      const mediaWrap = document.createElement("div");
      mediaWrap.className = "entry-media";
      attachments.forEach((attachment) => renderAttachment(mediaWrap, attachment));
      entryDetail.appendChild(mediaWrap);
    }
  }

  function renderEntriesList() {
    if (!entriesList || !entryListTitle) return;

    entriesList.innerHTML = "";

    entryListTitle.textContent = capsuleOpened ? "Contributors (revealed)" : "Contributors (anonymous)";

    if (!entries.length) {
      entriesList.innerHTML = "<p>No contributors yet.</p>";
      return;
    }

    entries.forEach((entry, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "entry-list-item";
      if (entry.id === selectedEntryId) btn.classList.add("active");

      const name = document.createElement("strong");
      name.textContent = getDisplayName(entry, index);

      const time = document.createElement("span");
      time.textContent = entry.timestamp || "No timestamp";

      btn.appendChild(name);
      btn.appendChild(time);

      btn.addEventListener("click", () => {
        selectedEntryId = entry.id;
        renderEntriesList();
        renderSelectedEntry();
      });

      entriesList.appendChild(btn);
    });
  }

  function syncVaultStateUI() {
    if (capsuleOpened) {
      if (lockSection) lockSection.classList.add("hidden");
      if (capsuleStateTitle) capsuleStateTitle.textContent = "Opened Capsule — Names and Memories Revealed";
      if (lockStatus) lockStatus.textContent = "The seal is breaking... Preparing the vault reveal.";
      return;
    }

    if (lockSection) lockSection.classList.remove("hidden");
    if (capsuleStateTitle) capsuleStateTitle.textContent = "Sealed Capsule — Anonymous Directory";
    if (lockStatus) lockStatus.textContent = "The contents are stored privately. They will be opened on the reveal date.";
  }

  function openCapsule() {
    capsuleOpened = true;
    syncVaultStateUI();
    renderEntriesList();
    renderSelectedEntry();
  }

  function startRevealSequence() {
    if (revealStarted || capsuleOpened) return;
    revealStarted = true;

    if (lockStatus) {
      lockStatus.textContent = "The seal is breaking... Preparing the vault reveal.";
    }

    if (revealSequence) {
      revealSequence.classList.remove("hidden");
      revealSequence.classList.add("active");
      revealSequence.setAttribute("aria-hidden", "false");
    }

    setTimeout(() => {
      openCapsule();
    }, 4700);

    setTimeout(() => {
      if (!revealSequence) return;
      revealSequence.classList.remove("active");
      revealSequence.classList.add("hidden");
      revealSequence.setAttribute("aria-hidden", "true");
    }, 5600);
  }

  function updateCountdown() {
    const now = new Date();
    const diff = revealDate - now;

    if (diff <= 0) {
      Object.values(countdownElems).forEach((el) => {
        if (el) el.textContent = "00";
      });
      if (!capsuleOpened) startRevealSequence();
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    if (countdownElems.days) countdownElems.days.textContent = days.toString().padStart(2, "0");
    if (countdownElems.hours) countdownElems.hours.textContent = hours.toString().padStart(2, "0");
    if (countdownElems.mins) countdownElems.mins.textContent = mins.toString().padStart(2, "0");
    if (countdownElems.secs) countdownElems.secs.textContent = secs.toString().padStart(2, "0");
  }

  function loadCapsuleEntries() {
    const firebaseConfig = window.__FIREBASE_CONFIG;
    if (!firebaseConfig) {
      console.error("Firebase config not loaded.");
      if (entriesList) entriesList.innerHTML = "<p>Firebase config missing.</p>";
      return;
    }

    if (entriesList) entriesList.innerHTML = "<p>Loading contributors...</p>";
    if (entryDetail) entryDetail.innerHTML = "<p>Loading selected entry...</p>";

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.database();
    const ref = db.ref("capsuleEntries");

    ref.once("value")
      .then((snapshot) => {
        const data = snapshot.val();
        entries = data
          ? Object.entries(data).map(([id, value]) => ({ id, ...(value || {}) }))
          : [];

        const toTime = (value) => {
          const parsed = new Date(value || 0).getTime();
          return Number.isNaN(parsed) ? 0 : parsed;
        };

        entries.sort((a, b) => toTime(b.timestamp) - toTime(a.timestamp));

        if (entries.length && !selectedEntryId) {
          selectedEntryId = entries[0].id;
        }

        renderEntriesList();
        renderSelectedEntry();
      })
      .catch((err) => {
        console.error("Error loading entries:", err);
        if (entriesList) entriesList.innerHTML = "<p>Error loading contributors.</p>";
        if (entryDetail) entryDetail.innerHTML = "<p>Error loading capsule contents.</p>";
      });
  }

  capsuleOpened = new Date() >= revealDate;
  syncVaultStateUI();
  loadCapsuleEntries();

  setInterval(updateCountdown, 1000);
  updateCountdown();

  if (capsuleOpened) {
    renderEntriesList();
    renderSelectedEntry();
  }
});
