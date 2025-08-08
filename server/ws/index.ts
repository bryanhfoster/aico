import type { FastifyInstance } from 'fastify';
import type { Db } from '../db.js';
import type { SocketStream } from '@fastify/websocket';
import { OpenAI } from 'openai';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  wsClientToServerSchema,
  type WsClientToServer,
  type WsServerToClient,
  chatMessageSchema,
  type ChatMessage
} from '../../shared/contracts';
import { addOnlineGuid, removeOnlineGuid, listOnlineGuids } from './presence.js';

type Client = { guid: string; conn: SocketStream };

export async function registerWs(app: FastifyInstance, db: Db) {
  const openaiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

  const clients = new Map<string, Client>();

  // Declare route to enable upgrade; actual handling via global listener
  app.get('/ws', { websocket: true }, () => {});

  // Handle all WS connections and filter by path
  app.websocketServer?.on('connection', (ws: any, req: any) => {
    try {
      if (!req || req.url !== '/ws') return;
      app.log.info({ url: req.url, headers: req.headers }, 'WS: connection established');
      if (!ws || typeof ws.on !== 'function') {
        app.log.error('WS: invalid connection object');
        return;
      }
    } catch (err) {
      app.log.error({ err }, 'WS: connection handler error');
      return;
    }

    ws.on('message', async (raw: any) => {
      try {
        const rawString = String(raw);
        app.log.info({ raw: rawString }, 'WS: message received');
        const parsed = JSON.parse(rawString);
        const msg = wsClientToServerSchema.parse(parsed);
        if (msg.type === 'hello') {
          await handleHello({ socket: ws } as any, msg.guid);
          return;
        }
        if (msg.type === 'user_message') {
          await handleUserMessage({ socket: ws } as any, msg);
          return;
        }
      } catch (err) {
        const payload: WsServerToClient = { type: 'error' };
        safeSend({ socket: ws } as any, payload);
        app.log.error(err, 'WS: error handling message');
      }
    });

    ws.on('close', async () => {
      app.log.info('WS: connection closed');
      // Attempt to remove from presence if known
      for (const [g, c] of clients.entries()) {
        if (c.conn.socket === ws) {
          clients.delete(g);
          removeOnlineGuid(g);
          app.log.info({ guid: g, online: listOnlineGuids() }, 'WS: removed client on close');
          break;
        }
      }
    });
  });

  async function handleHello(conn: SocketStream, guid: string) {
    app.log.info({ guid }, 'WS: hello');
    clients.set(guid, { guid, conn });
    addOnlineGuid(guid);
    const now = new Date().toISOString();
    const existing = db.data.clients[guid];
    if (!existing) {
      db.data.clients[guid] = {
        guid,
        firstVisit: now,
        lastSeen: now,
        hasAccount: false,
        messages: []
      };
      await db.write();
    } else {
      existing.lastSeen = now;
      await db.write();
    }

    const messageHistory = db.data.messages.filter((m) => m.guid === guid);
    const payload: WsServerToClient = {
      type: 'whoami',
      whoami: db.data.clients[guid],
      message: undefined,
      onlineGuids: listOnlineGuids(),
      messageHistory
    };
    app.log.info({ guid, online: payload.onlineGuids }, 'WS: whoami sent');
    safeSend(conn, payload);
    broadcastPresence();
  }

  async function handleUserMessage(conn: SocketStream, msg: WsClientToServer) {
    const guid = msg.guid;
    const text = msg.message || '';
    const now = new Date().toISOString();
    app.log.info({ guid, text }, 'WS: user_message');

    const userMessage: ChatMessage = {
      id: randomUUID(),
      guid,
      role: 'user',
      content: text,
      createdAt: now
    };
    db.data.messages.push(userMessage);
    await db.write();

    // Light auth logic
    const user = db.data.clients[guid];
    if (text.trim().toLowerCase() === 'login') {
      if (!user?.hasAccount) {
        return safeSend(conn, {
          type: 'assistant_message',
          message: {
            id: randomUUID(),
            guid,
            role: 'assistant',
            content: "You don’t have an account yet. Want to create one?",
            createdAt: new Date().toISOString()
          }
        } satisfies WsServerToClient);
      }
      user.lastLogin = new Date().toISOString();
      await db.write();
      return safeSend(conn, {
        type: 'assistant_message',
        message: {
          id: randomUUID(),
          guid,
          role: 'assistant',
          content: 'Please provide your email and password to proceed (mocked for now).',
          createdAt: new Date().toISOString()
        }
      } satisfies WsServerToClient);
    }

    // OpenAI response (fallback to echo if no key)
    const assistantText = await generateAssistantReply(text, openai);
    const assistantMessage: ChatMessage = {
      id: randomUUID(),
      guid,
      role: 'assistant',
      content: assistantText,
      createdAt: new Date().toISOString()
    };
    db.data.messages.push(assistantMessage);
    await db.write();
    app.log.info({ guid, assistantText }, 'WS: assistant_message');
    safeSend(conn, { type: 'assistant_message', message: assistantMessage });
  }

  function safeSend(conn: SocketStream, payload: WsServerToClient) {
    try {
      conn.socket.send(JSON.stringify(payload));
    } catch (err) {
      app.log.error({ err }, 'send failed');
    }
  }

  function broadcastPresence() {
    const payload: WsServerToClient = {
      type: 'presence',
      onlineGuids: listOnlineGuids()
    };
    const data = JSON.stringify(payload);
    app.log.info({ online: payload.onlineGuids }, 'WS: broadcast presence');
    for (const { conn } of clients.values()) {
      try {
        conn.socket.send(data);
      } catch {}
    }
  }
}

async function generateAssistantReply(text: string, openai: OpenAI | null): Promise<string> {
  if (!openai) {
    return `Echo: ${text}`;
  }
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: text }
      ],
      temperature: 0.7
    });
    return resp.choices[0]?.message?.content || '...';
  } catch (err) {
    return `Error contacting AI: ${(err as Error).message}`;
  }
}


