// backend/config/firebase.js
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
require('dotenv').config();

// --- Firebase Configuration Validation ---
// This block checks for all required Firebase environment variables.
// If any are missing, it will stop the server with a clear error message.
const requiredEnv = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  console.error('FATAL ERROR: Missing Firebase environment variables in your .env file:');
  console.error(missingEnv.join('\n'));
  console.error('Please add them to your backend/.env file and restart the server.');
  process.exit(1); // Stop the application
}

// Your web app's Firebase configuration, now guaranteed to have all values.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
let FIREBASE_APP;
let FIREBASE_DB;

try {
  FIREBASE_APP = initializeApp(firebaseConfig);
  FIREBASE_DB = getFirestore(FIREBASE_APP);
  console.log('Firebase connection successful.');
} catch (error) {
  console.error('FATAL ERROR: Failed to initialize Firebase. Please check your Firebase project configuration.');
  console.error(error);
  process.exit(1);
}

module.exports = { FIREBASE_APP, FIREBASE_DB };
