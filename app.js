// app.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧭 Time Capsule website loaded.");

  const appConfig = window.__APP_CONFIG || {};
  const revealDate = new Date(appConfig.revealIso || "2025-11-01T00:00:00Z");
  const revealDateText = document.getElementById("reveal-date-text");
  const revealDateTextInline = document.getElementById("reveal-date-text-inline");
  const countdownElems = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs"),
  };

  const lockSection = document.getElementById("capsule-lock");
  const capsuleContents = document.getElementById("capsule-contents");
  const revealSequence = document.getElementById("reveal-sequence");
  const submitUrl = (appConfig.googleFormUrl || "").trim();

  const submitLink = document.getElementById("submit-link");
  const ctaSubmit = document.getElementById("cta-submit");

  [submitLink, ctaSubmit].forEach((el) => {
    if (!el) return;

    if (submitUrl && /^https?:\/\//i.test(submitUrl)) {
      el.href = submitUrl;
      el.classList.remove("disabled");
      el.setAttribute("target", "_blank");
      el.removeAttribute("title");
      return;
    }

    el.href = "#";
    el.classList.add("disabled");
    el.removeAttribute("target");
    el.setAttribute("title", "Set your Google Form link in firebase-config.js");
  });

  const revealDateTime = revealDate.getTime();
  const revealDateLabel = Number.isNaN(revealDateTime)
    ? "Set reveal date in firebase-config.js"
    : revealDate.toUTCString();

  if (revealDateText) revealDateText.textContent = revealDateLabel;
  if (revealDateTextInline) revealDateTextInline.textContent = revealDateLabel;

  let capsuleOpened = false;

  function keepLocked() {
    if (lockSection) lockSection.classList.remove("hidden");
    if (capsuleContents) capsuleContents.classList.add("hidden");
    if (revealSequence) revealSequence.classList.add("hidden");
  }

  function displayOpenedCapsule() {
    if (lockSection) lockSection.classList.add("hidden");
    if (revealSequence) revealSequence.classList.add("hidden");
    if (capsuleContents) capsuleContents.classList.remove("hidden");
    loadCapsuleEntries();
  }

  function playRevealSequence() {
    if (capsuleOpened) return;
    capsuleOpened = true;

    if (lockSection) lockSection.classList.add("hidden");
    if (revealSequence) revealSequence.classList.remove("hidden");

    if (!revealSequence) {
      displayOpenedCapsule();
      return;
    }

    revealSequence.classList.remove("is-cracking", "is-opening");
    void revealSequence.offsetWidth;
    revealSequence.classList.add("is-cracking");

    setTimeout(() => {
      revealSequence.classList.add("is-opening");
    }, 1300);

    setTimeout(() => {
      displayOpenedCapsule();
    }, 3200);
  }

  function updateCountdown() {
    const now = Date.now();
    const diff = revealDateTime - now;

    if (Number.isNaN(revealDateTime) || diff <= 0) {
      Object.values(countdownElems).forEach((el) => {
        if (el) el.textContent = "00";
      });
      playRevealSequence();
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

    keepLocked();
  }

  const countdownTimer = setInterval(updateCountdown, 1000);
  updateCountdown();

  if (!Number.isNaN(revealDateTime) && revealDateTime <= Date.now()) {
    clearInterval(countdownTimer);
  }

  function loadCapsuleEntries() {
    const firebaseConfig = window.__FIREBASE_CONFIG;
    if (!firebaseConfig) {
      console.error("Firebase config not loaded.");
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const entriesContainer = document.getElementById("entries");
    if (!entriesContainer) return;

    entriesContainer.innerHTML = "<p>Loading capsule entries...</p>";

    firebase.database().ref("capsuleEntries").once("value")
      .then((snapshot) => {
        const data = snapshot.val();
        entriesContainer.innerHTML = "";

        if (!data) {
          entriesContainer.innerHTML = "<p>No entries yet — the capsule is still being filled.</p>";
          return;
        }

        Object.values(data)
          .sort((a, b) => {
            const nameA = (a.name || "Anonymous").toLowerCase();
            const nameB = (b.name || "Anonymous").toLowerCase();
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            return (a.submittedAt || "").localeCompare(b.submittedAt || "");
          })
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
