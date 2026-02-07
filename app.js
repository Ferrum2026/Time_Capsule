// app.js
document.addEventListener("DOMContentLoaded", () => {
  const appConfig = window.__APP_CONFIG || {};
  const configuredRevealDate = appConfig.revealIso ? new Date(appConfig.revealIso) : new Date();
  const revealDate = Number.isNaN(configuredRevealDate.getTime()) ? new Date() : configuredRevealDate;
  const shouldAnimateOnLoad = appConfig.playRevealAnimation !== false;

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

  function objectEntriesCI(raw) {
    if (!raw || typeof raw !== "object") return [];
    return Object.entries(raw).map(([k, v]) => [String(k), v]);
  }

  function findStringByCandidates(raw, exactKeys = [], fuzzyTerms = []) {
    const rows = objectEntriesCI(raw);
    const loweredExact = exactKeys.map((k) => k.toLowerCase());

    for (const [key, value] of rows) {
      if (typeof value !== "string" || !value.trim()) continue;
      if (loweredExact.includes(key.toLowerCase())) return value.trim();
    }

    for (const [key, value] of rows) {
      if (typeof value !== "string" || !value.trim()) continue;
      const lk = key.toLowerCase();
      if (fuzzyTerms.some((term) => lk.includes(term))) return value.trim();
    }

    return "";
  }

  function findNumberByCandidates(raw, keys = []) {
    const rows = objectEntriesCI(raw);
    const lowered = keys.map((k) => k.toLowerCase());
    for (const [key, value] of rows) {
      if (!lowered.includes(key.toLowerCase())) continue;
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return null;
  }

  function flattenCandidateUrls(node, out = []) {
    if (!node) return out;
    if (typeof node === "string") {
      const value = node.trim();
      if (value.startsWith("http")) out.push({ url: value, type: "", name: "" });
      return out;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => flattenCandidateUrls(item, out));
      return out;
    }

    if (typeof node === "object") {
      const directUrl = node.url || node.fileUrl || node.downloadURL || node.downloadUrl || node.src || node.link;
      if (typeof directUrl === "string" && directUrl.trim()) {
        out.push({
          url: directUrl.trim(),
          type: node.type || node.mimeType || node.contentType || "",
          name: node.name || node.filename || node.fileName || "",
        });
      }
      Object.values(node).forEach((child) => flattenCandidateUrls(child, out));
    }

    return out;
  }

  function normalizeAttachments(raw) {
    const seeds = [];
    const keyHints = ["file", "media", "attach", "upload", "photo", "image", "video", "audio"];

    objectEntriesCI(raw).forEach(([key, value]) => {
      const lk = key.toLowerCase();
      if (keyHints.some((h) => lk.includes(h))) seeds.push(value);
      if (typeof value === "string" && value.trim().startsWith("http")) seeds.push(value);
    });

    const all = [];
    seeds.forEach((seed) => flattenCandidateUrls(seed, all));

    const seen = new Set();
    return all.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }

  function normalizeEntry(id, raw) {
    const name = findStringByCandidates(
      raw,
      ["name", "fullName", "fullname", "studentName", "senderName", "displayName", "submittedBy", "Name"],
      ["name", "submitted by", "sender"],
    );

    const message = findStringByCandidates(
      raw,
      ["message", "msg", "note", "letter", "futureMessage", "messageToFutureSelf", "Message", "Message to Future Self"],
      ["message", "future self", "letter", "note"],
    );

    const isoDate = findStringByCandidates(raw, ["timestamp", "createdAt", "submittedAt", "date", "time"], ["time", "date", "created"]);
    const msDate = findNumberByCandidates(raw, ["timestampMs", "createdAtMs", "ts"]);
    const sortTime = msDate !== null ? msDate : (() => {
      const parsed = new Date(isoDate || 0).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    })();

    return {
      id,
      name,
      message,
      timestamp: isoDate || (sortTime ? new Date(sortTime).toISOString() : "No timestamp"),
      sortTime,
      attachments: normalizeAttachments(raw),
    };
  }

  function getDisplayName(entry, index) {
    if (capsuleOpened && entry.name) return entry.name;
    return `Anonymous ${index + 1}`;
  }

  function inferTypeFromUrl(url) {
    const clean = url.split("?")[0].split("#")[0].toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(clean)) return "image";
    if (/\.(mp4|mov|avi|webm|m4v)$/.test(clean)) return "video";
    if (/\.(mp3|wav|ogg|m4a|aac)$/.test(clean)) return "audio";
    return "file";
  }

  function renderAttachment(target, attachment) {
    const mime = (attachment.type || "").toLowerCase();
    const kind = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : inferTypeFromUrl(attachment.url);

    if (kind === "image") {
      const img = document.createElement("img");
      img.src = attachment.url;
      img.alt = attachment.name || "Memory attachment";
      img.loading = "lazy";
      target.appendChild(img);
      return;
    }

    if (kind === "video") {
      const video = document.createElement("video");
      video.src = attachment.url;
      video.controls = true;
      target.appendChild(video);
      return;
    }

    if (kind === "audio") {
      const audio = document.createElement("audio");
      audio.src = attachment.url;
      audio.controls = true;
      target.appendChild(audio);
      return;
    }

    const link = document.createElement("a");
    link.href = attachment.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "attachment-link";
    link.textContent = attachment.name || "Open attached file";
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

    entryDetailTitle.textContent = getDisplayName(selectedEntry, selectedIndex);
    entryDetail.innerHTML = "";

    const meta = document.createElement("p");
    meta.className = "entry-meta";
    meta.textContent = selectedEntry.timestamp;
    entryDetail.appendChild(meta);

    if (!capsuleOpened) {
      const lockedMsg = document.createElement("p");
      lockedMsg.textContent = "Identity, message, and files remain sealed until the reveal moment.";
      entryDetail.appendChild(lockedMsg);

      if (selectedEntry.attachments.length) {
        const attachmentCount = document.createElement("p");
        attachmentCount.className = "muted";
        attachmentCount.textContent = `${selectedEntry.attachments.length} attachment(s) sealed in this memory.`;
        entryDetail.appendChild(attachmentCount);
      }
      return;
    }

    const message = document.createElement("p");
    message.textContent = selectedEntry.message || "No message provided.";
    entryDetail.appendChild(message);

    if (selectedEntry.attachments.length) {
      const mediaWrap = document.createElement("div");
      mediaWrap.className = "entry-media";
      selectedEntry.attachments.forEach((attachment) => renderAttachment(mediaWrap, attachment));
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
      time.textContent = entry.timestamp;

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
      if (lockStatus) lockStatus.textContent = "The capsule is open. Names, messages, and media are now revealed.";
      return;
    }

    if (lockSection) lockSection.classList.remove("hidden");
    if (capsuleStateTitle) capsuleStateTitle.textContent = "Sealed Capsule — Anonymous Directory";
    if (lockStatus) lockStatus.textContent = "The contents are stored privately. They will be opened on the reveal date.";
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

    if (lockStatus) lockStatus.textContent = "The seal is breaking... Preparing the vault reveal.";
    if (revealSequence) {
      revealSequence.classList.remove("hidden");
      revealSequence.classList.add("active");
      revealSequence.setAttribute("aria-hidden", "false");
    }

    setTimeout(openCapsule, 4700);
    setTimeout(() => {
      if (!revealSequence) return;
      revealSequence.classList.remove("active");
      revealSequence.classList.add("hidden");
      revealSequence.setAttribute("aria-hidden", "true");
    }, 5600);
  }

  function updateCountdown() {
    const diff = revealDate - new Date();

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

    if (countdownElems.days) countdownElems.days.textContent = String(days).padStart(2, "0");
    if (countdownElems.hours) countdownElems.hours.textContent = String(hours).padStart(2, "0");
    if (countdownElems.mins) countdownElems.mins.textContent = String(mins).padStart(2, "0");
    if (countdownElems.secs) countdownElems.secs.textContent = String(secs).padStart(2, "0");
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

      renderEntriesList();
      renderSelectedEntry();
    } catch (err) {
      console.error("Error loading entries:", err);
      if (entriesList) entriesList.innerHTML = "<p>Error loading contributors.</p>";
      if (entryDetail) entryDetail.innerHTML = "<p>Error loading capsule contents.</p>";
    }
  }

  const revealPassed = new Date() >= revealDate;
  capsuleOpened = false;
  syncVaultStateUI();
  loadCapsuleEntries();

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
