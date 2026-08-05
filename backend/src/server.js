import { env } from './config/env.js';
import { connectDatabase } from './db/mongo.js';
import { createApp } from './app.js';

async function startServer() {
  await connectDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`ARTWORK API running on http://localhost:${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start ARTWORK API.', error);
  process.exit(1);
});
