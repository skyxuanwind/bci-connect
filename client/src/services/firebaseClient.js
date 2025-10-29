import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, onDisconnect, connectDatabaseEmulator } from 'firebase/database';

const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DB_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// 開發環境：輸出環境變數是否已設置（不打印實際值）
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
  const presence = {
    apiKey: !!process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: !!process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: !!process.env.REACT_APP_FIREBASE_DB_URL,
    projectId: !!process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: !!process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: !!process.env.REACT_APP_FIREBASE_SENDER_ID,
    appId: !!process.env.REACT_APP_FIREBASE_APP_ID,
  };
  console.info('[Firebase] env presence (dev):', presence);
}

let app;
let db;
let hasWarnedMissingEnv = false;

export const initFirebase = () => {
  if (!config.apiKey || !config.databaseURL) {
    if (process.env.NODE_ENV === 'production') {
      if (!hasWarnedMissingEnv) {
        console.info('[Firebase] 未配置環境變數，使用本機儲存替代');
        hasWarnedMissingEnv = true;
      }
    } else {
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

// Firebase Client 物件 - 提供統一的介面給 SyncManager 使用
export const firebaseClient = {
  /**
   * 檢查 Firebase 是否已配置
   */
  isConfigured() {
    return !!(config.apiKey && config.databaseURL);
  },

  /**
   * 設定資料到 Firebase
   */
  async setData(path, data) {
    return await dbSet(path, data);
  },

  /**
   * 從 Firebase 獲取資料
   */
  async getData(path) {
    return await dbGet(path);
  },

  /**
   * 訂閱 Firebase 資料變化
   */
  subscribe(path, callback) {
    return dbSubscribe(path, callback);
  },

  /**
   * 監聽連接狀態變化
   * @param {Function} callback - 連接狀態變化回調函數
   * @returns {Function} 取消監聽的函數
   */
  onConnectionStateChange(callback) {
    if (!this.isConfigured()) {
      // 如果Firebase未配置，模擬斷開狀態
      setTimeout(() => callback(false), 100);
      return () => {};
    }

    const database = initFirebase();
    if (!database) {
      // 如果數據庫初始化失敗，模擬斷開狀態
      setTimeout(() => callback(false), 100);
      return () => {};
    }

    try {
      const connectedRef = ref(database, '.info/connected');
      const unsubscribe = onValue(connectedRef, (snapshot) => {
        const connected = snapshot.val() === true;
        callback(connected);
      }, (error) => {
        console.warn('[Firebase] Connection state listener error:', error.message);
        // 發生錯誤時，報告為斷開狀態
        callback(false);
      });

      return unsubscribe;
    } catch (error) {
      console.warn('[Firebase] Failed to setup connection listener:', error.message);
      // 設置監聽器失敗時，模擬斷開狀態
      setTimeout(() => callback(false), 100);
      return () => {};
    }
  },

  /**
   * 初始化 Firebase
   */
  init() {
    return initFirebase();
  }
};