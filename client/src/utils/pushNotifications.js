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
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push Notifications are not supported in this browser/environment.');
    return false;
  }

  try {
    // 1. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // 2. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('Notification permission denied by user.');
      return false;
    }

    // 3. Fetch VAPID Public Key from Backend
    const keyRes = await api.get('/notifications/vapid-key');
    if (!keyRes.success || !keyRes.publicKey) {
      console.warn('VAPID public key missing from server response.');
      return false;
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
    return true;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return false;
  }
};
