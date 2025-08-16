import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './config/axios'; // 導入axios配置

// Comprehensive error suppression for browser extensions and third-party scripts
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || event.message || '';
  const errorSource = event.filename || '';
  
  // Suppress MetaMask and other browser extension errors
  if (errorMessage.includes('MetaMask') || 
      errorMessage.includes('ethereum') ||
      errorMessage.includes('web3') ||
      errorSource.includes('extension://') ||
      errorSource.includes('chrome-extension://') ||
      errorSource.includes('moz-extension://')) {
    console.warn('Browser extension error suppressed:', errorMessage);
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonMessage = reason?.message || reason?.toString() || '';
  
  // Suppress MetaMask and other browser extension promise rejections
  if (reasonMessage.includes('MetaMask') ||
      reasonMessage.includes('ethereum') ||
      reasonMessage.includes('web3') ||
      reasonMessage.includes('extension not found') ||
      reasonMessage.includes('Failed to connect')) {
    console.warn('Browser extension promise rejection suppressed:', reasonMessage);
    event.preventDefault();
    return false;
  }
});

// Prevent any accidental ethereum provider access
if (typeof window !== 'undefined') {
  // Override ethereum provider to prevent unwanted connections
  Object.defineProperty(window, 'ethereum', {
    get: function() {
      console.warn('Ethereum provider access blocked - not needed for this application');
      return undefined;
    },
    configurable: true
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#0D253F',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(13, 37, 63, 0.1), 0 2px 4px -1px rgba(13, 37, 63, 0.06)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);