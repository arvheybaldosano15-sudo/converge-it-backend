const axios = require('axios');
const logger = require('../config/logger');

const META_API_VERSION = process.env.META_API_VERSION || 'v19.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const sendMessage = async (recipientId, message) => {
  if (!process.env.META_PAGE_ACCESS_TOKEN) {
    logger.warn('META_PAGE_ACCESS_TOKEN not set - skipping Messenger send');
    return null;
  }
  try {
    const response = await axios.post(
      `${BASE_URL}/me/messages`,
      { recipient: { id: recipientId }, message },
      { params: { access_token: process.env.META_PAGE_ACCESS_TOKEN } }
    );
    return response.data;
  } catch (error) {
    logger.error('Messenger send error:', error.response?.data || error.message);
    throw error;
  }
};

exports.sendTextMessage = async (recipientId, text) =>
  sendMessage(recipientId, { text });

exports.sendQuickReplies = async (recipientId, text, quickReplies) =>
  sendMessage(recipientId, {
    text,
    quick_replies: quickReplies.map(qr => ({
      content_type: 'text',
      title: qr.title,
      payload: qr.payload
    }))
  });

exports.sendTicketConfirmation = async (recipientId, ticket) =>
  sendMessage(recipientId, {
    text: `✅ Your support ticket has been created!\n\n📋 Ticket Number: ${ticket.ticket_number}\n📌 Category: ${ticket.categoryName}\n⚡ Priority: ${ticket.priority.toUpperCase()}\n⏱️ Estimated Resolution: ${ticket.ai_eta_hours ? ticket.ai_eta_hours + ' hours' : 'To be determined'}\n\nOur team will contact you shortly. Thank you for your patience!`
  });

exports.getUserProfile = async (userId) => {
  if (!process.env.META_PAGE_ACCESS_TOKEN) return null;
  try {
    const response = await axios.get(
      `${BASE_URL}/${userId}`,
      { params: { fields: 'first_name,last_name,profile_pic', access_token: process.env.META_PAGE_ACCESS_TOKEN } }
    );
    return response.data;
  } catch (error) {
    logger.error('Messenger getUserProfile error:', error.response?.data || error.message);
    return null;
  }
};
