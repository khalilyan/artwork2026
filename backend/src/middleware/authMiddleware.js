import { ObjectId } from 'mongodb';
import { verifyAuthToken } from '../utils/auth.js';
import { HttpError } from '../utils/httpError.js';
import { usersCollection } from '../models/userModel.js';
import { env } from '../config/env.js';

export async function requireAuth(request, _response, next) {
  try {
    const authorization = request.headers.authorization ?? '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(401, 'Authentication is required.');
    }

    const payload = verifyAuthToken(token);
    if (!payload?.sub || !ObjectId.isValid(payload.sub)) {
      throw new HttpError(401, 'Invalid or expired authentication token.');
    }

    const user = await usersCollection().findOne({ _id: new ObjectId(payload.sub) });
    if (!user || user.status !== 'active') {
      throw new HttpError(401, 'Account is not available.');
    }

    if (env.adminEmails.includes(user.emailNormalized)) {
      user.role = 'admin';
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(request, _response, next) {
  try {
    const authorization = request.headers.authorization ?? '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      next();
      return;
    }

    const payload = verifyAuthToken(token);
    if (!payload?.sub || !ObjectId.isValid(payload.sub)) {
      next();
      return;
    }

    const user = await usersCollection().findOne({ _id: new ObjectId(payload.sub) });
    if (user?.status === 'active') {
      if (env.adminEmails.includes(user.emailNormalized)) {
        user.role = 'admin';
      }

      request.user = user;
    }

    next();
  } catch {
    next();
  }
}

export function requireAdmin(request, _response, next) {
  try {
    if (request.user?.role !== 'admin') {
      throw new HttpError(403, 'Administrator access is required.');
    }

    next();
  } catch (error) {
    next(error);
  }
}
