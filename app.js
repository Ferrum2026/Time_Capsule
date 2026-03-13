// app.js
document.addEventListener("DOMContentLoaded", () => {
  const appConfig = window.__APP_CONFIG || {};
  const configuredRevealDate = appConfig.revealIso ? new Date(appConfig.revealIso) : new Date();
  const revealDate = Number.isNaN(configuredRevealDate.getTime()) ? new Date() : configuredRevealDate;
  const shouldAnimateOnLoad = appConfig.playRevealAnimation !== false;
  const forceOpenCapsule = appConfig.forceOpenCapsule === true || appConfig.capsuleOpened === true || appConfig.forceReveal === true;
  const firebasePath = appConfig.firebasePath || "capsuleEntries";

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
    revealDateText.textContent = revealDate.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function objectEntriesCI(raw) {
    if (!raw || typeof raw !== "object") return [];
    return Object.entries(raw).map(([k, v]) => [String(k), v]);
  }

  function findStringByCandidates(raw, exactKeys = [], fuzzyTerms = []) {
    const loweredExact = exactKeys.map((k) => k.toLowerCase());
    const loweredFuzzy = fuzzyTerms.map((k) => k.toLowerCase());
    const queue = [{ node: raw, path: "" }];
    const exactMatches = [];
    const fuzzyMatches = [];

    while (queue.length) {
      const current = queue.shift();
      const node = current.node;
      const path = current.path;

      if (!node) continue;

      if (typeof node === "string") {
        const value = node.trim();
        if (!value) continue;
        const pathLower = path.toLowerCase();

        if (loweredExact.some((k) => pathLower.endsWith(`.${k}`) || pathLower === k)) {
          exactMatches.push(value);
          continue;
        }

        if (loweredFuzzy.some((term) => pathLower.includes(term))) {
          fuzzyMatches.push(value);
        }
        continue;
      }

      if (Array.isArray(node)) {
        node.forEach((item, idx) => {
          queue.push({ node: item, path: `${path}[${idx}]` });
        });
        continue;
      }

      if (typeof node === "object") {
        Object.entries(node).forEach(([key, value]) => {
          const nextPath = path ? `${path}.${String(key)}` : String(key);
          queue.push({ node: value, path: nextPath });
        });
      }
    }

    return exactMatches[0] || fuzzyMatches[0] || "";
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
      ["name", "fullName", "fullname", "studentName", "senderName", "displayName", "submittedBy", "Name", "yourName"],
      ["name", "submitted by", "sender", "full name", "student", "what is your name"],
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

  function getNameKey(name) {
    return (name || "").trim().toLowerCase();
  }

  function getDisplayItems() {
    if (!capsuleOpened) return entries;

    const grouped = new Map();
    entries.forEach((entry) => {
      const trimmedName = (entry.name || "").trim();
      const groupKey = trimmedName ? `name:${getNameKey(trimmedName)}` : `entry:${entry.id}`;

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          id: groupKey,
          name: trimmedName || "Unnamed contributor",
          sortTime: entry.sortTime,
          entries: [],
        });
      }

      const bucket = grouped.get(groupKey);
      bucket.entries.push(entry);
      if (entry.sortTime > bucket.sortTime) bucket.sortTime = entry.sortTime;
    });

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => b.sortTime - a.sortTime),
      }))
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  function getListLabel(item, index) {
    if (capsuleOpened) return item.name;
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
    const kind = mime.startsWith("image/")
      ? "image"
      : mime.startsWith("video/")
        ? "video"
        : mime.startsWith("audio/")
          ? "audio"
          : inferTypeFromUrl(attachment.url);

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

    const displayItems = getDisplayItems();
    if (!displayItems.length) {
      entryDetailTitle.textContent = capsuleOpened ? "Opened vault" : "Vault locked";
      entryDetail.innerHTML = "<p>No entries yet — the capsule is still being filled.</p>";
      return;
    }

    const selectedItem = displayItems.find((item) => item.id === selectedEntryId) || displayItems[0];
    selectedEntryId = selectedItem.id;
    const selectedIndex = displayItems.findIndex((item) => item.id === selectedEntryId);

    entryDetailTitle.textContent = getListLabel(selectedItem, selectedIndex);
    entryDetail.innerHTML = "";

    if (!capsuleOpened) {
      const meta = document.createElement("p");
      meta.className = "entry-meta";
      meta.textContent = selectedItem.timestamp;
      entryDetail.appendChild(meta);

      const lockedMsg = document.createElement("p");
      lockedMsg.textContent = "Identity, message, and files remain sealed until the reveal moment.";
      entryDetail.appendChild(lockedMsg);

      if (selectedItem.attachments.length) {
        const attachmentCount = document.createElement("p");
        attachmentCount.className = "muted";
        attachmentCount.textContent = `${selectedItem.attachments.length} attachment(s) sealed in this memory.`;
        entryDetail.appendChild(attachmentCount);
      }
      return;
    }

    const selectedEntries = selectedItem.entries || [];
    const allAttachments = [];

    selectedEntries.forEach((entry, idx) => {
      const meta = document.createElement("p");
      meta.className = "entry-meta";
      meta.textContent = `Submission ${idx + 1}: ${entry.timestamp}`;
      entryDetail.appendChild(meta);

      const message = document.createElement("p");
      message.textContent = entry.message || "No message provided.";
      entryDetail.appendChild(message);

      allAttachments.push(...entry.attachments);
    });

    if (allAttachments.length) {
      const mediaWrap = document.createElement("div");
      mediaWrap.className = "entry-media";
      allAttachments.forEach((attachment) => renderAttachment(mediaWrap, attachment));
      entryDetail.appendChild(mediaWrap);
    }
  }

  function renderEntriesList() {
    if (!entriesList || !entryListTitle) return;
    entriesList.innerHTML = "";
    entryListTitle.textContent = capsuleOpened ? "Contributors (grouped by name)" : "Contributors (anonymous)";

    const displayItems = getDisplayItems();
    if (!displayItems.length) {
      entriesList.innerHTML = "<p>No contributors yet.</p>";
      return;
    }

    displayItems.forEach((item, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "entry-list-item";
      if (item.id === selectedEntryId) btn.classList.add("active");

      const name = document.createElement("strong");
      name.textContent = getListLabel(item, index);
      const time = document.createElement("span");
      if (capsuleOpened) {
        const count = item.entries ? item.entries.length : 1;
        time.textContent = `${count} submission(s)`;
      } else {
        time.textContent = item.timestamp;
      }

      btn.appendChild(name);
      btn.appendChild(time);
      btn.addEventListener("click", () => {
        selectedEntryId = item.id;
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

    setTimeout(openCapsule, shouldAnimateOnLoad ? 4700 : 0);
    setTimeout(() => {
      if (!revealSequence) return;
      revealSequence.classList.remove("active");
      revealSequence.classList.add("hidden");
      revealSequence.setAttribute("aria-hidden", "true");
    }, shouldAnimateOnLoad ? 5600 : 0);
  }

  function updateCountdown() {
    const diff = revealDate - new Date();

    if (forceOpenCapsule || diff <= 0) {
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

    try {
      const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
      const db = app.database();
      const ref = db.ref(firebasePath);

      ref.once("value")
        .then((snapshot) => {
          const data = snapshot.val();
          entries = data ? Object.entries(data).map(([id, raw]) => normalizeEntry(id, raw || {})) : [];
          entries.sort((a, b) => b.sortTime - a.sortTime);

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
    } catch (err) {
      console.error("Error loading entries:", err);
      if (entriesList) entriesList.innerHTML = "<p>Error loading contributors.</p>";
      if (entryDetail) entryDetail.innerHTML = "<p>Error loading capsule contents.</p>";
    }
  }

  capsuleOpened = forceOpenCapsule || new Date() >= revealDate;
  syncVaultStateUI();
  loadCapsuleEntries();

  setInterval(updateCountdown, 1000);
  updateCountdown();

  if (capsuleOpened) {
    renderEntriesList();
    renderSelectedEntry();
  }
});
