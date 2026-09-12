import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Initialize OneSignal dynamically from Environment Variable
const onesignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;
if (typeof window !== "undefined" && onesignalAppId) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.init({
        appId: onesignalAppId,
      });
    } catch (err) {
      console.warn("OneSignal initialization error:", err);
    }
  });
} else if (!onesignalAppId) {
  console.info("OneSignal App ID not found in environment (VITE_ONESIGNAL_APP_ID). Push notifications disabled until configured.");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
