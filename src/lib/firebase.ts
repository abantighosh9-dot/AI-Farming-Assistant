// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB3_Jv7q24HRr7wdpUXuNJK7HZzmZ11NV0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-farm-assis.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-farm-assis",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-farm-assis.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "352569427863",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:352569427863:web:ea95da05c57c7974cb26d2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4FRTLGZDJG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
