import { ObjectId } from 'mongodb';
import { appendProductReview } from '../models/productModel.js';
import { assertRequest, HttpError } from '../utils/httpError.js';
import { toCleanString, toRating } from '../utils/validators.js';

const maxReviewImages = 4;

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => toCleanString(image))
    .filter((image) => image.startsWith('data:image/'))
    .slice(0, maxReviewImages);
}

export async function createReview(request, response, next) {
  try {
    const productSlug = toCleanString(request.params.productSlug);
    const rate = toRating(request.body.rate);
    const review = toCleanString(request.body.review);
    const username = toCleanString(request.body.username, request.user.fullName);
    const images = normalizeImages(request.body.images);

    assertRequest(productSlug, 400, 'Product slug is required.');
    assertRequest(rate, 400, 'Review rate must be an integer from 1 to 5.');
    assertRequest(review.length >= 3, 400, 'Review text is required.');

    const reviewItem = {
      _id: new ObjectId(),
      username,
      rate,
      review,
      images,
      userId: request.user._id,
      createdAt: new Date().toISOString(),
    };
    const product = await appendProductReview(productSlug, reviewItem);

    if (!product) {
      throw new HttpError(404, 'Product was not found.');
    }

    response.status(201).json({ productSlug, reviews: product.reviews ?? [] });
  } catch (error) {
    next(error);
  }
}
