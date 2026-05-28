import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export function detectBrowserContext() {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || 
                   (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  
  const isKakao = /KAKAOTALK/i.test(ua);
  const isNaver = /NAVER/i.test(ua);
  const isLine = /Line/i.test(ua);
  const isInApp = isKakao || isNaver || isLine;
  
  const isIframe = window.self !== window.top;
  
  return {
    isMobile,
    isKakao,
    isNaver,
    isLine,
    isInApp,
    isIframe,
    userAgent: ua
  };
}

export async function signInWithGoogle(forceRedirect = false) {
  try {
    const context = detectBrowserContext();

    // Inside iframe or Kakao/Naver in-app browser, popups are heavily constrained.
    // However, Google COMPLETELY blocks Webviews (Kakao/Naver) from both popup and redirect, throwing a 403 disallowed_useragent.
    // We should warn the user, but if they click login, we'll try signInWithPopup as it has better browser compatibility on native Safari/Chrome.
    
    if (forceRedirect) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    try {
      // Prioritize signInWithPopup because iOS Safari and Mobile Chrome block the 3rd-party storage cookies used by signInWithRedirect,
      // which often leads to 403 redirect/missing-state errors. Popup is highly recommended for mobile Safari/Chrome.
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err: any) {
      console.warn("Popup Sign In failed or blocked. Trying redirect fallback...", err);
      
      // If popup blocker was triggered, try Redirect as absolute fallback
      if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request')) {
         await signInWithRedirect(auth, googleProvider);
         return null;
      }
      throw err;
    }
  } catch (error) {
    console.error('Core Google Sign-In Error:', error);
    throw error;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout Error:', error);
    throw error;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed Info:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
