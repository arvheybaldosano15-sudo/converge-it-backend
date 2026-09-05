const webpush = require('web-push');
const { query } = require('../config/database');
const logger = require('../config/logger');

// Initialize Web Push VAPID credentials
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:support@convergeit.com';

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    logger.info('✅ Web Push VAPID initialized successfully');
  } catch (err) {
    logger.error('Failed to initialize Web Push VAPID:', err.message);
  }
} else {
  logger.warn('Web Push VAPID keys missing in environment variables');
}

exports.getPublicKey = () => publicKey;

// Save or update push subscription for a user
exports.saveSubscription = async (userId, subscription, userAgent = '') => {
  try {
    const { endpoint, keys } = subscription;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      throw new Error('Invalid subscription object');
    }

    const result = await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (endpoint) 
       DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent, updated_at = NOW()
       RETURNING *`,
      [userId, endpoint, keys.p256dh, keys.auth, userAgent]
    );

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to save push subscription:', error.message);
    throw error;
  }
};

// Send real mobile push notification to a specific user
exports.sendPushToUser = async (userId, payload) => {
  if (!publicKey || !privateKey) return;
  try {
    const res = await query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
    const subscriptions = res.rows || [];

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title || 'Converge IT Notification',
      body: payload.body || payload.message || '',
      icon: payload.icon || '/logo.png',
      badge: '/logo.png',
      url: payload.url || '/admin/tickets',
      data: payload.data || {},
      timestamp: Date.now()
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayload, {
          TTL: 86400,
          urgency: 'high',
          headers: {
            'Urgency': 'high'
          }
        });
      } catch (err) {
        // Clean up expired or unregistered subscriptions (404 Not Found / 410 Gone)
        if (err.statusCode === 404 || err.statusCode === 410) {
          logger.info(`Cleaning up expired push subscription: ${sub.id}`);
          await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]).catch(() => {});
        } else {
          logger.warn(`Push notification failed for subscription ${sub.id}:`, err.message);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    logger.error('Failed to send push notification to user:', error.message);
  }
};

// Send push notification to all active admins
exports.sendPushToAdmins = async (payload) => {
  try {
    const adminRes = await query("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
    const admins = adminRes.rows || [];
    for (const admin of admins) {
      await exports.sendPushToUser(admin.id, payload);
    }
  } catch (error) {
    logger.error('Failed to send push to admins:', error.message);
  }
};
