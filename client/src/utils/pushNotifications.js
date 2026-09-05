import api from './axios';

// Helper to convert base64 VAPID public key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Register Service Worker and subscribe user to Web Push
export const initPushNotifications = async () => {
  if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.warn('Web Push API requires HTTPS or localhost.');
    return { 
      success: false, 
      reason: 'insecure_origin', 
      error: 'Web Push requires HTTPS (e.g. https://domain.com). On HTTP, local WebSocket alerts will still trigger phone banners.' 
    };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push Notifications are not supported in this browser/environment.');
    return { 
      success: false, 
      reason: 'unsupported', 
      error: 'PushManager is not supported on this mobile browser/WebView.' 
    };
  }

  try {
    // 1. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // 2. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('Notification permission denied by user or Android OS settings.');
      return { success: false, reason: 'denied', permission, error: 'Notification permission was denied.' };
    }

    // 3. Fetch VAPID Public Key from Backend
    const keyRes = await api.get('/notifications/vapid-key');
    if (!keyRes.success || !keyRes.publicKey) {
      console.warn('VAPID public key missing from server response.');
      return { success: false, reason: 'missing_key', error: 'VAPID public key is missing on the backend server.' };
    }

    const applicationServerKey = urlBase64ToUint8Array(keyRes.publicKey);

    // 4. Get existing or subscribe new PushSubscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // 5. Send subscription object to backend database
    const subJSON = subscription.toJSON();
    await api.post('/notifications/subscribe', subJSON);
    console.log('✅ Mobile push subscription registered successfully');

    return { success: true, registration, subscription };
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return { success: false, reason: 'error', error: error.message || 'Push subscription error' };
  }
};

// Trigger instant local test notification on phone
export const testLocalNotification = async () => {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    if (Notification.permission === 'granted') {
      await registration.showNotification('📋 Real Mobile Push Alert', {
        body: 'Success! Your mobile phone lock-screen push notifications are working for MTS-Converge.',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [300, 100, 300, 100, 300],
        tag: 'test-push-' + Date.now(),
        renotify: true,
        requireInteraction: true,
        data: { url: '/technician/assigned' }
      });
      return true;
    }
  } catch (e) {
    console.error(e);
  }
  return false;
};
