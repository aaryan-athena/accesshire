import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { auth, COLLECTIONS, db } from "@/integrations/firebase/client";

export interface AppUser {
  id: string;
  email: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  assessment_completed_at: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string, role: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toAppUser = (u: FirebaseUser): AppUser => ({ id: u.uid, email: u.email });

const FRIENDLY_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/user-not-found": "No account found with that email.",
  "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled for AccessHire yet.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
};

const errorMessage = (e: unknown) =>
  e instanceof FirebaseError
    ? FRIENDLY_ERRORS[e.code] ?? e.message
    : e instanceof Error
      ? e.message
      : "Something went wrong. Please try again.";

const toIso = (v: unknown): string | null => {
  const ts = v as { toDate?: () => Date } | null | undefined;
  if (ts && typeof ts.toDate === "function") return ts.toDate().toISOString();
  return typeof v === "string" ? v : null;
};

/** Creates users/{uid} on first sign-in; never overwrites an existing role. */
async function ensureUserDoc(u: FirebaseUser, extra: { full_name?: string; role?: string } = {}) {
  const ref = doc(db, COLLECTIONS.users, u.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    email: u.email,
    full_name: extra.full_name ?? u.displayName ?? null,
    avatar_url: u.photoURL ?? null,
    role: extra.role ?? "jobseeker",
    created_at: serverTimestamp(),
  });
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (u: FirebaseUser) => {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.users, u.uid));
      const data = snap.data() ?? {};
      setProfile({
        id: u.uid,
        full_name: (data.full_name as string) ?? u.displayName ?? null,
        avatar_url: (data.avatar_url as string) ?? u.photoURL ?? null,
        role: (data.role as string) ?? null,
        assessment_completed_at: toIso(data.assessment_completed_at),
      });
    } catch {
      // Profile doc unreadable (e.g. rules not deployed yet) — fall back to auth data.
      setProfile({
        id: u.uid,
        full_name: u.displayName ?? null,
        avatar_url: u.photoURL ?? null,
        role: null,
        assessment_completed_at: null,
      });
    }
  }, []);

  const refreshProfile = async () => {
    if (auth.currentUser) await fetchProfile(auth.currentUser);
  };

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u ? toAppUser(u) : null);
        if (u) fetchProfile(u);
        else setProfile(null);
        setLoading(false);
      }),
    [fetchProfile],
  );

  const signInWithGoogle = async () => {
    try {
      const { user: u } = await signInWithPopup(auth, new GoogleAuthProvider());
      await ensureUserDoc(u).catch(() => null);
      await fetchProfile(u);
    } catch (e) {
      if (e instanceof FirebaseError && e.code === "auth/popup-closed-by-user") return;
      throw new Error(errorMessage(e));
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string, role: string) => {
    try {
      const { user: u } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(u, { displayName: fullName });
      await ensureUserDoc(u, { full_name: fullName, role }).catch(() => null);
      await fetchProfile(u);
      return { error: null };
    } catch (e) {
      return { error: errorMessage(e) };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
