import { google } from 'googleapis';
import { env } from '../src/config/env.js';

const scopes = ['https://www.googleapis.com/auth/gmail.send'];

if (!env.gmailClientId || !env.gmailClientSecret) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in backend/.env first.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  env.gmailClientId,
  env.gmailClientSecret,
  env.gmailRedirectUri,
);

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes,
});

console.log('\nOpen this URL, choose your Gmail account, allow access, then copy the code from the redirected URL:\n');
console.log(url);
console.log('\nThen run:\nnode scripts/gmail-token.js \"PASTE_CODE_HERE\"\n');
