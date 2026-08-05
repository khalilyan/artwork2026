import dotenv from 'dotenv';

dotenv.config();

const defaultClientOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];

function parseClientOrigins(value) {
  if (!value) {
    return defaultClientOrigins;
  }

  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function parseCsv(value) {
  return String(value ?? '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/artwork',
  publicSiteUrl: process.env.PUBLIC_SITE_URL ?? '',
  publicApiUrl: process.env.PUBLIC_API_URL ?? '',
  clientOrigins: parseClientOrigins(process.env.CLIENT_ORIGIN),
  authSecret: process.env.AUTH_SECRET ?? 'dev-only-change-this-secret',
  authTokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 7),
  adminEmails: parseCsv(process.env.ADMIN_EMAILS),
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? '',
  twilioFrom: process.env.TWILIO_FROM ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:hello@artwork.design',
  gmailClientId: process.env.GMAIL_CLIENT_ID ?? '',
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET ?? '',
  gmailRedirectUri: process.env.GMAIL_REDIRECT_URI ?? 'http://localhost:4000/gmail-oauth-callback',
  gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN ?? '',
  gmailSender: process.env.GMAIL_SENDER ?? '',
};
