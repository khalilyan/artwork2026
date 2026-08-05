import { google } from 'googleapis';
import { env } from '../config/env.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hasEmailConfig() {
  return Boolean(
    env.gmailClientId
    && env.gmailClientSecret
    && env.gmailRefreshToken
    && env.gmailSender
    && env.adminEmails.length,
  );
}

function createOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    env.gmailClientId,
    env.gmailClientSecret,
    env.gmailRedirectUri,
  );

  oauth2Client.setCredentials({ refresh_token: env.gmailRefreshToken });
  return oauth2Client;
}

function encodeHeader(value) {
  return String(value ?? '').replace(/\r?\n/g, ' ');
}

function encodeMimeHeader(value) {
  const cleanValue = encodeHeader(value);
  return /^[\x00-\x7F]*$/.test(cleanValue)
    ? cleanValue
    : `=?UTF-8?B?${Buffer.from(cleanValue, 'utf8').toString('base64')}?=`;
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createMimeMessage({ from, to, subject, text, html, attachments = [] }) {
  const boundary = `artwork-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const alternativeBoundary = `${boundary}-alt`;
  const lines = [
    `From: ${encodeMimeHeader(from)}`,
    `To: ${encodeHeader(to)}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    '',
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text ?? '',
    '',
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    html ?? `<pre>${escapeHtml(text)}</pre>`,
    '',
    `--${alternativeBoundary}--`,
  ];

  attachments.forEach((attachment) => {
    lines.push('', `--${boundary}`);
    lines.push(`Content-Type: ${attachment.contentType}; name="${encodeHeader(attachment.filename)}"`);
    lines.push('Content-Transfer-Encoding: base64');
    if (attachment.cid) lines.push(`Content-ID: <${encodeHeader(attachment.cid)}>`);
    lines.push(`Content-Disposition: ${attachment.cid ? 'inline' : 'attachment'}; filename="${encodeHeader(attachment.filename)}"`);
    lines.push('', attachment.content.toString('base64').replace(/(.{76})/g, '$1\r\n'));
  });

  lines.push('', `--${boundary}--`, '');
  return lines.join('\r\n');
}

export function createInfoTable(rows) {
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-family:Arial,sans-serif;font-size:14px;">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="padding:8px 10px;border:1px solid #e7ddd0;color:#633005;font-weight:700;width:150px;">${escapeHtml(label)}</td>
          <td style="padding:8px 10px;border:1px solid #e7ddd0;color:#211b16;">${escapeHtml(value)}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

export function dataUrlToAttachment(dataUrl, index, prefix = 'attachment') {
  const match = String(dataUrl ?? '').match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!match) return null;

  const [, contentType, base64Data] = match;
  const extension = contentType.split('/')[1].replace('jpeg', 'jpg');

  return {
    filename: `${prefix}-${index + 1}.${extension}`,
    content: Buffer.from(base64Data, 'base64'),
    contentType,
  };
}

export async function sendAdminNotificationEmail({ subject, text, html, attachments = [] }) {
  if (!hasEmailConfig()) {
    console.info(`\n[email-notification] Gmail API is not configured.\nSubject: ${subject}\n${text ?? ''}\n`);
    return { delivered: false };
  }

  const auth = createOAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = toBase64Url(createMimeMessage({
    from: env.gmailSender,
    to: env.adminEmails.join(','),
    subject,
    text,
    html,
    attachments,
  }));

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return { delivered: true };
}

export function sendAdminNotificationEmailQuietly(payload) {
  sendAdminNotificationEmail(payload).catch((error) => {
    console.error('Admin email notification failed:', error);
  });
}

export { escapeHtml };
