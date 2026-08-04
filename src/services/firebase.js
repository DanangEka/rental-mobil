import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDnwT8jYdsKS3oQiev8IRHSrtcea_xWryI",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "rental-mobil-746c9.firebaseapp.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID || "rental-mobil-746c9",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "rental-mobil-746c9.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "321553671318",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID || "1:321553671318:web:fb06560eb13db0fb678eb7",
  measurementId:     process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-JVEPBTEFSS"
};

const app = initializeApp(firebaseConfig);
export const auth           = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db             = getFirestore(app);
export const storage        = getStorage(app);
