import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { google } from 'googleapis';
import { createAuthToken, hashPassword, verifyPassword } from '../utils/auth.js';
import { assertRequest, HttpError } from '../utils/httpError.js';
import { isEmail, normalizeEmail, normalizePhone, toCleanString } from '../utils/validators.js';
import { findUserByEmail, insertUser, toPublicUser, usersCollection } from '../models/userModel.js';
import { env } from '../config/env.js';

const socialRedirectPath = '/auth';
const socialDefaultTargetPath = '/account';
const googleScopes = ['openid', 'email', 'profile'];
const facebookScopes = ['email', 'public_profile'];
const facebookApiVersion = 'v23.0';

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

function normalizeOrigin(value) {
  return String(value ?? '').trim().replace(/\/+$/, '');
}

function normalizeApiBase(value) {
  return normalizeOrigin(value).replace(/\/api$/i, '');
}

function createGoogleRedirectUri() {
  const configuredRedirectUri = toCleanString(process.env.GOOGLE_AUTH_REDIRECT_URI);
  if (configuredRedirectUri) return configuredRedirectUri;

  const publicApiOrigin = normalizeApiBase(env.publicApiUrl);
  return `${publicApiOrigin || 'http://localhost:4000'}/api/auth/google/callback`;
}

function createFacebookRedirectUri() {
  const configuredRedirectUri = toCleanString(process.env.FACEBOOK_AUTH_REDIRECT_URI);
  if (configuredRedirectUri) return configuredRedirectUri;

  const publicApiOrigin = normalizeApiBase(env.publicApiUrl);
  return `${publicApiOrigin || 'http://localhost:4000'}/api/auth/facebook/callback`;
}

function getGoogleAuthConfig() {
  return {
    clientId: toCleanString(process.env.GOOGLE_AUTH_CLIENT_ID, env.gmailClientId),
    clientSecret: toCleanString(process.env.GOOGLE_AUTH_CLIENT_SECRET, env.gmailClientSecret),
    redirectUri: createGoogleRedirectUri(),
  };
}

function getFacebookAuthConfig() {
  return {
    appId: toCleanString(process.env.FACEBOOK_APP_ID),
    appSecret: toCleanString(process.env.FACEBOOK_APP_SECRET),
    redirectUri: createFacebookRedirectUri(),
  };
}

function getAllowedClientOrigins() {
  const origins = [];
  const pushOrigin = (origin) => {
    const normalized = normalizeOrigin(origin);
    if (!normalized) return;
    if (!origins.includes(normalized)) origins.push(normalized);
  };

  env.clientOrigins.forEach((origin) => pushOrigin(origin));
  pushOrigin(env.publicSiteUrl);
  return origins;
}

function sanitizeClientOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized);
    const expectedOrigin = normalizeOrigin(parsed.origin);
    return getAllowedClientOrigins().includes(expectedOrigin) ? expectedOrigin : '';
  } catch {
    return '';
  }
}

function sanitizeRedirectPath(pathname) {
  const candidate = toCleanString(pathname, socialDefaultTargetPath);
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return socialDefaultTargetPath;
  }

  return candidate.startsWith('/auth') ? socialDefaultTargetPath : candidate;
}

function createSignedState(payload) {
  const serialized = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.authSecret)
    .update(serialized)
    .digest('base64url');

  return `${serialized}.${signature}`;
}

