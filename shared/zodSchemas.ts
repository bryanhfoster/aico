import { z } from 'zod';

// GUID and identity
export const guidSchema = z.string().uuid();

export const clientIdentitySchema = z.object({
  guid: guidSchema,
  firstVisit: z.string().datetime(),
  lastSeen: z.string().datetime(),
  hasAccount: z.boolean().default(false),
  accountCreated: z.string().datetime().optional(),
  lastLogin: z.string().datetime().optional(),
  username: z.string().optional(),
  email: z.string().email().optional(),
  messages: z.array(z.string()).default([])
});

export type ClientIdentity = z.infer<typeof clientIdentitySchema>;

// Chat messages
export const messageRoleSchema = z.enum(['user', 'assistant', 'system']);
export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  guid: guidSchema,
  role: messageRoleSchema,
  content: z.string(),
  createdAt: z.string().datetime()
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

// WebSocket payloads
export const wsClientToServerSchema = z.object({
  type: z.enum(['hello', 'user_message']),
  guid: guidSchema,
  message: z.string().optional()
});
export type WsClientToServer = z.infer<typeof wsClientToServerSchema>;

export const wsServerToClientSchema = z.object({
  type: z.enum(['whoami', 'assistant_message', 'error', 'presence']),
  whoami: clientIdentitySchema.optional(),
  message: chatMessageSchema.optional(),
  onlineGuids: z.array(guidSchema).optional(),
  messageHistory: z.array(chatMessageSchema).optional()
});
export type WsServerToClient = z.infer<typeof wsServerToClientSchema>;

// REST payloads
export const accountUpsertSchema = z.object({
  guid: guidSchema,
  username: z.string().optional(),
  email: z.string().email().optional(),
  createIfMissing: z.boolean().default(true)
});
export type AccountUpsert = z.infer<typeof accountUpsertSchema>;

export const loginRequestSchema = z.object({
  guid: guidSchema,
  username: z.string().optional(),
  email: z.string().email().optional()
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const whoamiResponseSchema = z.object({
  guid: guidSchema,
  hasAccount: z.boolean(),
  lastLogin: z.string().datetime().nullable(),
  messageHistory: z.array(chatMessageSchema)
});
export type WhoAmIResponse = z.infer<typeof whoamiResponseSchema>;

// DB shape
export const dbSchema = z.object({
  clients: z
    .record(guidSchema, clientIdentitySchema)
    .default({} as Record<string, z.infer<typeof clientIdentitySchema>>),
  messages: z.array(chatMessageSchema).default([]),
  sessions: z
    .array(
      z.object({
        guid: guidSchema,
        connectedAt: z.string().datetime(),
        disconnectedAt: z.string().datetime().optional()
      })
    )
    .default([]),
  // Tripmaster entities
  tmDrivers: z
    .array(
      z.object({ id: z.number().int().nonnegative(), firstName: z.string(), lastName: z.string(), displayName: z.string() })
    )
    .default([]),
  tmVehicles: z.array(z.object({ id: z.number().int().nonnegative(), number: z.string() })).default([]),
  tmRoutes: z
    .array(
      z.object({
        id: z.number().int().nonnegative(),
        routeNumber: z.number().int(),
        description: z.string(),
        date: z.string(),
        availabilityStart: z.string(),
        availabilityEnd: z.string(),
        scheduledStart: z.string(),
        scheduledEnd: z.string(),
        provider: z.string().optional(),
        driverId: z.number().int().nonnegative().optional(),
        vehicleId: z.number().int().nonnegative().optional(),
        status: z.number().int().default(0),
        seatCapacity: z.number().int().default(0),
        wheelChairCapacity: z.number().int().default(0),
        stretcherCapacity: z.number().int().default(0),
        break: z.string().optional()
      })
    )
    .default([]),
  tmTrips: z
    .array(
      z.object({
        id: z.number().int().nonnegative(),
        date: z.string(),
        accountCode: z.string().optional(),
        riderFirstName: z.string(),
        riderLastName: z.string()
      })
    )
    .default([]),
  tmLegs: z
    .array(
      z.object({
        id: z.number().int().nonnegative(),
        tripId: z.number().int().nonnegative(),
        priorityType: z.number().int().default(0),
        priorityTime: z.string().nullable().optional(),
        willCall: z.number().int().default(0),
        willCallReady: z.number().int().default(0),
        comments: z.string().default(''),
        pickupName: z.string(),
        pickupAddress: z.string(),
        dropoffName: z.string(),
        dropoffAddress: z.string(),
        pickupScheduledTime: z.string(),
        dropoffScheduledTime: z.string().nullable().optional(),
        seats: z.number().int().default(1),
        wheelChairs: z.number().int().default(0),
        stretchers: z.number().int().default(0),
        provider: z.string().optional()
      })
    )
    .default([]),
  tmRouteAssignments: z
    .array(z.object({ routeId: z.number().int().nonnegative(), legId: z.number().int().nonnegative() }))
    .default([])
});
export type DbData = z.infer<typeof dbSchema>;


