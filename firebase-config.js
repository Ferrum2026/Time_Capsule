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
  // =========================================================
  // 🔧 QUICK SETTINGS (MOST IMPORTANT)
  // =========================================================
  // 1) TIMER: change this date/time to control vault opening.
  // Example: '2027-12-31T23:59:59'
  // 👇 EDIT THIS LINE
  revealIso: '2030-04-03T23:59:59',

  // 2) FORCE OPEN: set true to open vault immediately for testing.
  // 👇 EDIT THIS LINE
  forceOpenVault: true,
  // =========================================================

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
    siteTitle: '.✦ ݁Batch Ferrum Time Capsule ⊹ ࣪ ',
    siteTagline: 'Among-Us X Minecraft themed vault with countdown and submissions.',
    vaultTitle: 'The Main Vault ⋆˙⟡',
    vaultDescription: 'This vault opens when the countdown reaches zero. Once open, the submitted files and messages grouped by you guys appear below!',
    slogan: 'Ngano naay gubot basta kami na mo graduate?',
    quote: '“The best thing about memories is opening them again later.”',

    // Replace these with your own files.
    // You can create a new folder in this project like media/ and drop your files there.
    logoPath: 'media/BATCH FERRUM LOGO.png',
    heroImagePath: '',
    throwbackImagePath: '',
    // Paste your class Facebook page link for the "Our Memories" button.
    // Example: 'https://www.facebook.com/YourBatchPage'
    facebookPageUrl: 'https://www.facebook.com/profile.php?id=61583158778866',
    filmVideoPath: '',
    behindScenesVideoPath: ''
  }
};

window.__FIREBASE_CONFIG = firebaseConfig;
window.__APP_CONFIG = appConfig;
