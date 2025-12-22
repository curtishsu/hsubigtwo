import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword as firebaseSignInWithEmail,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmail,
  signOut,
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  if (typeof window === 'undefined') {
    throw new Error('signInWithGoogle can only be called in the browser.');
  }
  return signInWithPopup(auth, googleProvider);
}

export function signUpWithEmail(email: string, password: string) {
  return firebaseCreateUserWithEmail(auth, email, password);
}

export function signInWithEmail(email: string, password: string) {
  return firebaseSignInWithEmail(auth, email, password);
}

export function signOutUser() {
  return signOut(auth);
}



