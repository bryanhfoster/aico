// SSOT placeholder: re-export and gradually replace schemas from existing files.
// Define new canonical Zod contracts here and consume from server/client.

import { z } from 'zod';
// Import existing pieces to maintain compatibility during migration
export * as legacySchemas from './zodSchemas';

// Common primitives
export const Guid = z.string().min(1);
export const IsoTimestamp = z.string().datetime();

// WebSocket messages (example scaffolds)
export const WsHello = z.object({ guid: Guid });
export const WsWhoAmI = z.object({ whoami: Guid, onlineGuids: z.array(Guid), messageHistory: z.array(z.string()) });
export const WsUserMessage = z.object({ guid: Guid, message: z.string().min(1).max(2000), sentAt: IsoTimestamp });
export const WsAssistantMessage = z.object({ message: z.string().min(1) });
export const WsPresence = z.object({ onlineGuids: z.array(Guid) });
export const WsError = z.object({ error: z.string().min(1) });

// SSOT shapes — new canonical shape uses `data` wrapper; provide adapters below for legacy server usage
export const WsServerToClient = z.discriminatedUnion('type', [
  z.object({ type: z.literal('whoami'), data: WsWhoAmI }),
  z.object({ type: z.literal('assistant_message'), data: WsAssistantMessage }),
  z.object({ type: z.literal('presence'), data: WsPresence }),
  z.object({ type: z.literal('error'), data: WsError })
]);

export const WsClientToServer = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), data: WsHello }),
  z.object({ type: z.literal('user_message'), data: WsUserMessage })
]);

// Legacy-compatible validators using current server payload shape
export const wsClientToServerSchema = z.object({
  type: z.enum(['hello', 'user_message']),
  guid: Guid,
  message: z.string().optional()
});
export type WsClientToServerLegacy = z.infer<typeof wsClientToServerSchema>;

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  guid: Guid,
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  createdAt: IsoTimestamp
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const wsServerToClientSchema = z.object({
  type: z.enum(['whoami', 'assistant_message', 'error', 'presence']),
  whoami: z.any().optional(),
  message: chatMessageSchema.optional(),
  onlineGuids: z.array(Guid).optional(),
  messageHistory: z.array(chatMessageSchema).optional()
});
export type WsServerToClientLegacy = z.infer<typeof wsServerToClientSchema>;

export type Guid = z.infer<typeof Guid>;
export type IsoTimestamp = z.infer<typeof IsoTimestamp>;
export type WsHello = z.infer<typeof WsHello>;
export type WsWhoAmI = z.infer<typeof WsWhoAmI>;
export type WsUserMessage = z.infer<typeof WsUserMessage>;
export type WsAssistantMessage = z.infer<typeof WsAssistantMessage>;
export type WsPresence = z.infer<typeof WsPresence>;
export type WsError = z.infer<typeof WsError>;
export type WsServerToClient = z.infer<typeof WsServerToClient>;
export type WsClientToServer = z.infer<typeof WsClientToServer>;


