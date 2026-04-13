import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { DEFAULT_PROXIMITY_RADIUS_METERS } from "@/constants/config";
import type { UserProfile } from "@/types";

export function observeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  await updateProfile(credential.user, { displayName });

  // Create user profile in Firestore
  const profile: Omit<UserProfile, "uid"> & { uid: string } = {
    uid: credential.user.uid,
    email,
    displayName,
    photoURL: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    settings: {
      proximityRadius: DEFAULT_PROXIMITY_RADIUS_METERS,
      notificationsEnabled: true,
    },
  };
  await setDoc(doc(db, "users", credential.user.uid), profile);

  return credential.user;
}

export async function signIn(
  email: string,
  password: string
): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}
