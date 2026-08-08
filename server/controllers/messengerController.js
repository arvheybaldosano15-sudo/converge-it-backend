const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

exports.verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

exports.handleWebhook = async (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    try {
      for (const entry of body.entry) {
        const webhookEvent = entry.messaging[0];
        const senderPsid = webhookEvent.sender.id;
        
        let customer = await query('SELECT * FROM customers WHERE messenger_psid = $1', [senderPsid]);
        let customerId;
        
        if (!customer.rows[0]) {
          const newCust = await query('INSERT INTO customers (messenger_psid, complete_address) VALUES ($1, $2) RETURNING id', [senderPsid, 'Unknown Address']);
          customerId = newCust.rows[0].id;
        } else {
          customerId = customer.rows[0].id;
        }

        const rawPayload = JSON.stringify(webhookEvent);
        await query('INSERT INTO messenger_submissions (customer_id, raw_payload, ip_address) VALUES ($1, $2, $3)', [customerId, rawPayload, req.ip || null]);
      }
      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(404);
  }
};

exports.getConversations = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT c.id, c.messenger_psid, c.complete_address, MAX(ms.submitted_at) as last_message_at
      FROM customers c
      JOIN messenger_submissions ms ON c.id = ms.customer_id
      GROUP BY c.id, c.messenger_psid, c.complete_address
      ORDER BY last_message_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

exports.getConversationMessages = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT * FROM messenger_submissions 
      WHERE customer_id = $1 
      ORDER BY submitted_at ASC
    `, [req.params.customerId]);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    // Just return success for now
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) { next(error); }
};
