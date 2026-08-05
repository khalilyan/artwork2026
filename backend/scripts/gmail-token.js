import { google } from 'googleapis';
import { env } from '../src/config/env.js';

const code = process.argv[2];

if (!env.gmailClientId || !env.gmailClientSecret) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in backend/.env first.');
  process.exit(1);
}

if (!code) {
  console.error('Usage: node scripts/gmail-token.js "PASTE_CODE_HERE"');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  env.gmailClientId,
  env.gmailClientSecret,
  env.gmailRedirectUri,
);

const { tokens } = await oauth2Client.getToken(code);

if (!tokens.refresh_token) {
  console.log('No refresh token returned. Re-run gmail-auth-url; make sure prompt=consent is used and remove old app access if needed.');
  process.exit(1);
}

console.log('\nAdd this to backend/.env:\n');
console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
