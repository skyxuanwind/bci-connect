// Firebase 連接診斷腳本
require('dotenv').config();

console.log('=== Firebase 連接診斷 ===');
console.log('環境變數檢查:');
console.log('REACT_APP_FIREBASE_API_KEY:', !!process.env.REACT_APP_FIREBASE_API_KEY);
console.log('REACT_APP_FIREBASE_DB_URL:', !!process.env.REACT_APP_FIREBASE_DB_URL);
console.log('REACT_APP_FIREBASE_PROJECT_ID:', !!process.env.REACT_APP_FIREBASE_PROJECT_ID);

if (process.env.REACT_APP_FIREBASE_DB_URL) {
  console.log('Database URL:', process.env.REACT_APP_FIREBASE_DB_URL);
}

// 測試 Firebase 初始化
try {
  const { initializeApp } = require('firebase/app');
  const { getDatabase, ref, get } = require('firebase/database');
  
  const config = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DB_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };

  console.log('\n=== Firebase 初始化測試 ===');
  const app = initializeApp(config);
  console.log('Firebase app 初始化成功');
  
  const db = getDatabase(app);
  console.log('Firebase database 初始化成功');
  
  // 測試連接
  console.log('\n=== 連接測試 ===');
  const testRef = ref(db, '.info/connected');
  get(testRef).then((snapshot) => {
    console.log('連接狀態:', snapshot.val());
  }).catch((error) => {
    console.error('連接測試失敗:', error.message);
  });
  
} catch (error) {
  console.error('Firebase 初始化失敗:', error.message);
}