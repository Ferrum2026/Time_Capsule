// Replace the placeholder values with your Firebase project's config
// Create a Firebase project -> Realtime Database -> get your databaseURL
// Save this file with your actual keys before deploying.

 const firebaseConfig = {
    apiKey: "AIzaSyB9ADMsJMGKO9jvUxpDdclVAHy4RZmileQ",
    authDomain: "batchcapsule.firebaseapp.com",
    databaseURL: "https://batchcapsule-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "batchcapsule",
    storageBucket: "batchcapsule.firebasestorage.app",
    messagingSenderId: "660821902563",
    appId: "1:660821902563:web:980ba4ae153fef1ce1f1d6",
};

// The code below expects firebase to be loaded by the page.
// We will export it as a global variable used in app.js
window.__FIREBASE_CONFIG = FIREBASE_PLACEHOLDERS;
