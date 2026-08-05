import { env } from '../config/env.js';
import { assertAiGenerationAllowed, getAiGenerationIdentity, markAiGenerationUsed } from '../models/aiGenerationLimitModel.js';
import { getAiSettings, updateAiSettings } from '../models/settingsModel.js';
import { createInfoTable, escapeHtml, sendAdminNotificationEmailQuietly } from '../utils/email.js';
import { assertRequest, HttpError } from '../utils/httpError.js';

const openaiImageEditsUrl = 'https://api.openai.com/v1/images/edits';
const imageDataUrlPattern = /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i;

const roomPreviewPrompt = `Create a premium, photorealistic interior design render using the first image as the customer's real room and the second image as the exact furniture product reference.

Place the furniture naturally inside the room with correct scale, perspective, contact shadows, reflections, occlusion, and lighting direction. Preserve the room architecture, flooring, walls, windows, existing decor, and camera angle. Preserve the product's distinctive shape, material, color, proportions, and craftsmanship.

Make the final image look like a high-end real estate/interior photography shot, not a collage or 3D mockup. Do not add text, labels, watermarks, people, hands, UI, logos, or extra furniture unless needed for realistic placement.`;

function dataUrlToBlob(dataUrl) {
  const [metadata, base64Data] = dataUrl.split(',');
  const mimeType = metadata.match(/^data:(.*?);base64$/)?.[1] ?? 'image/png';
  const bytes = Buffer.from(base64Data, 'base64');

  return new Blob([bytes], { type: mimeType });
}

async function imageInputToBlob(imageInput) {
  if (imageDataUrlPattern.test(imageInput)) {
    return dataUrlToBlob(imageInput);
  }

  const imageResponse = await fetch(imageInput);

  if (!imageResponse.ok) {
    throw new HttpError(400, 'Could not load the product image reference.');
  }

  return imageResponse.blob();
}

function getOpenAIErrorMessage(status, data) {
  const message = data.error?.message ?? 'OpenAI image generation failed.';

  if (status === 429) {
    return [
      'OpenAI returned 429. Your request reached OpenAI, but the selected image model is not currently usable for this project because of quota, rate limit, billing, or model access.',
      message,
    ].join(' ');
  }

  return message;
}

function notifyAdminAboutAiError({ status, message, productName }) {
  sendAdminNotificationEmailQuietly({
    subject: `ARTWORK AI error ${status}`,
    text: [
      `AI image generation failed.`,
      `Status: ${status}`,
      `Model: ${env.openaiImageModel}`,
      productName ? `Product: ${productName}` : '',
      '',
      message,
    ].filter(Boolean).join('\n'),
    html: `
      <h2 style="font-family:Arial,sans-serif;color:#211b16;">ARTWORK AI image generation error</h2>
      ${createInfoTable([
        ['Status', status],
        ['Model', env.openaiImageModel],
        ['Product', productName ?? '-'],
      ])}
      <p style="font-family:Arial,sans-serif;white-space:pre-line;color:#211b16;">${escapeHtml(message)}</p>
    `,
  });
}

export async function getPublicAiSettings(_request, response, next) {
  try {
    const settings = await getAiSettings();
    response.json({
      imageGeneration: {
        enabled: settings.enabled,
        cooldownHours: settings.cooldownHours,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createRoomPreview(request, response) {
  const settings = await getAiSettings();
  assertRequest(settings.enabled, 403, 'AI image generation is currently disabled.');

  const { roomImage, productImageUrl, productName, productDescription } = request.body ?? {};

  assertRequest(typeof roomImage === 'string' && imageDataUrlPattern.test(roomImage), 400, 'Room image must be a PNG, JPEG, or WEBP data URL.');
  assertRequest(
    typeof productImageUrl === 'string' && (productImageUrl.startsWith('http') || imageDataUrlPattern.test(productImageUrl)),
    400,
    'Product image must be an absolute HTTP URL or PNG, JPEG, WEBP data URL.',
  );

  assertRequest(env.openaiApiKey, 503, 'OpenAI image generation is not configured. Add OPENAI_API_KEY to the backend environment.');

  const generationIdentity = getAiGenerationIdentity(request);
  await assertAiGenerationAllowed(generationIdentity, settings.cooldownHours);

  const prompt = [
    roomPreviewPrompt,
    productName ? `Product name: ${productName}` : null,
    productDescription ? `Product details: ${productDescription}` : null,
  ].filter(Boolean).join('\n\n');

  const formData = new FormData();
  formData.append('model', env.openaiImageModel);
  formData.append('prompt', prompt);
  formData.append('quality', 'high');
  formData.append('size', '1024x1024');
  formData.append('image[]', dataUrlToBlob(roomImage), 'room.jpg');
  formData.append('image[]', await imageInputToBlob(productImageUrl), 'product.png');

  const openaiResponse = await fetch(openaiImageEditsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: formData,
  });

  const data = await openaiResponse.json().catch(() => ({}));

  if (!openaiResponse.ok) {
    const message = getOpenAIErrorMessage(openaiResponse.status, data);
    await updateAiSettings({
      lastError: {
        status: openaiResponse.status,
        message,
        at: new Date().toISOString(),
      },
    });
    notifyAdminAboutAiError({ status: openaiResponse.status, message, productName });
    throw new HttpError(openaiResponse.status, message);
  }

  const imageBase64 = data.data?.[0]?.b64_json;
  assertRequest(imageBase64, 502, 'OpenAI response did not include a generated image.');
  const limit = await markAiGenerationUsed(generationIdentity, settings.cooldownHours);

  response.json({
    image: `data:image/png;base64,${imageBase64}`,
    usage: data.usage ?? null,
    model: env.openaiImageModel,
    limit,
  });
}
