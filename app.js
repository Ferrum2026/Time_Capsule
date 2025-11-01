// app.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("🧭 Time Capsule website loaded.");

  // --- SET REVEAL DATE ---
  const revealDate = new Date("2026-03-15T00:00:00"); // change this to your chosen reveal date
  const revealDateText = document.getElementById("reveal-date-text");
  const countdownElems = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs"),
  };

  if (!revealDateText) {
  console.warn("⚠️ reveal-date-text element not found — skipping date display.");
} else {
  revealDateText.textContent = revealDate.toDateString();
}


  // --- COUNTDOWN FUNCTION ---
  function updateCountdown() {
    const now = new Date();
    const diff = revealDate - now;

    if (diff <= 0) {
      openCapsule();
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    countdownElems.days.textContent = days.toString().padStart(2, "0");
    countdownElems.hours.textContent = hours.toString().padStart(2, "0");
    countdownElems.mins.textContent = mins.toString().padStart(2, "0");
    countdownElems.secs.textContent = secs.toString().padStart(2, "0");
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // --- CAPSULE LOGIC ---
  const lockSection = document.getElementById("capsule-lock");
  const capsuleContents = document.getElementById("capsule-contents");
  const forceOpenBtn = document.getElementById("force-open");

  function openCapsule() {
    if (lockSection) lockSection.classList.add("hidden");
    if (capsuleContents) capsuleContents.classList.remove("hidden");
    loadCapsuleEntries();
  }

  if (forceOpenBtn) {
    forceOpenBtn.addEventListener("click", () => {
      openCapsule();
      console.log("🔓 Capsule manually opened by admin.");
    });
  }

  // --- LOAD CAPSULE ENTRIES FROM FIREBASE ---
  function loadCapsuleEntries() {
    const firebaseConfig = window.__FIREBASE_CONFIG;
    if (!firebaseConfig) {
      console.error("Firebase config not loaded.");
      return;
    }

    const app = firebase.initializeApp(firebaseConfig);
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

        Object.values(data).forEach((entry) => {
          const div = document.createElement("div");
          div.className = "entry";

          const meta = document.createElement("div");
          meta.className = "meta";
          meta.textContent = `${entry.name || "Anonymous"} — ${entry.timestamp || ""}`;

          const message = document.createElement("p");
          message.textContent = entry.message || "";

          div.appendChild(meta);
          div.appendChild(message);

          // Optional media file
          if (entry.fileUrl) {
            if (entry.fileUrl.match(/\.(jpg|jpeg|png|gif)$/i)) {
              const img = document.createElement("img");
              img.src = entry.fileUrl;
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

          entriesContainer.appendChild(div);
        });
      })
      .catch((err) => {
        console.error("Error loading entries:", err);
        entriesContainer.innerHTML = "<p>Error loading capsule contents.</p>";
      });
  }
});
