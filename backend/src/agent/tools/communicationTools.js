const { sendSMSMessage } = require('../../services/smsService');
const { sendWhatsAppMessage } = require('../../services/whatsappService');
const { sendEmail } = require('../../services/emailService');

async function sendSMS({ phone, message }) {
  return sendSMSMessage(phone, message);
}

async function sendWhatsApp({ phone, message }) {
  return sendWhatsAppMessage(phone, message);
}

async function sendEmailMessage({ email, subject, body }) {
  return sendEmail({ to: email, subject, html: body });
}

const TOOL_DEFINITIONS = [
  {
    name: 'sendSMS',
    description: 'Send an SMS message to a guest phone number.',
    input_schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'E.164 phone number' },
        message: { type: 'string' },
      },
      required: ['phone', 'message'],
    },
  },
  {
    name: 'sendWhatsApp',
    description: 'Send a WhatsApp message to a guest.',
    input_schema: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['phone', 'message'],
    },
  },
  {
    name: 'sendEmail',
    description: 'Send an email to a guest.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string', description: 'HTML or plain text email body' },
      },
      required: ['email', 'subject', 'body'],
    },
  },
];

module.exports = { sendSMS, sendWhatsApp, sendEmailMessage, TOOL_DEFINITIONS };
