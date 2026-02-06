// app.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("🧭 Time Capsule website loaded.");

  const appConfig = window.__APP_CONFIG || {};
  const revealDate = appConfig.revealIso ? new Date(appConfig.revealIso) : new Date();
  const revealDateText = document.getElementById("reveal-date-text");
  const lockStatus = document.getElementById("lock-status");
  const countdownElems = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs"),
  };

  const lockSection = document.getElementById("capsule-lock");
  const capsuleContents = document.getElementById("capsule-contents");
  const entriesContainer = document.getElementById("entries");
  const revealSequence = document.getElementById("reveal-sequence");
  let revealStarted = false;

  if (revealDateText) {
    revealDateText.textContent = revealDate.toDateString();
  }

  function openCapsule() {
    if (lockSection) lockSection.classList.add("hidden");
    if (capsuleContents) capsuleContents.classList.remove("hidden");
    loadCapsuleEntries();
  }

  function startRevealSequence() {
    if (revealStarted) return;
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
      startRevealSequence();
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

  setInterval(updateCountdown, 1000);
  updateCountdown();

  function createEntryCard(entry) {
    const div = document.createElement("div");
    div.className = "entry";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = entry.timestamp || "No timestamp";

    const message = document.createElement("p");
    message.textContent = entry.message || "";

    div.appendChild(meta);
    div.appendChild(message);

    if (entry.fileUrl) {
      if (entry.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
        const img = document.createElement("img");
        img.src = entry.fileUrl;
        img.alt = `${entry.name || "Anonymous"} memory image`;
        div.appendChild(img);
      } else if (entry.fileUrl.match(/\.(mp4|mov|avi)$/i)) {
        const vid = document.createElement("video");
        vid.src = entry.fileUrl;
        vid.controls = true;
        div.appendChild(vid);
      } else if (entry.fileUrl.match(/\.(mp3|wav|ogg)$/i)) {
        const aud = document.createElement("audio");
        aud.src = entry.fileUrl;
        aud.controls = true;
        div.appendChild(aud);
      }
    }

    return div;
  }

  function renderGroupedEntries(entries) {
    if (!entriesContainer) return;
    entriesContainer.innerHTML = "";

    if (!entries.length) {
      entriesContainer.innerHTML = "<p>No entries yet — the capsule is still being filled.</p>";
      return;
    }

    const grouped = entries.reduce((acc, entry) => {
      const name = (entry.name || "Anonymous").trim() || "Anonymous";
      if (!acc[name]) acc[name] = [];
      acc[name].push(entry);
      return acc;
    }, {});

    const sortedNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    sortedNames.forEach((name) => {
      const section = document.createElement("section");
      section.className = "name-group";

      const heading = document.createElement("h5");
      heading.className = "name-group-title";
      heading.textContent = name;

      const grid = document.createElement("div");
      grid.className = "name-group-grid";

      grouped[name].forEach((entry) => {
        grid.appendChild(createEntryCard(entry));
      });

      section.appendChild(heading);
      section.appendChild(grid);
      entriesContainer.appendChild(section);
    });
  }

  function loadCapsuleEntries() {
    const firebaseConfig = window.__FIREBASE_CONFIG;
    if (!firebaseConfig) {
      console.error("Firebase config not loaded.");
      return;
    }

    if (!entriesContainer) return;
    entriesContainer.innerHTML = "<p>Loading capsule entries...</p>";

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.database();
    const ref = db.ref("capsuleEntries");

    ref.once("value")
      .then((snapshot) => {
        const data = snapshot.val();
        const entries = data ? Object.values(data) : [];
        renderGroupedEntries(entries);
      })
      .catch((err) => {
        console.error("Error loading entries:", err);
        entriesContainer.innerHTML = "<p>Error loading capsule contents.</p>";
      });
  }
});
