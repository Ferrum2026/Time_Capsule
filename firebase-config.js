// =============================================
// SUPER EASY EDIT FILE
// CHANGE THESE VALUES FIRST.
// =============================================

const firebaseConfig = {
  apiKey: 'AIzaSyB9ADMsJMGKO9jvUxpDdclVAHy4RZmileQ',
  authDomain: 'batchcapsule.firebaseapp.com',
  databaseURL: 'https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app/',
  projectId: 'batchcapsule',
  storageBucket: 'batchcapsule.appspot.com',
  messagingSenderId: '660821902563',
  appId: '1:660821902563:web:980ba4ae153fef1ce1f1d6'
};

const appConfig = {
  // 1) EASIEST TIMER TO CHANGE.
  // Example: '2027-12-31T23:59:59'
  revealIso: '2028-04-26T19:029:59',

  // 2) Set to true if you want to TEST the open vault immediately.
  forceOpenVault: false,

  // 3) Firebase path where the website stores entries.
  firebasePath: 'capsuleEntries',

  // 3.1) Optional Google Drive mirror for uploaded files.
  // Deploy the provided Apps Script web app and paste its /exec URL here.
  driveSync: {
    enabled: false,
    webhookUrl: '',
    apiKey: 'AIzaSyB9ADMsJMGKO9jvUxpDdclVAHy4RZmileQ'
  },

  // 4) ALL THE WORDS AND FILES YOU WILL MOST LIKELY CHANGE.
  ui: {
    siteTitle: 'Your Batch Time Capsule',
    siteTagline: 'A locked digital vault for messages, uploads, and memories.',
    vaultTitle: 'The Main Vault',
    vaultDescription: 'This vault opens when the countdown reaches zero. Once open, the submitted files and messages grouped by participant appear below.',
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
