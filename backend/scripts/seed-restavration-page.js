import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDatabase, connectDatabase } from '../src/db/mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadRestavrationPageSeed() {
  const seedPath = path.resolve(__dirname, '..', '..', 'database', 'mongodb-seed', 'pages.json');
  const raw = await readFile(seedPath, 'utf8');
  const pages = JSON.parse(raw);

  const page = pages.find((item) => item?.slug === 'restavration');
  if (!page) throw new Error('Could not find restavration page seed in database/mongodb-seed/pages.json');

  return page;
}

try {
  const restavrationPage = await loadRestavrationPageSeed();
  const db = await connectDatabase();
  const pagesCollection = db.collection('pages');
  const now = new Date().toISOString();

  const {
    _id,
    ...pagePayload
  } = restavrationPage;

  await pagesCollection.updateOne(
    { slug: 'restavration' },
    {
      $set: {
        ...pagePayload,
        updatedAt: now,
      },
      $setOnInsert: {
        _id,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  console.log('Restavration page seeded successfully.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
