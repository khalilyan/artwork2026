import { env } from './config/env.js';
import { connectDatabase } from './db/mongo.js';
import { createApp } from './app.js';

async function startServer() {
  await connectDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    console.log('[ARTWORK_BOOT]', {
      marker: app.locals.instanceMarker,
      build: app.locals.backendBuild,
      appModule: app.locals.appModule,
      startedAt: app.locals.startedAt,
      cwd: process.cwd(),
      port: env.port,
      node: process.version,
    });
    console.log(`ARTWORK API running on http://localhost:${env.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start ARTWORK API.', error);
  process.exit(1);
});
