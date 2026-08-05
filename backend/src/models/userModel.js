import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/mongo.js';
import { normalizeEmail } from '../utils/validators.js';

const privateProjection = { password: 0 };

export function usersCollection() {
  return getDatabase().collection('users');
}

export async function findUserByEmail(email, options = {}) {
  return usersCollection().findOne({ emailNormalized: normalizeEmail(email) }, options);
}

export async function findUserById(userId, options = {}) {
  if (!ObjectId.isValid(userId)) return null;
  return usersCollection().findOne({ _id: new ObjectId(userId) }, options);
}

export async function findPublicUserById(userId) {
  return findUserById(userId, { projection: privateProjection });
}

export async function insertUser(user) {
  const result = await usersCollection().insertOne(user);
  return findPublicUserById(result.insertedId);
}

export async function updateUserById(userId, update) {
  await usersCollection().updateOne({ _id: new ObjectId(userId) }, update);
  return findPublicUserById(userId);
}

export function toPublicUser(user) {
  if (!user) return null;
  const { password, ...publicUser } = user;
  return publicUser;
}
