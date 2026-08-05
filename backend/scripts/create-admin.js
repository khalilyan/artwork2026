import { ObjectId } from 'mongodb';
import { closeDatabase, connectDatabase } from '../src/db/mongo.js';
import { hashPassword } from '../src/utils/auth.js';
import { normalizeEmail, toCleanString } from '../src/utils/validators.js';

const [, , emailArg, passwordArg, fullNameArg] = process.argv;

const email = toCleanString(emailArg ?? process.env.ADMIN_EMAIL ?? process.env.ADMIN_USER_EMAIL);
const password = String(passwordArg ?? process.env.ADMIN_PASSWORD ?? '');
const fullName = toCleanString(fullNameArg ?? process.env.ADMIN_NAME, 'Artwork Admin');

if (!email || !email.includes('@')) {
  console.error('Usage: npm run admin:create -- admin@example.com "StrongPassword123" "Admin Name"');
  console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Admin password must be at least 8 characters.');
  process.exit(1);
}

const emailNormalized = normalizeEmail(email);
const now = new Date().toISOString();

try {
  const db = await connectDatabase();
  const users = db.collection('users');
  const existingUser = await users.findOne({ emailNormalized });

  if (existingUser) {
    await users.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          email,
          emailNormalized,
          fullName: existingUser.fullName || fullName,
          role: 'admin',
          status: 'active',
          password: await hashPassword(password),
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
    );

    console.log(`Promoted existing user to admin: ${emailNormalized}`);
  } else {
    await users.insertOne({
      _id: new ObjectId(),
      email,
      emailNormalized,
      fullName,
      role: 'admin',
      status: 'active',
      password: await hashPassword(password),
      profile: {
        phone: '',
        defaultShippingAddress: '',
      },
      saved_items: [],
      cart: [],
      orders: [],
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Created admin user: ${emailNormalized}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
