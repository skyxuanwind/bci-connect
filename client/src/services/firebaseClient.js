import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';

const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DB_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

let app;
let db;

export const initFirebase = () => {
  if (!config.apiKey || !config.databaseURL) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Firebase] Missing env, falling back to local storage.');
    }
    return null;
  }
  if (!app) app = initializeApp(config);
  if (!db) db = getDatabase(app);
  return db;
};

export const dbRef = (path) => {
  const database = initFirebase();
  if (!database) return null;
  return ref(database, path);
};

export const dbSet = async (path, value) => {
  const r = dbRef(path);
  if (!r) {
    // Fallback to localStorage for dev environments without Firebase
    try {
      localStorage.setItem(`cardstudio:${path}`, JSON.stringify(value));
    } catch {}
    return;
  }
  await set(r, value);
};

export const dbGet = async (path) => {
  const r = dbRef(path);
  if (!r) {
    try {
      const raw = localStorage.getItem(`cardstudio:${path}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  const snap = await get(r);
  return snap.exists() ? snap.val() : null;
};

export const dbSubscribe = (path, callback) => {
  const r = dbRef(path);
  if (!r) return () => {};
  const unsub = onValue(r, (snap) => callback(snap.val()));
  return () => unsub();
};