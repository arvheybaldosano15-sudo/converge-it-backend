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

exports.classifyAndGenerateTicket = async (conversationHistory, customerInput) => {
  if (!isAIEnabled()) {
    return { category: 'other', priority: 'medium', etaHours: 24, title: customerInput.substring(0, 100), troubleshootingSteps: [], confidence: 0, aiEnabled: false };
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
  "priority": "critical" | "high" | "medium" | "low",
  "etaHours": <integer>,
  "title": "<concise ticket title>",
  "description": "<detailed description>",
  "troubleshootingSteps": ["<step1>", "<step2>", "<step3>"],
  "confidence": <0-100>,
  "reasoning": "<brief explanation>"
}
Priority: critical=service outage, high=major degradation, medium=partial/intermittent, low=minor/general.
ETA: critical=2-4h, high=8-12h, medium=24-48h, low=48-72h, installation=24-72h.`
        },
        ...conversationHistory,
        { role: 'user', content: customerInput }
      ],
      response_format: { type: 'json_object' },
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000
    });
    return { ...JSON.parse(response.choices[0].message.content), aiEnabled: true };
  } catch (error) {
    logger.error('AI classification error:', error);
    return { category: 'other', priority: 'medium', etaHours: 24, title: customerInput.substring(0, 100), troubleshootingSteps: [], confidence: 0, aiEnabled: false };
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
