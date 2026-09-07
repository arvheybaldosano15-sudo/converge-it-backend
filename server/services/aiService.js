const OpenAI = require('openai');
const logger = require('../config/logger');

let openaiClient = null;
const getOpenAI = () => {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};
const isAIEnabled = () => process.env.AI_ENABLED !== 'false' && !!process.env.OPENAI_API_KEY;

const determinePriorityAndETA = (textLower) => {
  // 1. CRITICAL (15 Hours): Physical cable/fiber cuts, total line damage, total outage, red light / LOS
  const isCritical = 
    textLower.includes('putol') || 
    textLower.includes('cut') || 
    textLower.includes('nasira') || 
    textLower.includes('walang signal') || 
    textLower.includes('walang connection') ||
    textLower.includes('no internet') ||
    textLower.includes('no connection') ||
    textLower.includes('red light') ||
    textLower.includes('los') ||
    textLower.includes('outage');

  if (isCritical) {
    return { priority: 'critical', etaHours: 15 };
  }

  // 2. HIGH (24 Hours): Major service degradation, camera offline, hardware issue, intermittent disconnection
  const isHigh = 
    textLower.includes('mabagal') || 
    textLower.includes('slow') || 
    textLower.includes('camera offline') || 
    textLower.includes('offline') || 
    textLower.includes('restarting') ||
    textLower.includes('reboot') ||
    textLower.includes('disconnecting') ||
    textLower.includes('napuputol') ||
    textLower.includes('high ping') ||
    textLower.includes('no display') ||
    textLower.includes('black screen');

  if (isHigh) {
    return { priority: 'high', etaHours: 24 };
  }

  // 3. MEDIUM (48 Hours): Default priority for general inquiries, routine technical support
  return { priority: 'medium', etaHours: 48 };
};

exports.classifyAndGenerateTicket = async (conversationHistory, customerInput) => {
  const textLower = (customerInput || '').toLowerCase();
  const ruleOverride = determinePriorityAndETA(textLower);

  if (!isAIEnabled()) {
    return { 
      category: 'other', 
      priority: ruleOverride.priority, 
      etaHours: ruleOverride.etaHours, 
      title: customerInput.substring(0, 100), 
      troubleshootingSteps: [], 
      confidence: 90, 
      aiEnabled: false 
    };
  }

  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a support ticket classification AI for Converge IT Solutions, a company providing Starlink internet, CCTV, and smart device installation services in the Philippines.
Analyze the customer concern and respond ONLY with a valid JSON object:
{
  "category": "starlink_internet" | "cctv_system" | "smart_devices" | "installation" | "other",
  "priority": "critical" | "high" | "medium",
  "etaHours": <integer>,
  "title": "<concise ticket title>",
  "description": "<detailed description>",
  "troubleshootingSteps": ["<step1>", "<step2>", "<step3>"],
  "confidence": <0-100>,
  "reasoning": "<brief explanation>"
}
PRIORITY RULES:
- CRITICAL (15h): Total outage, physical cable/fiber cuts ("putol", "cut wire", "nasira", "walang signal", "red light LOS").
- HIGH (24h): Major service degradation ("mabagal", "camera offline", "restarting", "napuputol").
- MEDIUM (48h): General support, inquiries, password change, routine questions.`
        },
        ...conversationHistory,
        { role: 'user', content: customerInput }
      ],
      response_format: { type: 'json_object' },
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    // Force exact priority and etaHours matching company rules
    parsed.priority = ruleOverride.priority;
    parsed.etaHours = ruleOverride.etaHours;

    return { ...parsed, aiEnabled: true };
  } catch (error) {
    logger.error('AI classification error:', error);
    return { 
      category: 'other', 
      priority: ruleOverride.priority, 
      etaHours: ruleOverride.etaHours, 
      title: customerInput.substring(0, 100), 
      troubleshootingSteps: [], 
      confidence: 0, 
      aiEnabled: false 
    };
  }
};

exports.generateChatbotResponse = async (step, customerData, customerMessage) => {
  if (!isAIEnabled()) return null;
  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: `You are a friendly support chatbot for Converge IT Solutions (Starlink, CCTV, smart devices). Step: ${step}. Data: ${JSON.stringify(customerData)}. Be concise and friendly. Reply in plain text.` },
        { role: 'user', content: customerMessage }
      ],
      max_tokens: 300
    });
    return response.choices[0].message.content;
  } catch (error) {
    logger.error('AI chatbot response error:', error);
    return null;
  }
};

exports.getTicketRecommendations = async (ticket, historicalData) => {
  if (!isAIEnabled()) return [];
  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an AI assistant for Converge IT Solutions support tickets. Return a JSON object with key "recommendations" containing an array of: { "type": "priority_change"|"reassignment"|"escalation"|"troubleshooting"|"similar_tickets", "suggestion": "...", "reasoning": "...", "confidence": 0-100 }' },
        { role: 'user', content: `Ticket: ${JSON.stringify(ticket)}\nHistorical: ${JSON.stringify(historicalData)}` }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800
    });
    const result = JSON.parse(response.choices[0].message.content);
    return result.recommendations || [];
  } catch (error) {
    logger.error('AI recommendations error:', error);
    return [];
  }
};
