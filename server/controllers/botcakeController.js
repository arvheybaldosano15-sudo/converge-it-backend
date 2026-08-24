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
       WHERE TRIM(LOWER(account_number)) = TRIM(LOWER($1))
          OR TRIM(LOWER(account_number)) = TRIM(LOWER($2))
          OR TRIM(LOWER(account_number)) = TRIM(LOWER($3))
          OR TRIM(LOWER(account_number)) = TRIM(LOWER(REPLACE($1, 'ACC-', '')))
          OR ($4 != '' AND TRIM(REPLACE(LOWER(account_number), 'acc-', '')) = $4)
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
    recentVerifyRequests.push({
      ts: new Date().toISOString(),
      type: 'webhook',
      payload: payload
    });
    if (recentVerifyRequests.length > 20) recentVerifyRequests.shift();
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
    const aiResult = await classifyAndGenerateTicket([], messageText);

    // Map AI category slug to service_category UUID
    let categoryId = null;
    let categoryName = 'General Support';
    if (aiResult.category) {
      const catRes = await query(
        `SELECT id, name FROM service_categories 
         WHERE LOWER(name) ILIKE '%' || REPLACE($1, '_', ' ') || '%' 
         LIMIT 1`,
        [aiResult.category]
      );
      if (catRes.rows.length > 0) {
        categoryId = catRes.rows[0].id;
        categoryName = catRes.rows[0].name;
      }
    }
    if (!categoryId) {
      const defaultCat = await query(`SELECT id, name FROM service_categories LIMIT 1`);
      if (defaultCat.rows.length > 0) {
        categoryId = defaultCat.rows[0].id;
        categoryName = defaultCat.rows[0].name;
      }
    }

    const priorityVal = String(aiResult.priority || 'medium').toLowerCase();
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const priorityEnum = validPriorities.includes(priorityVal) ? priorityVal : 'medium';
    const subjectVal = aiResult.title || messageText.substring(0, 100) || 'Support Request via Messenger';
    const ticketNum = `TKT-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;

    let createdTicket;
    try {
      const newTicket = await query(
        `INSERT INTO tickets (
          ticket_number, customer_id, service_category_id, priority, status, subject, description, source, ai_priority_recommendation, ai_estimated_resolution_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [ticketNum, customer.id, categoryId, priorityEnum, 'open', subjectVal, messageText, 'messenger', priorityEnum, aiResult.etaHours || 24]
      );
      createdTicket = newTicket.rows[0];
    } catch (insertErr) {
      logger.error('handleWebhook ticket insert failed:', insertErr.message);
      throw insertErr;
    }

    logger.info(`✅ Ticket created successfully: ${createdTicket.ticket_number}`);

    // Emit real-time socket events to Admin Dashboard (ticket:created matches frontend listener)
    emitToAdmins('ticket:created', { ticket: createdTicket });
    emitToAdmins('ticket_created', { ticket: createdTicket });

    const replyMsg = `🤖 Support Ticket Generated!\n\n📋 Ticket Number: ${createdTicket.ticket_number}\n📌 Category: ${categoryName}\n⚡ Priority: ${(aiResult.priority || 'medium').toUpperCase()}\n⏱️ Estimated Resolution: ${aiResult.etaHours || 24} hours\n\nOur team has received your request and a technician will be assigned shortly.`;

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
  // Log EVERYTHING so we can debug what Botcake sends
  const debugEntry = {
    ts: new Date().toISOString(),
    method: req.method,
    query: req.query,
    body: req.body,
    headers: {
      'x-api-key': req.headers['x-api-key'],
      'content-type': req.headers['content-type'],
    }
  };
  recentVerifyRequests.push(debugEntry);
  if (recentVerifyRequests.length > 20) recentVerifyRequests.shift();
  logger.info('verify-and-broadcast hit:', JSON.stringify(debugEntry));

  try {
    // Normalize query params (handle leading whitespace from Botcake templates)
    const normalizedQuery = {};
    for (const k of Object.keys(req.query || {})) {
      normalizedQuery[k.trim()] = req.query[k];
    }
    // Also normalize body keys
    const normalizedBody = {};
    for (const k of Object.keys(req.body || {})) {
      normalizedBody[k.trim()] = req.body[k];
    }

    const subscriberId = normalizedQuery.subscriber_id || normalizedBody.subscriber_id || '';
    let rawAcc = normalizedQuery.account_number || normalizedBody.account_number || normalizedBody.text || '';
    if (Array.isArray(rawAcc)) rawAcc = rawAcc[0];

    logger.info(`🔍 verify-and-broadcast: subscriber=${subscriberId} acc=${rawAcc}`);

    // Strip Botcake template tags like {{390234//account_number}}
    let accNum = String(rawAcc)
      .replace(/\{\{[^}]*?\/\//g, '')
      .replace(/[\{\}\"\']/g, '')
      .trim();
    let digitsOnly = String(rawAcc).replace(/\D/g, '');
    let withPrefix = `ACC-${digitsOnly}`;

    if (!accNum && !digitsOnly) {
      return res.status(200).json({
        success: false, found: false, found_str: 'false',
        found_account: 'not_found', status: 'not_found',
        message: 'Account number is required.'
      });
    }

    logger.info(`🔍 DB search in verifyAndBroadcast for accNum="${accNum}", digits="${digitsOnly}", withPrefix="${withPrefix}"`);

    const result = await query(
      `SELECT id, full_name, account_number, contact_number FROM customers
       WHERE TRIM(LOWER(account_number)) = TRIM(LOWER($1))
          OR TRIM(LOWER(account_number)) = TRIM(LOWER($2))
          OR TRIM(LOWER(account_number)) = TRIM(LOWER($3))
          OR TRIM(LOWER(account_number)) = TRIM(LOWER(REPLACE($1, 'ACC-', '')))
          OR ($4 != '' AND TRIM(REPLACE(LOWER(account_number), 'acc-', '')) = $4)
       LIMIT 1`,
      [accNum, withPrefix, digitsOnly, digitsOnly]
    );

    if (result.rows.length === 0) {
      logger.warn(`❌ verify-and-broadcast: account not found in DB for rawAcc="${rawAcc}" accNum="${accNum}" digits="${digitsOnly}"`);
      
      const notFoundText = `❌ Invalid account number.\nPlease check your account number and try again.`;

      // Direct message reply to subscriber if subscriberId is available
      if (subscriberId) {
        try {
          await sendBotcakeMessage(subscriberId, notFoundText);
        } catch (msgErr) {
          await sendTextMessage(subscriberId, notFoundText).catch(() => {});
        }
      }

      return res.status(200).json({
        success: false, found: false, found_str: 'false',
        found_account: 'not_found', status: 'not_found',
        message: 'Invalid account number.',
        reply_message: notFoundText,
        messages: [{ text: notFoundText }]
      });
    }

    const customer = result.rows[0];
    logger.info(`✅ verify-and-broadcast: found "${customer.full_name}" (${customer.account_number})`);

    const verifiedPromptText = `✅ Account Number Verified!\n\nTo create a support ticket, please send the following information in one message:\n\nName:\nContact Number:\nAddress:\nLandmark:\nProblem:`;

    // Auto-link messenger_psid if subscriberId is passed
    if (subscriberId) {
      try {
        await query('UPDATE customers SET messenger_psid = $1 WHERE id = $2', [subscriberId, customer.id]);
        logger.info(`🔗 Auto-linked subscriber ${subscriberId} to customer ${customer.full_name}`);
      } catch (linkErr) {
        logger.warn('Failed to auto-link subscriber PSID:', linkErr.message);
      }

      // Direct message reply matching user's requested verification prompt
      try {
        await sendBotcakeMessage(subscriberId, verifiedPromptText);
      } catch (msgErr) {
        await sendTextMessage(subscriberId, verifiedPromptText).catch(() => {});
      }
    }

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
      success: true,
      found: true,
      found_str: 'true',
      found_account: 'found',
      status: 'found',
      reply_message: verifiedPromptText,
      messages: [{ text: verifiedPromptText }],
      result: 'found',
      value: 'found',
      data: {
        status: 'found',
        found_account: 'found',
        found: true
      },
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

/**
 * GET/POST /api/botcake/create-ticket
 * Called by Botcake flow to generate an AI ticket from customer input.
 */
exports.createTicket = async (req, res) => {
  const debugEntry = {
    ts: new Date().toISOString(),
    type: 'create-ticket',
    query: req.query,
    body: req.body
  };
  recentVerifyRequests.push(debugEntry);
  if (recentVerifyRequests.length > 20) recentVerifyRequests.shift();

  try {
    const subscriberId = req.query.subscriber_id || req.body?.subscriber_id || req.query.psid || req.body?.psid || '';
    let concernText = req.query.concern || req.query.text || req.body?.concern || req.body?.text || '';
    const requestType = (req.query.request_type || req.body?.request_type || '').toLowerCase();

    logger.info(`🔍 createTicket hit: subscriberId="${subscriberId}", requestType="${requestType}", concern="${concernText}"`);

    if (!concernText) {
      return res.status(200).json({ success: false, message: 'Concern text is required.' });
    }

    if (!subscriberId) {
      return res.status(200).json({ success: false, message: 'Subscriber ID is required.' });
    }

    // Find customer ONLY by their specific messenger_psid
    let custResult = await query('SELECT * FROM customers WHERE messenger_psid = $1', [subscriberId]);
    let customer = custResult.rows[0];

    // Parse structured form fields first (needed for auto-create below)
    const nameMatch = concernText.match(/(?:Name|Full Name):\s*([^\n]+)/i);
    const phoneMatch = concernText.match(/(?:Contact Number|Contact|Phone):\s*([^\n]+)/i);
    const addressMatch = concernText.match(/(?:Address|Complete Address):\s*([^\n]+)/i);
    const landmarkMatch = concernText.match(/Landmark:\s*([^\n]+)/i);

    // Installation specific fields
    const installTypeMatch = concernText.match(/Type\s*of\s*Installation:\s*([^\n]+)/i);
    const installDateMatch = concernText.match(/Preferred\s*(?:Installation\s*)?Date:\s*([^\n]+)/i);
    const isInstallationRequest = requestType === 'installation' || concernText.toLowerCase().includes('installation request') || installTypeMatch;

    if (!customer) {
      if (!isInstallationRequest) {
        // Regular concerns still require a linked account
        return res.status(200).json({
          success: false,
          message: 'No linked customer found. Please verify your account number first.'
        });
      }

      // ✅ Installation Request: auto-create a new customer from form data
      logger.info(`🆕 Auto-creating new customer for installation request from PSID: ${subscriberId}`);
      const autoName = nameMatch ? nameMatch[1].trim() : 'New Customer';
      const autoPhone = phoneMatch ? phoneMatch[1].trim() : null;
      const autoAddress = addressMatch ? addressMatch[1].trim() : 'Not provided';
      const autoLandmark = landmarkMatch ? landmarkMatch[1].trim() : null;
      const autoAccNum = `ACC-${Date.now().toString().slice(-6)}`;

      try {
        const newCust = await query(
          `INSERT INTO customers (account_number, messenger_psid, full_name, complete_address, nearby_landmark, contact_number)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [autoAccNum, subscriberId, autoName, autoAddress, autoLandmark, autoPhone]
        );
        customer = newCust.rows[0];
        logger.info(`✅ Auto-created customer: ${autoName} (${autoAccNum})`);
      } catch (createErr) {
        logger.error('Failed to auto-create customer:', createErr.message);
        return res.status(200).json({ success: false, message: 'Failed to process your request. Please try again.' });
      }
    }

    const problemMatch = concernText.match(/Problem:\s*([\s\S]+)/i);

    let actualProblem = concernText;
    if (problemMatch) {
      actualProblem = problemMatch[1].trim();
    } else if (isInstallationRequest) {
      actualProblem = `Installation Request. Type: ${installTypeMatch ? installTypeMatch[1].trim() : 'Not specified'}. Preferred Date: ${installDateMatch ? installDateMatch[1].trim() : 'Not specified'}.`;
    }

    // Only update customer fields that are currently NULL/empty — never overwrite admin-verified data
    if (nameMatch || phoneMatch || addressMatch || landmarkMatch) {
      try {
        await query(
          `UPDATE customers SET 
             full_name = CASE WHEN (full_name IS NULL OR full_name = '') THEN $1 ELSE full_name END,
             contact_number = CASE WHEN (contact_number IS NULL OR contact_number = '') THEN $2 ELSE contact_number END,
             complete_address = CASE WHEN (complete_address IS NULL OR complete_address = '') THEN $3 ELSE complete_address END,
             nearby_landmark = CASE WHEN (nearby_landmark IS NULL OR nearby_landmark = '') THEN $4 ELSE nearby_landmark END,
             updated_at = NOW()
           WHERE id = $5`,
          [
            nameMatch ? nameMatch[1].trim() : null,
            phoneMatch ? phoneMatch[1].trim() : null,
            addressMatch ? addressMatch[1].trim() : null,
            landmarkMatch ? landmarkMatch[1].trim() : null,
            customer.id
          ]
        );
        logger.info(`✅ Updated customer fields for id=${customer.id}`);
      } catch (updateErr) {
        logger.warn('Customer update failed (non-critical):', updateErr.message);
      }
    }

    // AI Classification of the Problem
    const aiResult = await classifyAndGenerateTicket([], actualProblem);

    let categoryId = null;
    let categoryName = 'General Support';
    
    if (isInstallationRequest) {
      const catRes = await query(`SELECT id, name FROM service_categories WHERE name ILIKE '%Installation Request%' LIMIT 1`);
      if (catRes.rows.length > 0) {
        categoryId = catRes.rows[0].id;
        categoryName = catRes.rows[0].name;
      }
    }

    if (!categoryId && aiResult.category) {
      const catRes = await query(
        `SELECT id, name FROM service_categories 
         WHERE LOWER(name) ILIKE '%' || REPLACE($1, '_', ' ') || '%' 
         LIMIT 1`,
        [aiResult.category]
      );
      if (catRes.rows.length > 0) {
        categoryId = catRes.rows[0].id;
        categoryName = catRes.rows[0].name;
      }
    }
    if (!categoryId) {
      const defaultCat = await query(`SELECT id, name FROM service_categories LIMIT 1`);
      if (defaultCat.rows.length > 0) {
        categoryId = defaultCat.rows[0].id;
        categoryName = defaultCat.rows[0].name;
      }
    }

    const priorityVal = String(aiResult.priority || 'medium').toLowerCase();
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const priorityEnum = validPriorities.includes(priorityVal) ? priorityVal : 'medium';
    const subjectVal = isInstallationRequest 
      ? `Installation Request${installTypeMatch ? ' - ' + installTypeMatch[1].trim() : ''}`
      : (aiResult.title || concernText.substring(0, 100) || 'Support Request via Messenger');

    // Duplicate guard: if same customer already has an open ticket created in last 5 minutes, don't create another
    const recentCheck = await query(
      `SELECT * FROM tickets 
       WHERE customer_id = $1 
         AND status = 'open' 
         AND created_at > NOW() - INTERVAL '5 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [customer.id]
    );
    if (recentCheck.rows.length > 0) {
      const existingTicket = recentCheck.rows[0];
      logger.info(`⚠️ Duplicate ticket prevented for customer ${customer.id} — existing: ${existingTicket.ticket_number}`);
      const dupMsg = `✅ Your concern has already been submitted!\n\n📋 Ticket Number: ${existingTicket.ticket_number}\n\nOur team is already processing your request. Please wait for a technician to contact you.`;
      if (subscriberId) {
        try { await sendBotcakeMessage(subscriberId, dupMsg); } catch { await sendTextMessage(subscriberId, dupMsg).catch(() => {}); }
      }
      return res.status(200).json({ success: true, ticket_number: existingTicket.ticket_number, duplicate: true, reply_message: dupMsg, messages: [{ text: dupMsg }] });
    }

    const ticketNum = `TKT-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;

    let createdTicket;
    try {
      const newTicket = await query(
        `INSERT INTO tickets (
          ticket_number, customer_id, service_category_id, priority, status, subject, description, source, ai_priority_recommendation, ai_estimated_resolution_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [ticketNum, customer.id, categoryId, priorityEnum, 'open', subjectVal, concernText, 'messenger', priorityEnum, aiResult.etaHours || 24]
      );
      createdTicket = newTicket.rows[0];
    } catch (insertErr) {
      logger.error('Ticket insert failed:', insertErr.message);
      logger.error('Insert error details:', JSON.stringify({ code: insertErr.code, detail: insertErr.detail, constraint: insertErr.constraint }));
      throw insertErr;
    }

    logger.info(`✅ Ticket created successfully via endpoint: ${createdTicket.ticket_number}`);

    // Emit real-time socket events to Admin Dashboard
    emitToAdmins('ticket:created', { ticket: createdTicket });
    emitToAdmins('ticket_created', { ticket: createdTicket });

    const replyMsg = `🤖 Support Ticket Generated!\n\n📋 Ticket Number: ${createdTicket.ticket_number}\n📌 Category: ${categoryName}\n⚡ Priority: ${priorityEnum.toUpperCase()}\n⏱️ Estimated Resolution: ${aiResult.etaHours || 24} hours\n\nOur team has received your request and a technician will be assigned shortly.`;

    // Try sending directly to Messenger if keys exist
    if (subscriberId) {
      try {
        await sendBotcakeMessage(subscriberId, replyMsg);
      } catch (err) {
        await sendTextMessage(subscriberId, replyMsg).catch(() => {});
      }
    }

    return res.status(200).json({
      success: true,
      ticket_number: createdTicket.ticket_number,
      category: categoryName,
      priority: createdTicket.priority,
      customer_name: customer.full_name,
      reply_message: replyMsg,
      messages: [{ text: replyMsg }]
    });
  } catch (err) {
    logger.error('createTicket endpoint error:', err.message);
    logger.error('Full error:', JSON.stringify({ code: err.code, detail: err.detail, constraint: err.constraint, stack: err.stack?.substring(0, 500) }));
    return res.status(200).json({ success: false, message: 'Server error creating ticket: ' + err.message });
  }
};

/**
 * GET /api/botcake/test-db
 * Diagnostic: test DB connection and check tickets table columns
 */
exports.testDb = async (req, res) => {
  const result = {};
  try {
    const cols = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tickets' ORDER BY ordinal_position`);
    result.tickets_columns = cols.rows;
  } catch (err) {
    result.tickets_columns_error = err.message;
  }

  try {
    const custCols = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'customers' ORDER BY ordinal_position`);
    result.customers_columns = custCols.rows;
  } catch (err) {
    result.customers_columns_error = err.message;
  }

  try {
    const recentTickets = await query('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 5');
    result.recent_tickets = recentTickets.rows;
  } catch (err) {
    result.recent_tickets_error = err.message;
  }

  try {
    const recentCust = await query('SELECT * FROM customers ORDER BY created_at DESC LIMIT 5');
    result.recent_customers = recentCust.rows;
  } catch (err) {
    result.recent_customers_error = err.message;
  }

  try {
    const triggers = await query(`
      SELECT trigger_name, event_manipulation, action_statement, action_orientation 
      FROM information_schema.triggers 
      WHERE event_object_table = 'tickets'
    `);
    result.tickets_triggers = triggers.rows;
  } catch (err) {
    result.tickets_triggers_error = err.message;
  }

  return res.json(result);
};
