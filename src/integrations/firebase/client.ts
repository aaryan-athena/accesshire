// Firebase is AccessHire's only backend:
//   - Firestore `companies`        employer + job submissions from the intake form (form/)
//   - Firestore `users`            account profile per signed-in user
//   - Firestore `candidate_profiles` capability + access profile per user
//   - Firebase Auth                email/password and Google sign-in
//
// Import like this:
//   import { auth, db } from "@/integrations/firebase/client";

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/** Collection names shared with the intake form. */
export const COLLECTIONS = {
  companies: "companies",
  users: "users",
  candidateProfiles: "candidate_profiles",
} as const;
