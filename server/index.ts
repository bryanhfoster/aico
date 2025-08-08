import 'dotenv/config';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { createDb, type Db } from './db.ts';
import { registerWs } from './ws/index.ts';
import { registerRoutes } from './routes/index.ts';
import { seedTripmaster } from './tm-seed.ts';

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: (origin, cb) => cb(null, true), credentials: false });
  await app.register(websocket);

  const db: Db = await createDb();
  await seedTripmaster(db);

  await registerRoutes(app, db);
  await registerWs(app, db);

  const port = Number(process.env.PORT || 5175);
  const host = process.env.HOST || '0.0.0.0';
  await app.listen({ port, host });
  app.log.info(`Server listening on http://${host}:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


