const axios = require('axios');
const logger = require('../config/logger');

const BOTCAKE_API_URL = process.env.BOTCAKE_API_URL || 'https://botcake.io/api/v1';

/**
 * Send a text message back to a customer via Botcake API
 */
exports.sendBotcakeMessage = async (psid, text) => {
  const pageId = process.env.BOTCAKE_PAGE_ID;
  const apiKey = process.env.BOTCAKE_PLATFORM_KEY || process.env.BOTCAKE_API_KEY;

  if (!apiKey || !pageId) {
    logger.warn('Botcake API key or Page ID missing in .env - falling back to direct Meta Messenger API');
    return null;
  }

  try {
    const response = await axios.post(
      `${BOTCAKE_API_URL}/pages/${pageId}/messages`,
      {
        recipient: { id: psid },
        message: { text }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    logger.error('Botcake API message error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Update custom attribute / field on Botcake customer profile (e.g. ticket number, priority)
 */
exports.updateBotcakeCustomerField = async (psid, fields) => {
  const pageId = process.env.BOTCAKE_PAGE_ID;
  const apiKey = process.env.BOTCAKE_PLATFORM_KEY || process.env.BOTCAKE_API_KEY;

  if (!apiKey || !pageId) return null;

  try {
    const response = await axios.post(
      `${BOTCAKE_API_URL}/pages/${pageId}/subscribers/${psid}/custom_fields`,
      { fields },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    logger.error('Botcake update customer field error:', error.response?.data || error.message);
    return null;
  }
};
