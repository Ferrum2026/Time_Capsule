// firebase-config.js
// Replace with your Firebase web app config

const firebaseConfig = {
  apiKey: "AIzaSyB9ADMsJMGKO9jvUxpDdclVAHy4RZmileQ",
  authDomain: "batchcapsule.firebaseapp.com",
  databaseURL: "https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "batchcapsule",
  storageBucket: "batchcapsule.firebasestorage.app",
  messagingSenderId: "660821902563",
  appId: "1:660821902563:web:980ba4ae153fef1ce1f1d6"
};

// App-level settings used by app.js
const appConfig = {
  // Set your public Google Form link here so both submit buttons work.
  googleFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSdxraYeyrpC4zMC-EtXQg8xauGSrtsys34AU_bLf7MwOcB1vg/viewform?usp=header",
  // UTC reveal time. Before this date, capsule entries stay hidden in the website.
  revealIso: "2026-01-01T12:00:00Z"
};

window.__FIREBASE_CONFIG = firebaseConfig;
window.__APP_CONFIG = appConfig;
