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
  const { account_number } = req.query;

  logger.info(`🔍 Botcake requested verify for account_number: "${account_number}"`);

  if (!account_number) {
    return res.status(400).json({ found: false, found_str: "false", status: "not_found", message: 'Account number is required.' });
  }

  try {
    const accNum = account_number.trim();

    // Try exact match first (case-insensitive), then try matching with/without prefix
    const result = await query(
      `SELECT id, full_name, account_number, contact_number FROM customers
       WHERE LOWER(account_number) = LOWER($1)
          OR LOWER(account_number) = LOWER('ACC-' || $1)
          OR LOWER(account_number) = LOWER(REPLACE($1, 'ACC-', ''))
       LIMIT 1`,
      [accNum]
    );

    if (result.rows.length === 0) {
      logger.warn(`❌ Account number not found in DB: "${accNum}"`);
      return res.status(200).json({ found: false, found_str: "false", status: "not_found", message: 'Account number not found in the system.' });
    }

    const customer = result.rows[0];
    logger.info(`✅ Account number verified for customer: "${customer.full_name}" (${customer.account_number})`);
    return res.status(200).json({
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
    return res.status(500).json({ found: false, found_str: "false", status: "error", message: 'Server error during verification.' });
  }
};



// POST /api/botcake/webhook - Handle incoming Botcake AI webhook events
exports.handleWebhook = async (req, res) => {
  res.status(200).json({ status: 'success' }); // Respond immediately to Botcake

  try {
    const payload = req.body;
    logger.info('Botcake Webhook Event received:', JSON.stringify(payload).substring(0, 200));

    // Handle Botcake payload structure or standard Messenger structure forwarded by Botcake
    const psid = payload.psid || payload.subscriber?.id || payload.sender?.id || payload.entry?.[0]?.messaging?.[0]?.sender?.id;
    const messageText = payload.text || payload.message?.text || payload.entry?.[0]?.messaging?.[0]?.message?.text;
    const customerName = payload.subscriber?.name || (payload.subscriber?.first_name ? `${payload.subscriber?.first_name} ${payload.subscriber?.last_name || ''}` : 'Botcake Customer');
    const phone = payload.subscriber?.phone || payload.subscriber?.phone_number || '';
    const completeAddress = payload.subscriber?.address || '';

    if (!psid || !messageText) return;

    // Get customer by messenger_psid
    let custResult = await query('SELECT * FROM customers WHERE messenger_psid = $1', [psid]);
    let customer = custResult.rows[0];

    if (!customer) {
      // Check if message text contains a valid account number
      const accMatch = messageText.match(/ACC-?\d+/i);
      let matchedCustomer = null;

      if (accMatch) {
        const accNum = accMatch[0].toUpperCase();
        const accNumAlt = accNum.replace('-', '');
        const matchResult = await query(
          "SELECT * FROM customers WHERE UPPER(account_number) = $1 OR UPPER(REPLACE(account_number, '-', '')) = $2",
          [accNum, accNumAlt]
        );
        matchedCustomer = matchResult.rows[0];
      } else {
        // Fallback: check if entire message text matches an account number
        const cleanMsg = messageText.trim().toUpperCase();
        const matchResult = await query('SELECT * FROM customers WHERE UPPER(account_number) = $1', [cleanMsg]);
        matchedCustomer = matchResult.rows[0];
      }

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

    // Run AI classification (Only for already linked customers)
    const aiResult = await classifyAndGenerateTicket([], messageText);

    // Get matching category ID from service_categories
    let categoryName = 'Other';
    if (aiResult.category) {
      if (aiResult.category === 'starlink_internet') categoryName = 'Starlink Internet';
      else if (aiResult.category === 'cctv_system') categoryName = 'CCTV System';
      else if (aiResult.category === 'smart_devices') categoryName = 'Smart Devices';
      else if (aiResult.category === 'installation') categoryName = 'Installation';
    }

    const catResult = await query('SELECT id, name FROM service_categories WHERE name ILIKE $1', [categoryName]);
    const categoryId = catResult.rows[0]?.id || null;
    const finalCategoryName = catResult.rows[0]?.name || 'Other';

    // Auto-generate ticket
    const ticketResult = await query(
      `INSERT INTO tickets (customer_id, service_category_id, priority, status, subject, description, ai_priority_recommendation, ai_estimated_resolution_hours, ai_classification_confidence)
       VALUES ($1, $2, $3, 'open', $4, $5, $6, $7, $8) RETURNING *`,
      [
        customer.id,
        categoryId,
        aiResult.priority || 'medium',
        aiResult.title || 'Botcake Customer Support Case',
        aiResult.description || messageText,
        aiResult.priority || 'medium',
        aiResult.etaHours || 24,
        aiResult.confidence || 90
      ]
    );
    const ticket = ticketResult.rows[0];
    ticket.categoryName = finalCategoryName;

    // Log the incoming message submission
    await query(
      `INSERT INTO messenger_submissions (ticket_id, customer_id, raw_payload, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [ticket.id, customer.id, JSON.stringify(payload), '127.0.0.1']
    );

    // Format Botcake response message
    const replyText = `🤖 Botcake AI Support Ticket Generated!\n\n📋 Ticket Number: ${ticket.ticket_number}\n📌 Category: ${finalCategoryName}\n⚡ Priority: ${ticket.priority.toUpperCase()}\n⏱️ Estimated Resolution: ${ticket.ai_estimated_resolution_hours || 24} hours\n\nOur technical team at Converge IT Solutions has been assigned to your concern. Thank you!`;

    // Try sending reply via Botcake API first, or fallback to Meta Messenger API
    try {
      await sendBotcakeMessage(psid, replyText);
    } catch (err) {
      await sendTextMessage(psid, replyText).catch(() => {});
    }

    // Sync ticket number to Botcake customer profile custom fields
    await updateBotcakeCustomerField(psid, {
      last_ticket_number: ticket.ticket_number,
      last_ticket_status: ticket.status,
      last_ticket_priority: ticket.priority
    });

    // Notify administrators real-time
    emitToAdmins('ticket:created_via_botcake', { ticket, customerName: customer.full_name });

  } catch (error) {
    logger.error('Botcake webhook handler error:', error);
  }
};

