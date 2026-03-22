// =============================================
// SUPER EASY EDIT FILE
// CHANGE THESE VALUES FIRST.
// =============================================

const firebaseConfig = {
  apiKey: 'AIzaSyB9ADMsJMGKO9jvUxpDdclVAHy4RZmileQ',
  authDomain: 'batchcapsule.firebaseapp.com',
  databaseURL: 'https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app/submissions.json',
  projectId: 'batch capsule',
  storageBucket: 'batchcapsule.firebasestorage.app',
  messagingSenderId: '660821902563',
  appId: '1:660821902563:web:980ba4ae153fef1ce1f1d6'
};

const appConfig = {
  // 1) EASIEST TIMER TO CHANGE.
  // Example: '2027-12-31T23:59:59'
  revealIso: '2023-03-22T23:10:59',

  // 2) Set to true if you want to TEST the open vault immediately.
  forceOpenVault: false,

  // 3) Paste your Google Form link here.
  googleFormUrl: 'https://forms.gle/yD9CUwp6P9nmPTq58',

  // 4) Firebase path where the Google Form script will save entries.
  firebasePath: 'capsuleEntries',

  // 5) ALL THE WORDS AND FILES YOU WILL MOST LIKELY CHANGE.
  ui: {
    siteTitle: 'Your Batch Time Capsule',
    siteTagline: 'A locked digital vault for messages, photos, and memories.',
    vaultTitle: 'The Main Vault',
    vaultDescription: 'This vault opens when the countdown reaches zero. Once open, the submitted files and messages appear below.',
    slogan: 'Cute nga batch.',
    quote: '“The best thing about memories is opening them again later.”',

    // Replace these with your own files.
    // You can create a new folder in this project like media/ and drop your files there.
    logoPath: 'media/BATCH FERRUM LOGO.png',
    heroImagePath: 'assets/batch-banner-2026.svg',
    throwbackImagePath: 'assets/batch-banner-2026.svg',
    filmVideoPath: '',
    behindScenesVideoPath: ''
  }
};

window.__FIREBASE_CONFIG = firebaseConfig;
window.__APP_CONFIG = appConfig;
