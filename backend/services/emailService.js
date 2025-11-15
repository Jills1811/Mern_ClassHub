const nodemailer = require('nodemailer');

// Create and cache a transporter to avoid re-creating on every send
let cachedTransporter = null;

function createTransporter() {
    if (cachedTransporter) return cachedTransporter;

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
        console.warn('Email disabled: GMAIL_USER/GMAIL_PASS not configured');
        return null;
    }

    cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: gmailPass
        }
    });

    return cachedTransporter;
}

async function sendEmail({ to, subject, html, text }) {
    const transporter = createTransporter();
    if (!transporter) {
        console.warn('Skipping email send: transporter not available');
        return { skipped: true };
    }

    const from = process.env.MAIL_FROM || process.env.GMAIL_USER;

    // If multiple recipients, send to authenticated account and BCC others to avoid invalid 'to' bounces
    const toArray = Array.isArray(to) ? to : (to ? [to] : []);
    const mailOptions = toArray.length > 1
        ? { from, to: process.env.GMAIL_USER, bcc: toArray.join(','), subject, html, text }
        : { from, to: toArray[0] || process.env.GMAIL_USER, subject, html, text };

    console.log(`[mail] Sending: subject="${subject}", recipients=${Array.isArray(to) ? to.length : (to ? 1 : 0)}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[mail] Sent: messageId=${info.messageId || 'n/a'}`);
    return info;
}

module.exports = {
    createTransporter,
    sendEmail
};


