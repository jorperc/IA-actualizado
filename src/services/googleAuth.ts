import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App if not already initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Auth Provider configured exclusively for sending emails (Least Privilege)
export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const provider = new GoogleAuthProvider();
provider.addScope(GMAIL_SEND_SCOPE);

// Keep token in memory (never in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

export const initAuthListener = (
  onUserChanged?: (user: User | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user && cachedAccessToken) {
      onUserChanged?.(user, cachedAccessToken);
    } else {
      if (!user) {
        cachedAccessToken = null;
      }
      onUserChanged?.(user, cachedAccessToken);
    }
  });
};

export const connectGmailOAuth = async (): Promise<{
  user: User;
  email: string;
  accessToken: string;
}> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error(
        'Google no devolvió un token de acceso válido. Por favor, asegúrate de otorgar los permisos solicitados en la ventana emergente.'
      );
    }

    cachedAccessToken = accessToken;
    const email = result.user.email || '';

    return {
      user: result.user,
      email,
      accessToken,
    };
  } catch (error: any) {
    console.error('[GoogleAuth] Error durante la autenticación OAuth:', error);
    throw error;
  }
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null): void => {
  cachedAccessToken = token;
};

export const disconnectGoogleAuth = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
  }
};
