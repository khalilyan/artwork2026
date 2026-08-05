import { env } from '../config/env.js';

function hasTwilioConfig() {
  return Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioFrom);
}

export async function sendPasswordResetSms({ phone, code }) {
  const message = `ARTWORK գաղտնաբառի վերականգնման կոդը՝ ${code}. Կոդը վավեր է 15 րոպե։`;

  if (!hasTwilioConfig()) {
    console.info(`\n[password-reset] SMS is not configured.\n[password-reset] Phone: ${phone}\n[password-reset] Code: ${code}\n`);
    return { delivered: false };
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: env.twilioFrom,
      To: phone,
      Body: message,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`SMS could not be sent. ${details}`);
  }

  return { delivered: true };
}
