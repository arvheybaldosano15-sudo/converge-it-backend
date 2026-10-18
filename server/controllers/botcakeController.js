const { query } = require('../config/database');
const { classifyAndGenerateTicket } = require('../services/aiService');
const { sendBotcakeMessage, updateBotcakeCustomerField } = require('../services/botcakeService');
const { sendTextMessage } = require('../services/messengerService');
const { emitToAdmins, emitToAll, emitToUser } = require('../services/socketService');
const { notifyAdmins } = require('../services/notificationService');
const logger = require('../config/logger');

const fetchFullTicket = async (ticketId) => {
  try {
    const res = await query(
      `SELECT t.*, c.full_name AS customer_name, c.contact_number AS customer_contact,
              c.complete_address AS customer_address, c.messenger_psid,
              cat.name AS category_name, cat.icon AS category_icon, cat.color_code AS category_color
       FROM tickets t
       LEFT JOIN customers c ON t.customer_id = c.id
       LEFT JOIN service_categories cat ON t.service_category_id = cat.id
       WHERE t.id = $1`,
      [ticketId]
    );
    return res.rows[0] || null;
  } catch (e) {
    return null;
  }
};

/**
 * Robust customer lookup by account number
 * Matches standard account numbers (e.g. "11114", "ACC-11114", "acc-893793")
 */
