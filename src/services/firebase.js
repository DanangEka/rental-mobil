import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDnwT8jYdsKS3oQiev8IRHSrtcea_xWryI",
  authDomain: "rental-mobil-746c9.firebaseapp.com",
  projectId: "rental-mobil-746c9",
  storageBucket: "rental-mobil-746c9.firebasestorage.app",
  messagingSenderId: "321553671318",
  appId: "1:321553671318:web:fb06560eb13db0fb678eb7",
  measurementId: "G-JVEPBTEFSS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
