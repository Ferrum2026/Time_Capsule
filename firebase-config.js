// =============================================
// SUPER EASY EDIT FILE
// CHANGE THESE VALUES FIRST.
// =============================================

const firebaseConfig = {
  apiKey: 'PUT_YOUR_FIREBASE_API_KEY_HERE',
  authDomain: 'PUT_YOUR_FIREBASE_AUTH_DOMAIN_HERE',
  databaseURL: 'PUT_YOUR_FIREBASE_DATABASE_URL_HERE',
  projectId: 'PUT_YOUR_FIREBASE_PROJECT_ID_HERE',
  storageBucket: 'PUT_YOUR_FIREBASE_STORAGE_BUCKET_HERE',
  messagingSenderId: 'PUT_YOUR_FIREBASE_MESSAGING_SENDER_ID_HERE',
  appId: 'PUT_YOUR_FIREBASE_APP_ID_HERE'
};

const appConfig = {
  // 1) EASIEST TIMER TO CHANGE.
  // Example: '2027-12-31T23:59:59'
  revealIso: '2027-12-31T23:59:59',

  // 2) Set to true if you want to TEST the open vault immediately.
  forceOpenVault: false,

  // 3) Paste your Google Form link here.
  googleFormUrl: 'PASTE_YOUR_GOOGLE_FORM_LINK_HERE',

  // 4) Firebase path where the Google Form script will save entries.
  firebasePath: 'capsuleEntries',

  // 5) ALL THE WORDS AND FILES YOU WILL MOST LIKELY CHANGE.
  ui: {
    siteTitle: 'Your Batch Time Capsule',
    siteTagline: 'A locked digital vault for messages, photos, and memories.',
    vaultTitle: 'The Main Vault',
    vaultDescription: 'This vault opens when the countdown reaches zero. Once open, the submitted files and messages appear below.',
    slogan: 'Write today. Open tomorrow.',
    quote: '“The best thing about memories is opening them again later.”',

    // Replace these with your own files.
    // You can create a new folder in this project like media/ and drop your files there.
    logoPath: 'assets/batch-logo-2026.svg',
    heroImagePath: 'assets/batch-banner-2026.svg',
    throwbackImagePath: 'assets/batch-banner-2026.svg',
    filmVideoPath: '',
    behindScenesVideoPath: ''
  }
};

window.__FIREBASE_CONFIG = firebaseConfig;
window.__APP_CONFIG = appConfig;
