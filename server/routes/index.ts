import type { FastifyInstance } from 'fastify';
import type { Db } from '../db.js';
import { z } from 'zod';
import { guidSchema } from '../../shared/zodSchemas';
import { listOnlineGuids } from '../ws/presence.js';

export async function registerRoutes(app: FastifyInstance, db: Db) {
  app.get('/api/guids', async () => ({ onlineGuids: listOnlineGuids() }))

  app.get('/api/health', async () => ({ ok: true }));


  app.post('/api/account', async (req, res) => {
    const body = req.body as any;
    const schema = z.object({
      guid: guidSchema,
      username: z.string().optional(),
      email: z.string().email().optional()
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).send({ error: parsed.error.flatten() });
    }

    const { guid, username, email } = parsed.data;
    const now = new Date().toISOString();
    const existing = db.data.clients[guid];
    if (!existing) {
      db.data.clients[guid] = {
        guid,
        firstVisit: now,
        lastSeen: now,
        hasAccount: true,
        accountCreated: now,
        lastLogin: now,
        username,
        email,
        messages: []
      };
    } else {
      existing.hasAccount = true;
      existing.accountCreated = existing.accountCreated ?? now;
      existing.lastLogin = now;
      if (username) existing.username = username;
      if (email) existing.email = email;
      existing.lastSeen = now;
    }
    await db.write();
    return { ok: true };
  });
}


