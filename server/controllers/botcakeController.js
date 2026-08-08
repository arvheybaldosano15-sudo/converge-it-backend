const { query } = require('../config/database');
const { classifyAndGenerateTicket } = require('../services/aiService');
const { sendBotcakeMessage, updateBotcakeCustomerField } = require('../services/botcakeService');
const { sendTextMessage } = require('../services/messengerService');
const { emitToAdmins } = require('../services/socketService');
const logger = require('../config/logger');

// GET /api/botcake/webhook - Verify webhook endpoint
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'] || req.query['mode'];
  const token = req.query['hub.verify_token'] || req.query['verify_token'];
  const challenge = req.query['hub.challenge'] || req.query['challenge'];

  const expectedToken = process.env.BOTCAKE_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || 'converge_webhook_verify_token_2024';

  if (token === expectedToken) {
    logger.info('Botcake webhook verified');
    return res.status(200).send(challenge || 'VERIFIED');
  }
  res.status(403).json({ error: 'Invalid verify token' });
};

// GET /api/botcake/verify?account_number=ACC-XXXXXX - Verify account number from Botcake flow
exports.verifyAccountNumber = async (req, res) => {
  try {
    let rawAcc = req.query.account_number || req.query.account || req.query.acc || req.query.text || req.body?.account_number || req.body?.text || '';

    logger.info(`🔍 Botcake requested verify with query:`, JSON.stringify(req.query));

    let accNum = String(rawAcc).replace(/.*?\/\//, '').replace(/[\{\}\"\']/g, '').trim();
    let digitsOnly = accNum.replace(/\D/g, '');

    if (!accNum) {
      logger.warn(`⚠️ Invalid or empty account number received: "${rawAcc}"`);
      return res.status(404).json({ success: false, found: false, found_str: "false", status: "not_found", message: 'Account number is required.' });
    }

    const result = await query(
      `SELECT id, full_name, account_number, contact_number FROM customers
       WHERE LOWER(account_number) = LOWER($1)
          OR LOWER(account_number) = LOWER('ACC-' || $1)
          OR LOWER(account_number) = LOWER(REPLACE($1, 'ACC-', ''))
          OR ($2 != '' AND (REPLACE(LOWER(account_number), 'acc-', '') = $2 OR account_number = $2))
       LIMIT 1`,
      [accNum, digitsOnly]
    );

    if (result.rows.length === 0) {
      logger.warn(`❌ Account number not found in DB: "${accNum}" (digits: "${digitsOnly}")`);
      return res.status(404).json({ success: false, found: false, found_str: "false", status: "not_found", message: 'Account number not found in the system.' });
    }

    const customer = result.rows[0];
    logger.info(`✅ Account number verified for customer: "${customer.full_name}" (${customer.account_number})`);
    return res.status(200).json({
      success: true,
      found: true,
      found_str: "true",
      status: "found",
      customer: {
        id: customer.id,
        name: customer.full_name,
        account_number: customer.account_number,
        contact_number: customer.contact_number
      }
    });
  } catch (err) {
    logger.error('Account verification error:', err);
    return res.status(500).json({ success: false, found: false, found_str: "false", status: "error", message: 'Server error during verification.' });
  }
};

// POST /api/botcake/webhook - Handle incoming Botcake AI webhook events
exports.handleWebhook = async (req, res) => {
  res.status(200).json({ status: 'success' }); // Respond immediately to Botcake

  try {
    const payload = req.body;
    logger.info('Botcake Webhook Event received:', JSON.stringify(payload).substring(0, 200));

    const psid = payload.psid || payload.subscriber?.id || payload.sender?.id || payload.entry?.[0]?.messaging?.[0]?.sender?.id;
    const messageText = payload.text || payload.message?.text || payload.entry?.[0]?.messaging?.[0]?.message?.text;

    if (!psid || !messageText) return;

    let custResult = await query('SELECT * FROM customers WHERE messenger_psid = $1', [psid]);
    let customer = custResult.rows[0];

    if (!customer) {
      const cleanMsg = messageText.trim();
      const digitsOnly = cleanMsg.replace(/\D/g, '');

      const matchResult = await query(
        `SELECT * FROM customers
         WHERE LOWER(account_number) = LOWER($1)
            OR LOWER(account_number) = LOWER('ACC-' || $1)
            OR LOWER(account_number) = LOWER(REPLACE($1, 'ACC-', ''))
            OR ($2 != '' AND (REPLACE(LOWER(account_number), 'acc-', '') = $2 OR account_number = $2))
         LIMIT 1`,
        [cleanMsg, digitsOnly]
      );
      let matchedCustomer = matchResult.rows[0];

      if (matchedCustomer) {
        // Link the existing customer's messenger_psid
        await query('UPDATE customers SET messenger_psid = $1 WHERE id = $2', [psid, matchedCustomer.id]);
        
        const replyText = `✅ Account linked successfully!\n\nHello, ${matchedCustomer.full_name}. Your Messenger account has been linked to Account Number: ${matchedCustomer.account_number}.\n\nPlease describe your concern (e.g. internet issue, installation request) and I will generate a support ticket for you.`;
        
        try {
          await sendBotcakeMessage(psid, replyText);
        } catch (err) {
          await sendTextMessage(psid, replyText).catch(() => {});
        }
        return;
      } else {
        // No customer found, and no valid account number provided
        const replyText = `❌ Account not found.\n\nWe couldn't find a customer record matching "${messageText}".\n\nPlease reply with your registered Account Number (e.g. ACC-123456) to link your Messenger profile and request support.`;
        
        try {
          await sendBotcakeMessage(psid, replyText);
        } catch (err) {
          await sendTextMessage(psid, replyText).catch(() => {});
        }
        return;
      }
    }

    // Customer is found & linked -> Auto-generate ticket using AI
    logger.info(`Generating ticket for customer "${customer.full_name}"...`);
    const aiResult = await classifyAndGenerateTicket(messageText, customer);

    const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket = await query(
      `INSERT INTO tickets (
        ticket_number, customer_id, service_category_id, subject, description,
        priority, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open', NOW(), NOW())
      RETURNING *`,
      [
        ticketNumber,
        customer.id,
        aiResult.category_id || null,
        aiResult.title || 'Support Request via Messenger',
        messageText,
        aiResult.priority || 'medium'
      ]
    );

    const createdTicket = newTicket.rows[0];
    logger.info(`Ticket created: ${createdTicket.ticket_number}`);

    // Emit real-time socket event to Admin Dashboard
    emitToAdmins('ticket_created', {
      ticket: createdTicket,
      customer: customer,
      message: 'New ticket generated automatically via Messenger'
    });

    const replyMsg = `🤖 Support Ticket Generated!\n\n📋 Ticket Number: ${createdTicket.ticket_number}\n📌 Category: ${aiResult.category_name || 'General Support'}\n⚡ Priority: ${(aiResult.priority || 'medium').toUpperCase()}\n⏱️ Estimated Resolution: ${aiResult.eta_hours || 24} hours\n\nOur team has received your request and a technician will be assigned shortly.`;

    try {
      await sendBotcakeMessage(psid, replyMsg);
    } catch (err) {
      await sendTextMessage(psid, replyMsg).catch(() => {});
    }

  } catch (error) {
    logger.error('Error handling Botcake webhook:', error);
  }
};