const findCustomerByAccount = async (rawAcc) => {
  if (!rawAcc) return null;
  const cleanAcc = String(rawAcc)
    .replace(/\{\{[^}]*?\/\//g, '')
    .replace(/[\{\}\"\']/g, '')
    .trim();
  const digitsOnly = cleanAcc.replace(/\D/g, '');
  if (!cleanAcc && !digitsOnly) return null;
  const withPrefix = `ACC-${digitsOnly}`;

  try {
    const res = await query(
      `SELECT * FROM customers
       WHERE TRIM(LOWER(account_number)) = TRIM(LOWER($1))
          OR TRIM(LOWER(account_number)) = TRIM(LOWER($2))
          OR TRIM(LOWER(account_number)) = TRIM(LOWER($3))
          OR TRIM(LOWER(account_number)) = TRIM(LOWER(REPLACE($1, 'ACC-', '')))
          OR ($4 != '' AND TRIM(REPLACE(LOWER(account_number), 'acc-', '')) = $4)
       LIMIT 1`,
      [cleanAcc, withPrefix, digitsOnly, digitsOnly]
    );
    return res.rows[0] || null;
  } catch (err) {
    logger.error('findCustomerByAccount error:', err);
    return null;
  }
};

const serviceCategoriesCache = { data: null, lastFetch: 0 };

async function getServiceCategoriesCached() {
  const now = Date.now();
  if (serviceCategoriesCache.data && (now - serviceCategoriesCache.lastFetch < 300000)) {
    return serviceCategoriesCache.data;
  }
  try {
    const res = await query('SELECT id, name FROM service_categories');
    serviceCategoriesCache.data = res.rows;
    serviceCategoriesCache.lastFetch = now;
    return res.rows;
  } catch (e) {
    return serviceCategoriesCache.data || [];
  }
}

function determineFastPriority(textLower) {
  const isCritical = 
    textLower.includes('putol') || textLower.includes('cut') || textLower.includes('nasira') || 
    textLower.includes('walang signal') || textLower.includes('walang connection') ||
    textLower.includes('no internet') || textLower.includes('no connection') ||
    textLower.includes('red light') || textLower.includes('los') || textLower.includes('outage');
  if (isCritical) return 'critical';

  const isHigh = 
    textLower.includes('mabagal') || textLower.includes('slow') || textLower.includes('offline') ||
    textLower.includes('reboot') || textLower.includes('disconnecting') || textLower.includes('napuputol');
  if (isHigh) return 'high';

  return 'medium';
}

async function determineFastCategory(textLower) {
  const categories = await getServiceCategoriesCached();
  let matchedCat = null;

  if (textLower.includes('install') || textLower.includes('kabit') || textLower.includes('apply')) {
    matchedCat = categories.find(c => c.name.toLowerCase().includes('installation'));
  } else if (textLower.includes('cctv') || textLower.includes('camera')) {
    matchedCat = categories.find(c => c.name.toLowerCase().includes('cctv'));
  } else if (textLower.includes('smart') || textLower.includes('device')) {
    matchedCat = categories.find(c => c.name.toLowerCase().includes('smart'));
  } else if (textLower.includes('internet') || textLower.includes('wifi') || textLower.includes('starlink') || textLower.includes('connection') || textLower.includes('mabagal') || textLower.includes('no signal') || textLower.includes('putol') || textLower.includes('red light') || textLower.includes('los')) {
    matchedCat = categories.find(c => c.name.toLowerCase().includes('starlink') || c.name.toLowerCase().includes('network'));
  }

  if (!matchedCat && categories.length > 0) {
    matchedCat = categories.find(c => c.name.toLowerCase().includes('general') || c.name.toLowerCase().includes('support')) || categories[0];
  }

  return {
    categoryId: matchedCat ? matchedCat.id : null,
    categoryName: matchedCat ? matchedCat.name : 'General Support'
  };
}

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

    const subscriberId = normalizedQuery.subscriber_id || req.body?.subscriber_id || normalizedQuery.psid || req.body?.psid || '';
    if (subscriberId) {
      try {
        await query('UPDATE customers SET messenger_psid = $1, updated_at = NOW() WHERE id = $2', [subscriberId, customer.id]);
        logger.info(`🔗 Auto-linked subscriber ${subscriberId} to customer ${customer.full_name} in verifyAccountNumber`);
      } catch (linkErr) {
        logger.warn('Failed to auto-link subscriber PSID in verifyAccountNumber:', linkErr.message);
      }
    }

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

    // Active Ticket Enforcement: if customer already has a support ticket that is NOT resolved or closed, do not create a new one!
    const activeTicketCheck = await query(
      `SELECT t.*, cat.name AS category_name FROM tickets t
       LEFT JOIN service_categories cat ON t.service_category_id = cat.id
       WHERE t.customer_id = $1 
         AND t.status::text NOT IN ('resolved', 'closed', 'cancelled')
         AND (cat.name IS NULL OR cat.name NOT ILIKE '%Installation%')
         AND t.subject NOT ILIKE '%Installation%'
       ORDER BY t.created_at DESC LIMIT 1`,
      [customer.id]
    );
    if (activeTicketCheck.rows.length > 0) {
      const existingTicket = activeTicketCheck.rows[0];
      const statusDisplay = (existingTicket.status || 'open').toUpperCase();
      logger.info(`⚠️ Active ticket exists for customer ${customer.id} in webhook — existing: ${existingTicket.ticket_number}`);
      const activeMsg = `⚠️ Existing Active Ticket Found\n\nHello, ${customer.full_name || 'Customer'}!\nYou already have an ongoing support ticket in our system:\n\n📋 Ticket Number: ${existingTicket.ticket_number}\n📌 Status: ${statusDisplay}\n\nOur team is currently handling your request. A new ticket cannot be created until your existing ticket is resolved or closed.`;
      try {
        await sendBotcakeMessage(psid, activeMsg);
      } catch (err) {
        await sendTextMessage(psid, activeMsg).catch(() => {});
      }
      return;
    }

    // Customer is found & linked -> Auto-generate ticket instantly (< 15ms)
    logger.info(`Generating ticket instantly for customer "${customer.full_name}"...`);
    const textLower = (messageText || '').toLowerCase();
    const priorityVal = determineFastPriority(textLower);
    const etaHoursVal = priorityVal === 'critical' ? 15 : priorityVal === 'high' ? 24 : 48;

    const { categoryId, categoryName } = await determineFastCategory(textLower);

    const subjectVal = messageText.length > 95 ? messageText.substring(0, 95) + '...' : messageText || 'Support Request via Messenger';
    const ticketNum = `TKT-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

    let createdTicket;
    try {
      const newTicket = await query(
        `INSERT INTO tickets (
          ticket_number, customer_id, service_category_id, priority, status, subject, description, source, ai_priority_recommendation, ai_estimated_resolution_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [ticketNum, customer.id, categoryId, priorityVal, 'open', subjectVal, messageText, 'messenger', priorityVal, etaHoursVal]
      );
      createdTicket = newTicket.rows[0];
    } catch (insertErr) {
      logger.error('handleWebhook ticket insert failed:', insertErr.message);
      throw insertErr;
    }

    logger.info(`✅ Ticket created instantly: ${createdTicket.ticket_number}`);

    try {
      const { clearTicketsCache } = require('./ticketController');
      if (typeof clearTicketsCache === 'function') clearTicketsCache();
      const { clearAdminDashboardCache } = require('../routes/dashboardRoutes');
      if (typeof clearAdminDashboardCache === 'function') clearAdminDashboardCache();
    } catch (_) {}

    const fullTicketPayload = (await fetchFullTicket(createdTicket.id)) || {
      ...createdTicket,
      customer_name: customer.full_name || 'Customer',
      customer_contact: customer.contact_number || '',
      customer_address: customer.complete_address || '',
      category_name: categoryName,
    };

    // ✅ EMIT SOCKET FIRST (0ms) — Notify admins immediately. Technicians on mobile ONLY receive notifications when assigned!
    emitToAdmins('ticket:created', { ticket: fullTicketPayload });
    emitToAdmins('ticket_created', { ticket: fullTicketPayload });
    if (fullTicketPayload.assigned_technician_id) {
      emitToUser(fullTicketPayload.assigned_technician_id, 'ticket:created', { ticket: fullTicketPayload });
      emitToUser(fullTicketPayload.assigned_technician_id, 'ticket:assigned', { ticket: fullTicketPayload });
    }

    const isInstallNotif = (categoryName || '').toLowerCase().includes('installation');
    notifyAdmins({
      type: isInstallNotif ? 'installation' : 'ticket',
      title: isInstallNotif ? `New Installation Request #${createdTicket.ticket_number}` : `New Messenger Ticket #${createdTicket.ticket_number}`,
      body: isInstallNotif
        ? `Installation Request #${createdTicket.ticket_number} created via Messenger for ${customer.full_name || 'Customer'}.`
        : `Ticket #${createdTicket.ticket_number} created via Messenger for ${customer.full_name || 'Customer'}.`,
      data: { ticketId: createdTicket.id, ticketNumber: createdTicket.ticket_number, isInstallation: isInstallNotif }
    }).catch(err => logger.error('notifyAdmins error:', err));

    // Send confirmation reply back to customer on Messenger
    const replyMsg = `🤖 Support Ticket Generated!\n\n📋 Ticket Number: ${createdTicket.ticket_number}\n📌 Category: ${categoryName}\n⚡ Priority: ${priorityVal.toUpperCase()}\n⏱️ Estimated Resolution: ${etaHoursVal} hours\n\nOur team has received your request and a technician will be assigned shortly.`;

    try {
      await sendBotcakeMessage(psid, replyMsg);
    } catch (err) {
      await sendTextMessage(psid, replyMsg).catch(() => {});
    }

    // Optional background AI enrichment (does not delay ticket delivery or socket events)
    classifyAndGenerateTicket([], messageText).then(async (aiResult) => {
      if (aiResult && aiResult.title) {
        try {
          await query(`UPDATE tickets SET subject = $1 WHERE id = $2`, [aiResult.title, createdTicket.id]);
        } catch (_) {}
      }
    }).catch(() => {});

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
      
      // Direct message reply to subscriber if subscriberId is available
      if (subscriberId) {
        const notFoundText = `❌ Invalid account number.\nPlease check your account number and try again.`;
        try {
          await sendBotcakeMessage(subscriberId, notFoundText);
        } catch (msgErr) {
          await sendTextMessage(subscriberId, notFoundText).catch(() => {});
        }
      }

      return res.status(200).json({
        success: false, found: false, found_str: 'false',
        found_account: 'not_found', status: 'not_found',
        message: 'Invalid account number.'
      });
    }

    const customer = result.rows[0];
    logger.info(`✅ verify-and-broadcast: found "${customer.full_name}" (${customer.account_number})`);

    // Auto-link messenger_psid if subscriberId is passed
    if (subscriberId) {
      try {
        await query('UPDATE customers SET messenger_psid = $1 WHERE id = $2', [subscriberId, customer.id]);
        logger.info(`🔗 Auto-linked subscriber ${subscriberId} to customer ${customer.full_name}`);
      } catch (linkErr) {
        logger.warn('Failed to auto-link subscriber PSID:', linkErr.message);
      }

      // Direct message reply matching user's requested verification prompt
      const verifiedPromptText = `✅ Account Number Verified!\n\nTo create a support ticket, please send the following information in one message:\n\nName:\nContact Number:\nAddress:\nLandmark:\nProblem:`;
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
    let rawSubId = req.query.subscriber_id || req.body?.subscriber_id || req.query.psid || req.body?.psid || '';
    const subscriberId = (Array.isArray(rawSubId) ? String(rawSubId[0]) : String(rawSubId)).trim();

    let rawConcern = req.query.concern || req.query.text || req.body?.concern || req.body?.text || '';
    let concernText = (Array.isArray(rawConcern) ? String(rawConcern[0]) : String(rawConcern)).trim();

    let rawReqType = req.query.request_type || req.body?.request_type || '';
    const requestType = (Array.isArray(rawReqType) ? String(rawReqType[0]) : String(rawReqType)).toLowerCase().trim();

    logger.info(`🔍 createTicket hit: subscriberId="${subscriberId}", requestType="${requestType}", concern="${concernText}"`);

    if (!concernText) {
      return res.status(200).json({ success: false, message: 'Concern text is required.' });
    }

    if (!subscriberId) {
      return res.status(200).json({ success: false, message: 'Subscriber ID is required.' });
    }

    // Detect whether this is an installation request
    const serviceTypeMatch = concernText.match(/(?:Service Type|Service|Type of Service):\s*([^\n]+)/i);
    const installTypeMatch = concernText.match(/Type\s*of\s*Installation:\s*([^\n]+)/i);
    const installDateMatch = concernText.match(/Preferred\s*(?:Installation\s*)?Date:\s*([^\n]+)/i);
    const isInstallationRequest = requestType === 'installation' || concernText.toLowerCase().includes('installation request') || Boolean(installTypeMatch);

    // Parse structured form fields
    const accMatch = concernText.match(/(?:Account\s*(?:Number|No\.?|#)?|Acc\.?\s*(?:No\.?|#)?|Acct\.?\s*(?:No\.?|#)?):\s*([^\n,]+)/i);
    const nameMatch = concernText.match(/(?:Name|Full Name):\s*([^\n]+)/i);
    const phoneMatch = concernText.match(/(?:Contact Number|Contact|Phone):\s*([^\n]+)/i);
    const addressMatch = concernText.match(/(?:Address|Complete Address):\s*([^\n]+)/i);
    const landmarkMatch = concernText.match(/Landmark:\s*([^\n]+)/i);

    const rawAccFromQuery = (req.query.account_number || req.body?.account_number || req.query.account || req.body?.account || (accMatch ? accMatch[1] : '')).toString().trim();
    const cleanAcc = rawAccFromQuery.replace(/\{\{[^}]*?\/\//g, '').replace(/[\{\}\"\']/g, '').trim();

    let customer = null;

    // 1. If an account number was provided in query, body, or form, verify it in the system first!
    if (cleanAcc && !cleanAcc.includes('{{')) {
      customer = await findCustomerByAccount(cleanAcc);

      // If they provided an account number, but it DOES NOT exist in the database:
      if (!customer && !isInstallationRequest) {
        logger.warn(`❌ createTicket rejected: Account number "${cleanAcc}" does not exist in DB for subscriber ${subscriberId}`);
        const notFoundMsg = `❌ Account Number Not Found\n\nWe couldn't find an account matching "${cleanAcc}" in our system.\n\n📌 Please make sure you enter a valid, registered Account Number (e.g. ACC-11114 or 11114) before filing a report.\n\nIf you want to apply for a new installation, please select "Installation Request".`;
        if (subscriberId) {
          try { await sendBotcakeMessage(subscriberId, notFoundMsg); } catch { await sendTextMessage(subscriberId, notFoundMsg).catch(() => {}); }
        }
        return res.status(200).json({
          success: false,
          account_found: false,
          message: `Account number "${cleanAcc}" does not exist in our system. Ticket was not created.`,
          reply_message: notFoundMsg,
          messages: [{ text: notFoundMsg }]
        });
      }

      if (customer && subscriberId) {
        await query('UPDATE customers SET messenger_psid = $1, updated_at = NOW() WHERE id = $2', [subscriberId, customer.id]);
        logger.info(`🔗 Auto-linked subscriber ${subscriberId} to verified customer "${customer.full_name}" (${customer.account_number})`);
      }
    }

    // 2. If no account number in form, check if customer was already verified via messenger_psid
    if (!customer && subscriberId) {
      const custResult = await query('SELECT * FROM customers WHERE messenger_psid = $1', [subscriberId]);
      if (custResult.rows.length > 0) {
        customer = custResult.rows[0];
        logger.info(`✅ Found verified customer by PSID: "${customer.full_name}" (${customer.account_number})`);
      }
    }

    // 3. For reports (NOT installation requests): customer account MUST exist in the system!
    if (!customer) {
      if (!isInstallationRequest) {
        logger.warn(`❌ createTicket rejected: No existing account found or verified for subscriber ${subscriberId}`);
        const notFoundMsg = `❌ Account Not Verified\n\nWe couldn't find an existing account linked to your Messenger.\n\n📌 Before filing a report or technical ticket, your account number must be verified.\nPlease verify your Account Number first.\n\nIf you are a new customer requesting an installation, please select "Installation Request".`;
        if (subscriberId) {
          try { await sendBotcakeMessage(subscriberId, notFoundMsg); } catch { await sendTextMessage(subscriberId, notFoundMsg).catch(() => {}); }
        }
        return res.status(200).json({
          success: false,
          account_found: false,
          message: 'No existing account found in the system. Ticket was not created. Please verify your account number first.',
          reply_message: notFoundMsg,
          messages: [{ text: notFoundMsg }]
        });
      }

      // 4. Installation Requests ONLY: auto-create new customer prospect
      logger.info(`🆕 Auto-creating new customer for installation request from PSID: ${subscriberId}`);
      const rawNameFromQuery = (nameMatch ? nameMatch[1].trim() : '') || (req.query.name || req.body?.name || req.query.customer_name || req.body?.customer_name || '').toString().trim();
      const autoName = rawNameFromQuery || (nameMatch ? nameMatch[1].trim() : 'New Customer');
      const autoPhone = phoneMatch ? phoneMatch[1].trim() : (req.query.phone || req.body?.phone || null);
      const autoAddress = addressMatch ? addressMatch[1].trim() : (req.query.address || req.body?.address || 'Not provided');
      const autoLandmark = landmarkMatch ? landmarkMatch[1].trim() : null;
      const autoAccNum = `ACC-${Date.now().toString().slice(-6)}`;

      try {
        const newCust = await query(
          `INSERT INTO customers (account_number, messenger_psid, full_name, complete_address, nearby_landmark, contact_number)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [autoAccNum, subscriberId, autoName, autoAddress, autoLandmark, autoPhone]
        );
        customer = newCust.rows[0];
        logger.info(`✅ Auto-created customer for installation: ${autoName} (${autoAccNum})`);
      } catch (createErr) {
        logger.error('Failed to auto-create customer for installation:', createErr.message);
        return res.status(200).json({ success: false, message: 'Failed to process installation request. Please try again.' });
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
    
    // 1. Check if user specified a Service Type in their message (e.g. "Service Type: CCTV")
    if (serviceTypeMatch) {
      const userTypeStr = serviceTypeMatch[1].trim();
      const catRes = await query(
        `SELECT id, name FROM service_categories 
         WHERE LOWER(name) ILIKE '%' || LOWER($1) || '%' 
            OR LOWER($1) ILIKE '%' || LOWER(name) || '%' 
         LIMIT 1`,
        [userTypeStr]
      );
      if (catRes.rows.length > 0) {
        categoryId = catRes.rows[0].id;
        categoryName = catRes.rows[0].name;
        logger.info(`✅ Matched Service Type "${userTypeStr}" to category "${categoryName}"`);
      }
    }

    // 2. If installation request, default to Installation Request category
    if (!categoryId && isInstallationRequest) {
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

    // Active Ticket Enforcement:
    // If reporting a regular Support Ticket, only check for active Support Tickets (exclude Installation Requests).
    // If reporting an Installation Request, only check for active Installation Requests.
    const activeTicketCheck = await query(
      `SELECT t.*, cat.name AS category_name FROM tickets t
       LEFT JOIN service_categories cat ON t.service_category_id = cat.id
       WHERE t.customer_id = $1 
         AND t.status::text NOT IN ('resolved', 'closed', 'cancelled')
         AND ${isInstallationRequest 
           ? "(cat.name ILIKE '%Installation%' OR t.subject ILIKE '%Installation%')" 
           : "((cat.name IS NULL OR cat.name NOT ILIKE '%Installation%') AND t.subject NOT ILIKE '%Installation%')"}
       ORDER BY t.created_at DESC LIMIT 1`,
      [customer.id]
    );
    if (activeTicketCheck.rows.length > 0) {
      const existingTicket = activeTicketCheck.rows[0];
      const statusDisplay = (existingTicket.status || 'open').toUpperCase();
      logger.info(`⚠️ Active ticket exists for customer ${customer.id} (${customer.full_name}) — existing: ${existingTicket.ticket_number} (status: ${existingTicket.status})`);
      const activeMsg = `⚠️ Existing Active Ticket Found\n\nHello, ${customer.full_name || 'Customer'}!\nYou already have an ongoing support ticket in our system:\n\n📋 Ticket Number: ${existingTicket.ticket_number}\n📌 Status: ${statusDisplay}\n📝 Subject: ${existingTicket.subject || 'Support Request'}\n\nOur technical team is already handling your request. A new ticket cannot be created until your existing ticket is resolved or closed.\n\nThank you for your patience!`;
      if (subscriberId) {
        try { await sendBotcakeMessage(subscriberId, activeMsg); } catch { await sendTextMessage(subscriberId, activeMsg).catch(() => {}); }
      }
      return res.status(200).json({ 
        success: false, 
        has_active_ticket: true,
        ticket_number: existingTicket.ticket_number, 
        status: existingTicket.status,
        duplicate: true, 
        message: `Customer already has an active ticket (${existingTicket.ticket_number}) with status "${existingTicket.status}". A new ticket cannot be created until the current ticket is resolved or closed.`,
        reply_message: activeMsg, 
        messages: [{ text: activeMsg }] 
      });
    }

    const ticketNum = `TKT-${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

    const etaHoursVal = aiResult.etaHours || (priorityEnum === 'critical' ? 15 : priorityEnum === 'high' ? 24 : 48);

    let createdTicket;
    try {
      const newTicket = await query(
        `INSERT INTO tickets (
          ticket_number, customer_id, service_category_id, priority, status, subject, description, source, ai_priority_recommendation, ai_estimated_resolution_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [ticketNum, customer.id, categoryId, priorityEnum, 'open', subjectVal, concernText, 'messenger', priorityEnum, etaHoursVal]
      );
      createdTicket = newTicket.rows[0];
    } catch (insertErr) {
      logger.error('Ticket insert failed:', insertErr.message);
      logger.error('Insert error details:', JSON.stringify({ code: insertErr.code, detail: insertErr.detail, constraint: insertErr.constraint }));
      throw insertErr;
    }

    logger.info(`✅ Ticket created successfully via endpoint: ${createdTicket.ticket_number}`);

    const fullTicketPayload = (await fetchFullTicket(createdTicket.id)) || createdTicket;

    // ✅ Clear server-side tickets cache and admin dashboard cache so the next GET returns fresh data immediately
    try {
      const { clearTicketsCache } = require('./ticketController');
      if (typeof clearTicketsCache === 'function') clearTicketsCache();
      const { clearAdminDashboardCache } = require('../routes/dashboardRoutes');
      if (typeof clearAdminDashboardCache === 'function') clearAdminDashboardCache();
    } catch (e) {}

    // ✅ EMIT SOCKET FIRST (0ms) — Notify admins immediately. Technicians on mobile ONLY receive notifications when assigned!
    emitToAdmins('ticket:created', { ticket: fullTicketPayload });
    emitToAdmins('ticket_created', { ticket: fullTicketPayload });
    if (fullTicketPayload.assigned_technician_id) {
      emitToUser(fullTicketPayload.assigned_technician_id, 'ticket:created', { ticket: fullTicketPayload });
      emitToUser(fullTicketPayload.assigned_technician_id, 'ticket:assigned', { ticket: fullTicketPayload });
    }

    const isInstallNotif = (categoryName || '').toLowerCase().includes('installation');
    notifyAdmins({
      type: isInstallNotif ? 'installation' : 'ticket',
      title: isInstallNotif ? `New Installation Request #${createdTicket.ticket_number}` : `New Messenger Ticket #${createdTicket.ticket_number}`,
      body: isInstallNotif
        ? `Installation Request #${createdTicket.ticket_number} created via Messenger for ${customer.full_name || 'Customer'}.`
        : `Ticket #${createdTicket.ticket_number} created via Messenger for ${customer.full_name || 'Customer'}.`,
      data: { ticketId: createdTicket.id, ticketNumber: createdTicket.ticket_number, isInstallation: isInstallNotif }
    }).catch(err => logger.error('notifyAdmins error:', err));

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
