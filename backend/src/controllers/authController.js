import { ObjectId } from 'mongodb';
import { createAuthToken, hashPassword, verifyPassword } from '../utils/auth.js';
import { assertRequest, HttpError } from '../utils/httpError.js';
import { isEmail, normalizeEmail, normalizePhone, toCleanString } from '../utils/validators.js';
import { findUserByEmail, insertUser, toPublicUser, usersCollection } from '../models/userModel.js';
import { env } from '../config/env.js';

async function findUserByPhone(phone) {
  const phoneNormalized = normalizePhone(phone);
  const directMatch = await usersCollection().findOne({
    $or: [
      { 'profile.phoneNormalized': phoneNormalized },
      { 'profile.phone': phone },
    ],
  });

  if (directMatch) return directMatch;

  const usersWithPhones = await usersCollection()
    .find({ 'profile.phone': { $exists: true, $ne: null } })
    .toArray();

  return usersWithPhones.find((user) => normalizePhone(user.profile?.phone) === phoneNormalized) ?? null;
}

function createAuthResponse(user) {
  const publicUser = toPublicUser(user);
  if (env.adminEmails.includes(publicUser.emailNormalized)) {
    publicUser.role = 'admin';
  }

  return {
    token: createAuthToken(user),
    user: publicUser,
  };
}

export async function signup(request, response, next) {
  try {
    const fullName = toCleanString(request.body.fullName);
    const email = toCleanString(request.body.email);
    const password = String(request.body.password ?? '');
    const phone = toCleanString(request.body.phone);
    const phoneNormalized = normalizePhone(phone);
    const defaultShippingAddress = toCleanString(request.body.defaultShippingAddress);
    const emailNormalized = normalizeEmail(email);

    assertRequest(fullName.length >= 2, 400, 'Full name is required.');
    assertRequest(isEmail(email), 400, 'Email address must be valid and include @.');
    assertRequest(password.length >= 8, 400, 'Password must be at least 8 characters.');
    assertRequest(phoneNormalized.length >= 6, 400, 'Phone number is required.');
    assertRequest(defaultShippingAddress.length >= 3, 400, 'Shipping address is required.');

    const existingUser = await findUserByEmail(emailNormalized);
    if (existingUser) {
      throw new HttpError(409, 'Այս էլ. հասցեով հաշիվ արդեն գրանցված է։ Մուտք գործեք ձեր հաշիվ։');
    }

    const existingPhoneUser = await findUserByPhone(phone);
    if (existingPhoneUser) {
      throw new HttpError(409, 'Տվյալ հեռախոսահամարով գրանցում արդեն կա');
    }

    const now = new Date().toISOString();
    const user = {
      _id: new ObjectId(),
      email,
      emailNormalized,
      fullName,
      role: env.adminEmails.includes(emailNormalized) ? 'admin' : 'customer',
      status: 'active',
      password: await hashPassword(password),
      profile: {
        phone,
        phoneNormalized,
        defaultShippingAddress,
      },
      saved_items: [],
      cart: [],
      orders: [],
      createdAt: now,
      updatedAt: now,
    };

    await insertUser(user);
    response.status(201).json(createAuthResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    const email = toCleanString(request.body.email);
    const password = String(request.body.password ?? '');

    assertRequest(isEmail(email), 400, 'Email address must be valid and include @.');
    assertRequest(password.length > 0, 400, 'Password is required.');

    const user = await findUserByEmail(email);
    const isPasswordValid = user ? await verifyPassword(password, user.password) : false;

    if (!user || !isPasswordValid) {
      throw new HttpError(401, 'Email or password is incorrect.');
    }

    if (user.status !== 'active') {
      throw new HttpError(403, 'Account is not active.');
    }

    response.json(createAuthResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function me(request, response) {
  response.json({ user: toPublicUser(request.user) });
}
