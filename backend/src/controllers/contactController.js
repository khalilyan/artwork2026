import { getDatabase } from '../db/mongo.js';
import { assertRequest } from '../utils/httpError.js';
import { createInfoTable, dataUrlToAttachment, escapeHtml, sendAdminNotificationEmailQuietly } from '../utils/email.js';
import { isEmail, normalizeEmail, normalizePhone, toCleanString } from '../utils/validators.js';

const allowedSubjects = new Set([
  'Ընդհանուր հարցում',
  'Անհատական պատվեր',
  'Առցանց խորհրդատվություն',
  'Համագործակցուրյուն',
]);
const maxContactImages = 4;

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => toCleanString(image))
    .filter((image) => image.startsWith('data:image/'))
    .slice(0, maxContactImages);
}

export async function createContactMessage(request, response, next) {
  try {
    const fullName = toCleanString(request.body.fullName);
    const email = toCleanString(request.body.email);
    const phone = toCleanString(request.body.phone);
    const phoneNormalized = normalizePhone(phone);
    const subject = toCleanString(request.body.subject, 'Ընդհանուր հարցում');
    const message = toCleanString(request.body.message);
    const images = normalizeImages(request.body.images);

    assertRequest(fullName.length >= 2, 400, 'Name is required.');
    assertRequest(isEmail(email), 400, 'Email address must be valid.');
    assertRequest(phoneNormalized.length >= 6, 400, 'Phone number is required.');
    assertRequest(message.length >= 3, 400, 'Message is required.');

    const now = new Date().toISOString();
    const contact = {
      fullName,
      email,
      emailNormalized: normalizeEmail(email),
      phone,
      phoneNormalized,
      subject: allowedSubjects.has(subject) ? subject : 'Ընդհանուր հարցում',
      message,
      images,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };

    const result = await getDatabase().collection('contacts').insertOne(contact);
    const attachments = images.map((image, index) => dataUrlToAttachment(image, index, 'contact-image')).filter(Boolean);

    sendAdminNotificationEmailQuietly({
      subject: `ARTWORK contact: ${fullName}`,
      text: [
        `New contact message from ${fullName}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Subject: ${contact.subject}`,
        '',
        message,
      ].join('\n'),
      html: `
        <h2 style="font-family:Arial,sans-serif;color:#211b16;">New ARTWORK contact message</h2>
        ${createInfoTable([
          ['Name', fullName],
          ['Phone', phone],
          ['Email', email],
          ['Subject', contact.subject],
          ['Images', attachments.length ? `${attachments.length} attached` : 'No images'],
        ])}
        <p style="font-family:Arial,sans-serif;white-space:pre-line;color:#211b16;">${escapeHtml(message)}</p>
      `,
      attachments,
    });

    response.status(201).json({
      message: 'Contact request received.',
      contact: { ...contact, id: String(result.insertedId) },
    });
  } catch (error) {
    next(error);
  }
}
