/* app.js
 - Live reads from Firebase Realtime Database path: /capsuleEntries
 - Default batch title & reveal date can be changed here
*/

(() => {
  // ---------- CONFIG ----------
  const BATCH_TITLE = "Batch 2025 Digital Time Capsule"; // change
  const REVEAL_ISO = "2028-05-01T09:00:00+08:00"; // change: ISO 8601 local (Manila +08:00)
  const FIREBASE_DB_PATH = "/capsuleEntries"; // where the Google Apps Script will push
  const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdxraYeyrpC4zMC-EtXQg8xauGSrtsys34AU_bLf7MwOcB1vg/viewform"; // replace with your form link

  // ---------- DOM ----------
  const el = (id) => document.getElementById(id);
  const batchTitleEl = el("batch-title");
  const revealDateText = el("reveal-date-text");
  const submitLink = el("submit-link");
  const ctaSubmit = el("cta-submit");

  // countdown elements
  const cdDays = el("cd-days"), cdHours = el("cd-hours"), cdMins = el("cd-mins"), cdSecs = el("cd-secs");

  const capsuleLock = el("capsule-lock");
  const capsuleContents = el("capsule-contents");
  const entriesGrid = el("entries");

  const forceOpenBtn = el("force-open");

  // set initial text
  batchTitleEl.textContent = BATCH_TITLE;
  revealDateText.textContent = new Date(REVEAL_ISO).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
  submitLink.href = GOOGLE_FORM_URL;
  ctaSubmit.href = GOOGLE_FORM_URL;

  // ---------- countdown & lock logic ----------
  let revealDate = new Date(REVEAL_ISO);
  function updateCountdown() {
    const now = new Date();
    const diff = revealDate - now;
    if (diff <= 0) {
      // reveal
      cdDays.textContent = "00"; cdHours.textContent = "00"; cdMins.textContent = "00"; cdSecs.textContent = "00";
      unlockCapsule();
      clearInterval(countdownInterval);
      return;
    }
    const s = Math.floor(diff / 1000);
    const days = Math.floor(s / 86400);
    let rem = s - days * 86400;
    const hours = Math.floor(rem / 3600);
    rem -= hours * 3600;
    const mins = Math.floor(rem / 60);
    const secs = rem - mins * 60;
    cdDays.textContent = String(days).padStart(2,"0");
    cdHours.textContent = String(hours).padStart(2,"0");
    cdMins.textContent = String(mins).padStart(2,"0");
    cdSecs.textContent = String(secs).padStart(2,"0");
  }
  const countdownInterval = setInterval(updateCountdown, 1000);
  updateCountdown();

  // ---------- Firebase init ----------
  function initFirebase() {
    if (!window.__FIREBASE_CONFIG) {
      console.error("Missing Firebase config. Please set scripts/firebase-config.js");
      return null;
    }
    const cfg = window.__FIREBASE_CONFIG;
    const app = firebase.initializeApp(cfg);
    const db = firebase.database();
    return db;
  }

  const db = initFirebase();

  // ---------- fetch & render entries ----------
  function renderEntry(key, data) {
    // data: {name, message, fileUrl, fileType, timestamp}
    const div = document.createElement("div");
    div.className = "entry";
    const meta = document.createElement("div");
    meta.className = "meta";
    const ts = data.timestamp ? new Date(data.timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }) : "";
    meta.textContent = `${data.name || "Anonymous"} • ${ts}`;
    div.appendChild(meta);

    const p = document.createElement("p");
    p.textContent = data.message || "";
    div.appendChild(p);

    if (data.fileUrl) {
      // decide media type
      if (data.fileType && data.fileType.startsWith("image")) {
        const img = document.createElement("img");
        img.src = data.fileUrl;
        img.alt = data.name || "photo";
        div.appendChild(img);
      } else if (data.fileType && data.fileType.startsWith("video")) {
        const v = document.createElement("video");
        v.controls = true;
        v.src = data.fileUrl;
        v.preload = "metadata";
        div.appendChild(v);
      } else if (data.fileType && data.fileType.startsWith("audio")) {
        const a = document.createElement("audio");
        a.controls = true;
        a.src = data.fileUrl;
        div.appendChild(a);
      } else {
        const a = document.createElement("a");
        a.href = data.fileUrl;
        a.textContent = "Download attachment";
        a.target = "_blank";
        div.appendChild(a);
      }
    }
    return div;
  }

  function showEntries(entries) {
    entriesGrid.innerHTML = "";
    // sort by timestamp ascending
    const keys = Object.keys(entries || {}).sort((a,b) => {
      const ta = entries[a].timestamp || 0;
      const tb = entries[b].timestamp || 0;
      return ta - tb;
    });
    keys.forEach(k => {
      const el = renderEntry(k, entries[k]);
      entriesGrid.appendChild(el);
    });
  }

  // ---------- lock/unlock UI ----------
  function unlockCapsule() {
    capsuleLock.classList.add("hidden");
    capsuleContents.classList.remove("hidden");
  }
  function lockCapsule() {
    capsuleLock.classList.remove("hidden");
    capsuleContents.classList.add("hidden");
  }

  // force open (admin)
  forceOpenBtn.addEventListener("click", (ev) => {
    if (!confirm("Force open the capsule? This will reveal entries locally in this browser.")) return;
    unlockCapsule();
  });

  // ---------- live listener (Realtime DB) ----------
  if (db) {
    const ref = db.ref(FIREBASE_DB_PATH);
    // initial load
    ref.on("value", snapshot => {
      const val = snapshot.val();
      // Only show entries if capsule is unlocked (or if admin forced it)
      const now = new Date();
      if (now >= revealDate) {
        unlockCapsule();
        showEntries(val || {});
      } else {
        // If currently locked, still keep entries loaded but hidden; you can still render to DOM but keep it hidden.
        window.__capsulePending = val || {};
        // Optional: show a small sample of anonymous quotes - we keep full data private
      }
    });

    // Also listen for child_added to update live when open
    ref.on("child_added", snapshot => {
      const val = snapshot.val();
      const key = snapshot.key;
      // if already unlocked, append this entry
      if (!capsuleContents.classList.contains("hidden")) {
        const e = renderEntry(key, val);
        entriesGrid.appendChild(e);
      } else {
        // keep in pending
        window.__capsulePending = window.__capsulePending || {};
        window.__capsulePending[key] = val;
      }
    });
  }

  // When the page is revealed (date passed) and we have pending items, render them
  function tryRenderPending() {
    if (!capsuleContents.classList.contains("hidden") && window.__capsulePending) {
      showEntries(window.__capsulePending);
      window.__capsulePending = null;
    }
  }
  // check every 2 seconds if reveal happened
  setInterval(tryRenderPending, 2000);

  // If page loaded after reveal, show entries
  if (new Date() >= revealDate) {
    unlockCapsule();
  }

})();