function parseSignedState(value) {
  const [serialized, signature] = String(value ?? '').split('.');
  if (!serialized || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', env.authSecret)
    .update(serialized)
    .digest('base64url');

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(serialized, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function resolveClientOrigin(request, state = null) {
  const originFromState = sanitizeClientOrigin(state?.origin);
  if (originFromState) return originFromState;

  const publicSiteOrigin = sanitizeClientOrigin(env.publicSiteUrl);
  if (publicSiteOrigin) return publicSiteOrigin;

  const requestOrigin = sanitizeClientOrigin(request.get('origin'));
  if (requestOrigin) return requestOrigin;

  return getAllowedClientOrigins()[0] || `${request.protocol}://${request.get('host')}`;
}

function encodeSocialUser(user) {
  return Buffer.from(JSON.stringify(toPublicUser(user)), 'utf8').toString('base64url');
}

function redirectToFrontendAuth(response, request, state, params) {
  const origin = resolveClientOrigin(request, state);
  const query = new URLSearchParams(params).toString();
  response.redirect(302, `${origin}${socialRedirectPath}${query ? `?${query}` : ''}`);
}

function randomGeneratedPassword() {
  return crypto.randomBytes(32).toString('base64url');
}

async function findOrCreateSocialUser({ provider, providerId, email, fullName, avatarUrl = null }) {
  const now = new Date().toISOString();
  const providerPath = `oauthProviders.${provider}`;
  const providerIdPath = `${providerPath}.id`;
  const emailNormalized = normalizeEmail(email);

  let user = await usersCollection().findOne({ [providerIdPath]: providerId });
  if (!user && emailNormalized) {
    user = await findUserByEmail(emailNormalized);
  }

  const providerPayload = {
    id: providerId,
    email,
    avatarUrl: avatarUrl || null,
    linkedAt: now,
  };

  if (user) {
    const shouldSetRole = env.adminEmails.includes(user.emailNormalized) ? 'admin' : user.role;
    await usersCollection().updateOne(
      { _id: user._id },
      {
        $set: {
          [providerPath]: providerPayload,
          fullName: user.fullName || fullName,
          role: shouldSetRole,
          updatedAt: now,
        },
      },
    );

    return usersCollection().findOne({ _id: user._id });
  }

  const userDocument = {
    _id: new ObjectId(),
    email,
    emailNormalized,
    fullName: fullName || email.split('@')[0],
    role: env.adminEmails.includes(emailNormalized) ? 'admin' : 'customer',
    status: 'active',
    password: await hashPassword(randomGeneratedPassword()),
    profile: {
      phone: null,
      phoneNormalized: null,
      defaultShippingAddress: null,
      avatarUrl: avatarUrl || null,
    },
    oauthProviders: {
      [provider]: providerPayload,
    },
    saved_items: [],
    cart: [],
    orders: [],
    createdAt: now,
    updatedAt: now,
  };

  await usersCollection().insertOne(userDocument);
  return userDocument;
}

function createGoogleOauthClient() {
  const config = getGoogleAuthConfig();
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

function getSocialStateFromRequest(request) {
  return parseSignedState(request.query.state) ?? {
    redirectPath: socialDefaultTargetPath,
    origin: '',
  };
}

function createSocialStartState(request) {
  return createSignedState({
    origin: sanitizeClientOrigin(request.query.origin),
    redirectPath: sanitizeRedirectPath(request.query.redirect),
  });
}

function buildProviderErrorMessage(providerLabel) {
  return `${providerLabel} մուտքը այս պահին հասանելի չէ`;
}

export function startGoogleAuth(request, response, next) {
  try {
    const googleConfig = getGoogleAuthConfig();
    assertRequest(googleConfig.clientId && googleConfig.clientSecret && googleConfig.redirectUri, 500, 'Google auth is not configured.');

    const oauthClient = createGoogleOauthClient();
    const authUrl = oauthClient.generateAuthUrl({
      access_type: 'offline',
      include_granted_scopes: true,
      prompt: 'consent',
      scope: googleScopes,
      state: createSocialStartState(request),
    });

    response.redirect(302, authUrl);
  } catch (error) {
    next(error);
  }
}

export async function handleGoogleAuthCallback(request, response) {
  const socialState = getSocialStateFromRequest(request);

  if (request.query.error) {
    redirectToFrontendAuth(response, request, socialState, {
      socialError: buildProviderErrorMessage('Google'),
      redirect: socialState.redirectPath,
    });
    return;
  }

  try {
    const code = toCleanString(request.query.code);
    assertRequest(code, 400, 'Google authorization code is missing.');

    const oauthClient = createGoogleOauthClient();
    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauthClient });
    const { data } = await oauth2.userinfo.get();

    const email = toCleanString(data.email);
    assertRequest(isEmail(email), 400, 'Google account did not return a valid email.');
    assertRequest(data.verified_email !== false, 400, 'Google email must be verified.');

    const providerId = toCleanString(data.id, email);
    const fullName = toCleanString(data.name, email.split('@')[0]);
    const user = await findOrCreateSocialUser({
      provider: 'google',
      providerId,
      email,
      fullName,
      avatarUrl: toCleanString(data.picture) || null,
    });

    if (user.status !== 'active') {
      throw new HttpError(403, 'Account is not active.');
    }

    const authSession = createAuthResponse(user);
    redirectToFrontendAuth(response, request, socialState, {
      socialToken: authSession.token,
      socialUser: encodeSocialUser(authSession.user),
      redirect: socialState.redirectPath,
    });
  } catch {
    redirectToFrontendAuth(response, request, socialState, {
      socialError: buildProviderErrorMessage('Google'),
      redirect: socialState.redirectPath,
    });
  }
}

export function startFacebookAuth(request, response, next) {
  try {
    const facebookConfig = getFacebookAuthConfig();
    assertRequest(facebookConfig.appId && facebookConfig.appSecret && facebookConfig.redirectUri, 500, 'Facebook auth is not configured.');

    const params = new URLSearchParams({
      client_id: facebookConfig.appId,
      redirect_uri: facebookConfig.redirectUri,
      state: createSocialStartState(request),
      response_type: 'code',
      scope: facebookScopes.join(','),
    });

    response.redirect(302, `https://www.facebook.com/${facebookApiVersion}/dialog/oauth?${params.toString()}`);
  } catch (error) {
    next(error);
  }
}

export async function handleFacebookAuthCallback(request, response) {
  const socialState = getSocialStateFromRequest(request);

  if (request.query.error) {
    redirectToFrontendAuth(response, request, socialState, {
      socialError: buildProviderErrorMessage('Facebook'),
      redirect: socialState.redirectPath,
    });
    return;
  }

  try {
    const code = toCleanString(request.query.code);
    assertRequest(code, 400, 'Facebook authorization code is missing.');

    const facebookConfig = getFacebookAuthConfig();
    assertRequest(facebookConfig.appId && facebookConfig.appSecret && facebookConfig.redirectUri, 500, 'Facebook auth is not configured.');

    const tokenParams = new URLSearchParams({
      client_id: facebookConfig.appId,
      client_secret: facebookConfig.appSecret,
      redirect_uri: facebookConfig.redirectUri,
      code,
    });

    const tokenResponse = await fetch(`https://graph.facebook.com/${facebookApiVersion}/oauth/access_token?${tokenParams.toString()}`);
    const tokenPayload = await tokenResponse.json();
    assertRequest(tokenResponse.ok && tokenPayload.access_token, 400, 'Facebook token exchange failed.');

    const userInfoParams = new URLSearchParams({
      fields: 'id,name,email,picture.type(large)',
      access_token: tokenPayload.access_token,
    });
    const profileResponse = await fetch(`https://graph.facebook.com/me?${userInfoParams.toString()}`);
    const profile = await profileResponse.json();
    assertRequest(profileResponse.ok && profile.id, 400, 'Facebook user data is unavailable.');

    const email = toCleanString(profile.email);
    assertRequest(isEmail(email), 400, 'Facebook account did not return a valid email.');

    const fullName = toCleanString(profile.name, email.split('@')[0]);
    const user = await findOrCreateSocialUser({
      provider: 'facebook',
      providerId: toCleanString(profile.id),
      email,
      fullName,
      avatarUrl: toCleanString(profile?.picture?.data?.url) || null,
    });

    if (user.status !== 'active') {
      throw new HttpError(403, 'Account is not active.');
    }

    const authSession = createAuthResponse(user);
    redirectToFrontendAuth(response, request, socialState, {
      socialToken: authSession.token,
      socialUser: encodeSocialUser(authSession.user),
      redirect: socialState.redirectPath,
    });
  } catch {
    redirectToFrontendAuth(response, request, socialState, {
      socialError: buildProviderErrorMessage('Facebook'),
      redirect: socialState.redirectPath,
    });
  }
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
