const { query } = require('../config/database');
const { classifyAndGenerateTicket } = require('../services/aiService');
const { sendBotcakeMessage, updateBotcakeCustomerField } = require('../services/botcakeService');
const { sendTextMessage } = require('../services/messengerService');
const { emitToAdmins } = require('../services/socketService');
const logger = require('../config/logger');

// Recent request log buffer for debugging live Botcake requests
const recentVerifyRequests = [];

/**
 * Middleware: Validate x-api-key header sent by Botcake to our server.
 * The key in Botcake flow must match BOTCAKE_INCOMING_API_KEY in .env.
 */
exports.validateIncomingApiKey = (req, res, next) => {
  const expectedKey = process.env.BOTCAKE_INCOMING_API_KEY || 'converge_botcake_2026';
  const receivedKey = req.headers['x-api-key'];
  if (!receivedKey || receivedKey !== expectedKey) {
    logger.warn(`❌ Invalid x-api-key from Botcake: "${receivedKey}"`);
    return res.status(401).json({ success: false, message: 'Unauthorized: invalid x-api-key' });
  }
  next();
};

// GET /api/botcake/debug-logs
exports.getDebugLogs = (req, res) => {
  res.json({ count: recentVerifyRequests.length, logs: recentVerifyRequests.reverse() });
};

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
    // Normalize query object by trimming whitespace from all key names
    const normalizedQuery = {};
    if (req.query) {
      for (const k of Object.keys(req.query)) {
        normalizedQuery[k.trim()] = req.query[k];
      }
    }

    // Handle duplicate params or params with leading spaces
    let rawAccRaw = normalizedQuery.account_number || normalizedQuery.account || normalizedQuery.acc || normalizedQuery.text || req.body?.account_number || req.body?.text || '';
    // If Express parsed it as an array (param sent twice), take the first value
    let rawAcc = Array.isArray(rawAccRaw) ? rawAccRaw[0] : rawAccRaw;

    // Push to debug log buffer
    recentVerifyRequests.push({
      timestamp: new Date().toISOString(),
      rawQuery: req.query,
      normalizedQuery: normalizedQuery,
      body: req.body,
      rawAcc: rawAcc,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    if (recentVerifyRequests.length > 50) recentVerifyRequests.shift();

    logger.info(`🔍 Botcake requested verify with raw query:`, JSON.stringify(req.query));
    logger.info(`🔍 Normalized query:`, JSON.stringify(normalizedQuery));
    logger.info(`🔍 Raw account value received: "${rawAcc}"`);

    // Strip Botcake template tags like {{390234//account_number}} or {{390234//11114}}
    let accNum = String(rawAcc)
      .replace(/\{\{[^}]*?\/\//g, '')   // strip {{...//
      .replace(/[\{\}\"\']/g, '')        // strip remaining brackets/quotes
      .trim();

    let digitsOnly = String(rawAcc).replace(/\D/g, '');

    if (!accNum && !digitsOnly) {
      logger.warn(`⚠️ Invalid or empty account number received: "${rawAcc}"`);
      return res.status(200).json({ success: false, found: false, found_str: "false", found_account: "not_found", status: "not_found", message: 'Account number is required.' });
    }

    logger.info(`🔍 Querying DB for accNum: "${accNum}", digitsOnly: "${digitsOnly}"`);

    const withPrefix = `ACC-${digitsOnly}`;
    const result = await query(
      `SELECT id, full_name, account_number, contact_number FROM customers
       WHERE LOWER(account_number) = LOWER($1)
          OR LOWER(account_number) = LOWER($2)
          OR LOWER(account_number) = LOWER($3)
          OR LOWER(account_number) = LOWER(REPLACE($1, 'ACC-', ''))
          OR ($4 != '' AND (
               REPLACE(LOWER(account_number), 'acc-', '') = $4
               OR LOWER(account_number) ILIKE '%' || $4 || '%'
          ))
       LIMIT 1`,
      [accNum, withPrefix, digitsOnly, digitsOnly]
    );

    if (result.rows.length === 0) {
      logger.warn(`❌ Account number not found in DB: "${accNum}" (digits: "${digitsOnly}")`);
      return res.status(200).json({ success: false, found: false, found_str: "false", found_account: "not_found", status: "not_found", message: 'Account number not found in the system.' });
    }

    const customer = result.rows[0];
    logger.info(`✅ Account number verified for customer: "${customer.full_name}" (${customer.account_number})`);
    return res.status(200).json({
      success: true,
      found: true,
      found_str: "true",
      found_account: "found",
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
      // Extract only digits for flexible matching (e.g. user types "11114" → matches "ACC-11114")
      const digitsOnly = cleanMsg.replace(/\D/g, '');
      // Also build the ACC- prefixed form
      const withPrefix = `ACC-${digitsOnly}`;

      const matchResult = await query(
        `SELECT * FROM customers
         WHERE LOWER(account_number) = LOWER($1)
            OR LOWER(account_number) = LOWER($2)
            OR LOWER(account_number) = LOWER($3)
            OR LOWER(account_number) = LOWER(REPLACE($1, 'ACC-', ''))
            OR ($4 != '' AND (
                 REPLACE(LOWER(account_number), 'acc-', '') = $4
                 OR LOWER(account_number) ILIKE '%' || $4 || '%'
            ))
         LIMIT 1`,
        [cleanMsg, withPrefix, digitsOnly, digitsOnly]
      );
      let matchedCustomer = matchResult.rows[0];

      if (matchedCustomer) {
        // Link the existing customer's messenger_psid
        await query('UPDATE customers SET messenger_psid = $1 WHERE id = $2', [psid, matchedCustomer.id]);
        const replyText = `✅ Account linked successfully!\n\nHello, ${matchedCustomer.full_name}! 👋\nYour Messenger has been linked to Account Number: ${matchedCustomer.account_number}.\n\nPlease describe your concern (e.g. internet issue, installation request) and I will create a support ticket for you.`;
        try {
          await sendBotcakeMessage(psid, replyText);
        } catch (err) {
          await sendTextMessage(psid, replyText).catch(() => {});
        }
        return;
      } else {
        // Not found — give helpful message with expected format
        const replyText = `❌ Account Number Not Found\n\nWe couldn't find an account matching "${messageText}" in our system.\n\n📌 Please make sure you enter the correct Account Number:\n   • Format: ACC-XXXXX (e.g. ACC-11114)\n   • Or just the numbers: 11114\n\nIf you're a new customer, please contact us directly to register.`;
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

/**
 * POST /api/botcake/verify-and-broadcast
 * Called by Botcake flow to verify an account number and broadcast the result
 * to the admin dashboard in real-time via socket.
 * Requires x-api-key header matching BOTCAKE_INCOMING_API_KEY.
 */
exports.verifyAndBroadcast = async (req, res) => {
  try {
    // Normalize query params (handle leading whitespace from Botcake templates)
    const normalizedQuery = {};
    for (const k of Object.keys(req.query || {})) {
      normalizedQuery[k.trim()] = req.query[k];
    }

    const subscriberId = normalizedQuery.subscriber_id || req.body?.subscriber_id || '';
    let rawAcc = normalizedQuery.account_number || req.body?.account_number || req.body?.text || '';
    if (Array.isArray(rawAcc)) rawAcc = rawAcc[0];

    logger.info(`🔍 verify-and-broadcast: subscriber=${subscriberId} acc=${rawAcc}`);

    // Strip Botcake template tags like {{390234//account_number}}
    let accNum = String(rawAcc)
      .replace(/\{\{[^}]*?\/\//g, '')
      .replace(/[\{\}\"\']/g, '')
      .trim();
    let digitsOnly = String(rawAcc).replace(/\D/g, '');

    if (!accNum && !digitsOnly) {
      return res.status(200).json({
        success: false, found: false, found_str: 'false',
        found_account: 'not_found', status: 'not_found',
        message: 'Account number is required.'
      });
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
      logger.warn(`❌ verify-and-broadcast: account not found "${accNum}"`);
      return res.status(200).json({
        success: false, found: false, found_str: 'false',
        found_account: 'not_found', status: 'not_found',
        message: 'Account number not found.'
      });
    }

    const customer = result.rows[0];
    logger.info(`✅ verify-and-broadcast: found "${customer.full_name}" (${customer.account_number})`);

    // Broadcast to admin dashboard via socket
    emitToAdmins('botcake:account_verified', {
      subscriber_id: subscriberId,
      customer: {
        id: customer.id,
        name: customer.full_name,
        account_number: customer.account_number,
        contact_number: customer.contact_number
      }
    });

    return res.status(200).json({
      success: true, found: true, found_str: 'true',
      found_account: 'found', status: 'found',
      customer: {
        id: customer.id,
        name: customer.full_name,
        account_number: customer.account_number,
        contact_number: customer.contact_number
      }
    });
  } catch (err) {
    logger.error('verify-and-broadcast error:', err);
    return res.status(500).json({ success: false, status: 'error', message: 'Server error.' });
  }
};
