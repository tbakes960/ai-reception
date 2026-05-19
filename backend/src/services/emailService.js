const nodemailer = require('nodemailer');

let _transporter;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return _transporter;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendEmail({ to, subject, html, text }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[email] EMAIL_USER/EMAIL_PASS not set — skipping send');
    return { skipped: true };
  }
  const info = await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html: html || `<p>${escapeHtml(text || '')}</p>`,
    text: text || '',
  });
  return { messageId: info.messageId };
}

async function sendBookingConfirmation({ to, guestName, booking }) {
  return sendEmail({
    to,
    subject: `Booking Confirmed — ${process.env.HOTEL_NAME || 'Hotel'}`,
    html: `
      <h2>Booking Confirmation</h2>
      <p>Dear ${escapeHtml(guestName)},</p>
      <p>Your booking has been confirmed:</p>
      <ul>
        <li><strong>Service:</strong> ${escapeHtml(booking.service)}</li>
        <li><strong>Date:</strong> ${escapeHtml(booking.date)}</li>
        <li><strong>Time:</strong> ${escapeHtml(booking.time)}</li>
      </ul>
      <p>We look forward to welcoming you.</p>
      <p>${escapeHtml(process.env.HOTEL_NAME || 'Hotel')}</p>
    `,
  });
}

module.exports = { sendEmail, sendBookingConfirmation };
