// ===== Firebase Configuration =====
// Initializes Firebase app, Firestore, and Analytics.

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: "tgf-meditation.firebaseapp.com",
    projectId: "tgf-meditation",
    storageBucket: "tgf-meditation.firebasestorage.app",
    messagingSenderId: "795468174785",
    appId: "1:795468174785:web:3df58c8aa84827e5d58b40",
    measurementId: "G-BYLRZXC6DH",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export default app;
