import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyBlysBlxU4VUtK7SaDi1cCkCcXiHxFPE-g",
  authDomain: "notare-app-cd64a.firebaseapp.com",
  projectId: "notare-app-cd64a",
  storageBucket: "notare-app-cd64a.firebasestorage.app",
  messagingSenderId: "331484908098",
  appId: "1:331484908098:web:403b7453bc751399e23bdb",
  measurementId: "G-XS7CWJ244C"
};

// Initialize Firebase App & Services
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);
