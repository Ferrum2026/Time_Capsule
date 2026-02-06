// app.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧭 Time Capsule website loaded.");

  const appConfig = window.__APP_CONFIG || {};
  const revealDate = new Date(appConfig.revealIso || "2025-11-01T00:00:00Z");
  const revealDateText = document.getElementById("reveal-date-text");
  const countdownElems = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs"),
  };

  const submitUrl = appConfig.googleFormUrl || "#";
  const submitLink = document.getElementById("submit-link");
  const ctaSubmit = document.getElementById("cta-submit");

  [submitLink, ctaSubmit].forEach((el) => {
    if (el) {
      el.href = submitUrl;
      if (submitUrl === "#") {
        el.classList.add("disabled");
        el.removeAttribute("target");
      }
    }
  });

  const revealDateTextInline = document.getElementById("reveal-date-text-inline");
  if (!revealDateText) {
    console.warn("⚠️ reveal-date-text element not found — skipping date display.");
  } else {
    revealDateText.textContent = revealDate.toUTCString();
  }
  if (revealDateTextInline) revealDateTextInline.textContent = revealDate.toUTCString();

  const lockSection = document.getElementById("capsule-lock");
  const capsuleContents = document.getElementById("capsule-contents");

  function openCapsule() {
    if (lockSection) lockSection.classList.add("hidden");
    if (capsuleContents) capsuleContents.classList.remove("hidden");
    loadCapsuleEntries();
  }

  function keepLocked() {
    if (lockSection) lockSection.classList.remove("hidden");
    if (capsuleContents) capsuleContents.classList.add("hidden");
  }

  function updateCountdown() {
    const now = new Date();
    const diff = revealDate - now;

    if (diff <= 0) {
      Object.values(countdownElems).forEach((el) => {
        if (el) el.textContent = "00";
      });
      openCapsule();
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

    keepLocked();
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  function loadCapsuleEntries() {
    const firebaseConfig = window.__FIREBASE_CONFIG;
    if (!firebaseConfig) {
      console.error("Firebase config not loaded.");
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.database();
    const ref = db.ref("capsuleEntries");

    const entriesContainer = document.getElementById("entries");
    if (!entriesContainer) return;

    entriesContainer.innerHTML = "<p>Loading capsule entries...</p>";

    ref.once("value")
      .then((snapshot) => {
        const data = snapshot.val();
        entriesContainer.innerHTML = "";

        if (!data) {
          entriesContainer.innerHTML = "<p>No entries yet — the capsule is still being filled.</p>";
          return;
        }

        Object.values(data)
          .sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""))
          .forEach((entry) => {
            const div = document.createElement("article");
            div.className = "entry";

            const meta = document.createElement("div");
            meta.className = "meta";
            meta.textContent = `${entry.name || "Anonymous"} — ${entry.submittedAt || ""}`;

            const message = document.createElement("p");
            message.textContent = entry.message || "";

            div.appendChild(meta);
            div.appendChild(message);

            if (entry.fileUrl) {
              if (entry.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                const img = document.createElement("img");
                img.src = entry.fileUrl;
                img.alt = "Capsule entry media";
                div.appendChild(img);
              } else if (entry.fileUrl.match(/\.(mp4|mov|avi|webm)$/i)) {
                const vid = document.createElement("video");
                vid.src = entry.fileUrl;
                vid.controls = true;
                div.appendChild(vid);
              } else if (entry.fileUrl.match(/\.(mp3|wav|ogg|m4a)$/i)) {
                const aud = document.createElement("audio");
                aud.src = entry.fileUrl;
                aud.controls = true;
                div.appendChild(aud);
              } else {
                const link = document.createElement("a");
                link.href = entry.fileUrl;
                link.textContent = "Attached file";
                link.target = "_blank";
                div.appendChild(link);
              }
            }

            entriesContainer.appendChild(div);
          });
      })
      .catch((err) => {
        console.error("Error loading entries:", err);
        entriesContainer.innerHTML = "<p>Error loading capsule contents.</p>";
      });
  }
});
