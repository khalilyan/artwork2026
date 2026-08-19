import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

let client;
let database;

export async function connectDatabase() {
  if (database) return database;

  client = new MongoClient(env.mongoUri);
  await client.connect();
  database = env.mongoDbName ? client.db(env.mongoDbName) : client.db();
  await ensureIndexes(database);

  return database;
}

export function getDatabase() {
  if (!database) {
    throw new Error('Database is not connected.');
  }

  return database;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection('users').createIndex({ emailNormalized: 1 }, { unique: true }),
    db.collection('users').createIndex({ 'profile.phoneNormalized': 1 }),
    db.collection('rooms').createIndex({ slug: 1 }, { unique: true }),
    db.collection('rooms').createIndex({ 'furnitureTypes.slug': 1 }),
    db.collection('rooms').createIndex({ 'furnitureTypes.products.slug': 1 }),
    db.collection('contacts').createIndex({ createdAt: -1 }),
    db.collection('contacts').createIndex({ status: 1 }),
    db.collection('ai_generation_limits').createIndex({ key: 1 }, { unique: true }),
    db.collection('ai_generation_limits').createIndex({ lastGeneratedAt: 1 }),
  ]);
}
