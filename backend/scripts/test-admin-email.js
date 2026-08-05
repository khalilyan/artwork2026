import { sendAdminNotificationEmail } from '../src/utils/email.js';

const result = await sendAdminNotificationEmail({
  subject: 'ARTWORK admin email test',
  text: 'This is a test email from the ARTWORK backend.',
  html: '<p>This is a test email from the <strong>ARTWORK</strong> backend.</p>',
});

console.log(result.delivered ? 'Admin test email sent.' : 'Admin email is not configured.');
