import { hashPassword, verifyPassword } from '../utils/auth.js';
import { assertRequest, HttpError } from '../utils/httpError.js';
import { isEmail, normalizeEmail, normalizePhone, toCleanString } from '../utils/validators.js';
import { findUserByEmail, toPublicUser, updateUserById, usersCollection } from '../models/userModel.js';

export async function getAccount(request, response) {
  response.json({ user: toPublicUser(request.user) });
}

export async function updateAccountDetails(request, response, next) {
  try {
    const fullName = toCleanString(request.body.fullName, request.user.fullName);
    const email = toCleanString(request.body.email, request.user.email);
    const phone = toCleanString(request.body.phone);
    const phoneNormalized = normalizePhone(phone);
    const defaultShippingAddress = toCleanString(request.body.defaultShippingAddress);
    const emailNormalized = normalizeEmail(email);

    assertRequest(fullName.length >= 2, 400, 'Full name is required.');
    assertRequest(isEmail(email), 400, 'Email address must be valid and include @.');

    if (emailNormalized !== request.user.emailNormalized) {
      const existingUser = await findUserByEmail(emailNormalized);
      if (existingUser) {
        throw new HttpError(409, 'This email address is already used by another account.');
      }
    }

    const user = await updateUserById(request.user._id, {
      $set: {
        fullName,
        email,
        emailNormalized,
        'profile.phone': phone || null,
        'profile.phoneNormalized': phoneNormalized || null,
        'profile.defaultShippingAddress': defaultShippingAddress || null,
        updatedAt: new Date().toISOString(),
      },
    });

    response.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updatePassword(request, response, next) {
  try {
    const currentPassword = String(request.body.currentPassword ?? '');
    const nextPassword = String(request.body.nextPassword ?? '');

    assertRequest(currentPassword.length > 0, 400, 'Current password is required.');
    assertRequest(nextPassword.length >= 8, 400, 'New password must be at least 8 characters.');

    const isCurrentPasswordValid = await verifyPassword(currentPassword, request.user.password);
    if (!isCurrentPasswordValid) {
      throw new HttpError(401, 'Current password is incorrect.');
    }

    await usersCollection().updateOne(
      { _id: request.user._id },
      {
        $set: {
          password: await hashPassword(nextPassword),
          updatedAt: new Date().toISOString(),
        },
      },
    );

    response.json({ message: 'Password updated.' });
  } catch (error) {
    next(error);
  }
}
