import { HumeClient } from 'hume';
import type { ReturnChatEvent } from 'hume/api/resources/empathicVoice';

const client = new HumeClient({
  apiKey: import.meta.env.VITE_HUME_API_KEY,
});

function rememberHumeChatId(chatId: string, chatGroupId?: string) {
  try {
    localStorage.setItem('hume_chat_id', chatId);
    if (chatGroupId) localStorage.setItem('hume_chat_group_id', chatGroupId);
  } catch {}
}

// Persistent socket registry keyed by conversation
type ChatSocket = {
  socket: ReturnType<typeof client.empathicVoice.chat.connect>;
  chatId?: string;
  chatGroupId?: string;
  listenersBound?: boolean;
};
const socketRegistry = new Map<string, ChatSocket>();

function getOrCreateSocket(conversationKey: string): ChatSocket {
  const existing = socketRegistry.get(conversationKey);
  const isClosed = existing && ((existing.socket as any)?.socket?.readyState === 3);
  if (!existing || isClosed) {
    const socket = client.empathicVoice.chat.connect();
    const entry: ChatSocket = { socket };
    socketRegistry.set(conversationKey, entry);
    return entry;
  }
  return existing;
}

function bindChatCapture(entry: ChatSocket) {
  if (entry.listenersBound) return;
  entry.listenersBound = true;
  entry.socket.on('message', (message: any) => {
    try {
      if (!entry.chatId) {
        const mm: any = message;
        const chatId = mm.chat_id ?? mm.chatId ?? mm.chat?.id ?? mm.chat?.chat_id ?? mm.conversation_id ?? mm.conversationId ?? mm.session?.chat_id ?? mm.session?.chatId;
        const chatGroupId = mm.chat_group_id ?? mm.chatGroupId ?? mm.chat?.group_id ?? mm.chat?.chat_group_id ?? mm.group_id ?? mm.groupId;
        if (chatId) {
          entry.chatId = String(chatId);
          entry.chatGroupId = chatGroupId ? String(chatGroupId) : undefined;
          rememberHumeChatId(entry.chatId, entry.chatGroupId);
          console.debug('[Hume] Captured chat id (persistent):', entry.chatId);
        }
      }
    } catch {}
  });
}

export interface HumeResponse {
  text: string;
  audioData?: ArrayBuffer;
  chatId?: string;
}

function createWavHeader(dataLength: number): Uint8Array {
  // Hume AI uses 16kHz sample rate for voice
  const sampleRate = 44100; // Changed from 24000 to 16000
  const numChannels = 1;    // Mono
  const bitsPerSample = 16; // 16-bit audio
  
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + dataLength, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // Format chunk identifier
  writeString(view, 12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Audio format (1 = PCM)
  view.setUint16(20, 1, true);
  // Channel count
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, byteRate, true);
  // Block align (channel count * bytes per sample)
  view.setUint16(32, blockAlign, true);
  // Bits per sample
  view.setUint16(34, bitsPerSample, true);
  // Data chunk identifier
  writeString(view, 36, 'data');
  // Data chunk length
  view.setUint32(40, dataLength, true);
  
  return new Uint8Array(header);
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export const sendAudioToHume = async (audioBlob: Blob, conversationHistory: Array<{ role: 'user' | 'assistant' | 'system', content: string }> = [], chatIdHint?: string, conversationKey: string = 'default'): Promise<HumeResponse> => {
  try {
    const entry = getOrCreateSocket(conversationKey);
    const socket = entry.socket;
    bindChatCapture(entry);
    
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let audioChunks: Uint8Array[] = [];
      let isFirstMessage = true;
      let chatCaptured = false;
      let capturedId: string | undefined;
      
      socket.on("message", (message) => {
        try {
          if (!chatCaptured) {
            const mm: any = message as any;
            const chatId = mm.chat_id ?? mm.chatId ?? mm.chat?.id ?? mm.chat?.chat_id ?? mm.conversation_id ?? mm.conversationId ?? mm.session?.chat_id ?? mm.session?.chatId;
            const chatGroupId = mm.chat_group_id ?? mm.chatGroupId ?? mm.chat?.group_id ?? mm.chat?.chat_group_id ?? mm.group_id ?? mm.groupId;
            if (chatId) {
              chatCaptured = true;
              rememberHumeChatId(String(chatId), chatGroupId ? String(chatGroupId) : undefined);
              console.debug('[Hume] Captured chat id from audio flow:', chatId, chatGroupId ? `(group ${chatGroupId})` : '');
              capturedId = String(chatId);
            }
          }
        } catch {}
        if (message.type === "assistant_message") {
          const text = message.message?.content || '';
          fullResponse += text;
        } 
        else if (message.type === "audio_output") {
          // Handle audio data
          if (message.data) {
            try {
              // Convert base64 to ArrayBuffer
              const binaryString = atob(message.data);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              audioChunks.push(bytes);
            } catch (error) {
              console.error('Error processing audio chunk:', error);
            }
          }
        }
        else if (message.type === "assistant_end") {
          console.log('Received assistant_end with audio chunks:', audioChunks.length);
          
          if (audioChunks.length === 0) {
            // Background sync: make sure latest chat appears in sidebar list
            try { syncChatsIntoLocalStorage(20); } catch {}
            resolve({ text: fullResponse, chatId: capturedId });
            return;
          }
          
          // Combine all audio chunks
          let totalLength = 0;
          audioChunks.forEach(chunk => {
            totalLength += chunk.length;
          });
          
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          audioChunks.forEach(chunk => {
            combined.set(chunk, offset);
            offset += chunk.length;
          });
          
          // Create a WAV header
          const wavHeader = createWavHeader(combined.length);
          const finalAudioData = new Uint8Array(wavHeader.length + combined.length);
          finalAudioData.set(wavHeader, 0);
          finalAudioData.set(combined, wavHeader.length);
          
          resolve({
            text: fullResponse,
            audioData: finalAudioData.buffer,
            chatId: capturedId,
          });
          // Background sync: make sure latest chat appears in sidebar list
          try { syncChatsIntoLocalStorage(20); } catch {}
        }
        else if (message.type === "error") {
          reject(new Error(message.message || 'Unknown error from Hume AI'));
        }
      });
  
      socket.on("error", (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
  
      socket.tillSocketOpen().then(async () => {
        try {
          // Reuse existing chat when available
          try {
            const chatId = chatIdHint || entry.chatId || localStorage.getItem('hume_chat_id');
            const chatGroupId = localStorage.getItem('hume_chat_group_id');
            if (chatId) {
              // @ts-ignore
              socket.socket.send(JSON.stringify({
                type: 'session_settings',
                // pass through identifiers so server continues same chat
                chat_id: chatId,
                ...(chatGroupId ? { chat_group_id: chatGroupId } : {}),
              }));
            }
          } catch {}
          // Only include the most recent message as context
          if (conversationHistory.length > 0) {
            const lastMessage = conversationHistory[conversationHistory.length - 1];
            
            if (lastMessage.role === 'system') {
              // @ts-ignore - Send system message
              socket.socket.send(JSON.stringify({
                type: 'assistant_input',
                text: `[SYS] ${lastMessage.content.substring(0, 200)}`
              }));
            } else if (lastMessage.role === 'assistant') {
              // @ts-ignore - Send assistant message as context
              socket.socket.send(JSON.stringify({
                type: 'assistant_input',
                text: lastMessage.content.substring(0, 200)
              }));
            }
          }
  
          // Convert blob to array buffer
          const arrayBuffer = await audioBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Get the underlying WebSocket instance
          const ws = socket.socket;
          
          // Send audio data in chunks
          const CHUNK_SIZE = 1024 * 4; // 4KB chunks
          for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
            const chunk = uint8Array.subarray(i, i + CHUNK_SIZE);
            const audioData = btoa(String.fromCharCode(...chunk));
            
            // Send audio data with the correct message format
            ws.send(JSON.stringify({
              type: 'audio_input',
              data: audioData
            }));
          }
        } catch (error) {
          reject(error);
        }
      }).catch(reject);
    });
  } catch (error) {
    console.error('Error sending audio to Hume:', error);
    throw error;
  }
};

export const sendMessageToHume = async (messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>, conversationKey: string = 'default', chatIdHint?: string) => {
  try {
    const entry = getOrCreateSocket(conversationKey);
    const socket = entry.socket;
    bindChatCapture(entry);
    
    return new Promise<HumeResponse>((resolve, reject) => {
      let fullResponse = '';
      let finished = false;
      let capturedId: string | undefined;
      let chatCaptured = false;
      
      socket.on("message", (message) => {
        try {
          if (!chatCaptured) {
            const mm: any = message as any;
            const chatId = mm.chat_id ?? mm.chatId ?? mm.chat?.id ?? mm.chat?.chat_id ?? mm.conversation_id ?? mm.conversationId ?? mm.session?.chat_id ?? mm.session?.chatId;
            const chatGroupId = mm.chat_group_id ?? mm.chatGroupId ?? mm.chat?.group_id ?? mm.chat?.chat_group_id ?? mm.group_id ?? mm.groupId;
            if (chatId) {
              chatCaptured = true;
              rememberHumeChatId(String(chatId), chatGroupId ? String(chatGroupId) : undefined);
              console.debug('[Hume] Captured chat id from audio flow:', chatId, chatGroupId ? `(group ${chatGroupId})` : '');
              capturedId = String(chatId);
            }
          }
        } catch {}
        try {
          const mm: any = message as any;
          const cid = mm.chat_id ?? mm.chatId ?? mm.chat?.id ?? mm.chat?.chat_id ?? mm.conversation_id ?? mm.conversationId ?? mm.session?.chat_id ?? mm.session?.chatId;
          if (cid && !capturedId) capturedId = String(cid);
        } catch {}
        if (message.type === "assistant_message") {
          const text = message.message?.content || '';
          fullResponse += text;
        } else if (message.type === 'assistant_end') {
          if (!finished) {
            finished = true;
            // Background sync so history sidebar sees the new chat id
            try { syncChatsIntoLocalStorage(20); } catch {}
            resolve({ text: fullResponse, chatId: capturedId });
          }
        } else if (message.type === "error") {
          reject(new Error(message.message || 'Unknown error from Hume AI'));
        }
      });

      socket.on("error", (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      socket.tillSocketOpen().then(() => {
        // If we already have a known chatId (either captured earlier in this socket or from localStorage), we can optionally ensure session settings
        try {
          const knownChat = chatIdHint || entry.chatId || localStorage.getItem('hume_chat_id');
          const knownGroup = entry.chatGroupId || localStorage.getItem('hume_chat_group_id') || undefined;
          if (knownChat) {
            // @ts-ignore
            (socket as any).socket.send(JSON.stringify({ type: 'session_settings', chat_id: knownChat, ...(knownGroup ? { chat_group_id: knownGroup } : {}) }));
          }
        } catch {}
        const recentMessages = messages.slice(-6); // keep small context
        const last = recentMessages[recentMessages.length - 1];
        // Send limited prior assistant turns as assistant_input so the model has some immediate context
        const prior = recentMessages.slice(0, -1);
        if (prior.length > 0) {
          // Only send short assistant snippets; do NOT send unsupported message types
          for (const m of prior) {
            if (m.role === 'assistant' && m.content) {
              // @ts-ignore send assistant input
              (socket as any).socket.send(JSON.stringify({ type: 'assistant_input', text: String(m.content).slice(0, 200) }));
            }
          }
        }
        // Finally send the raw user input only (no context prefix)
        const userText = String(last?.content ?? '').trim();
        if (userText.length > 0) {
          socket.sendUserInput(userText);
        }
      }).catch(reject);
    });
  } catch (error) {
    console.error('Error calling Hume AI:', error);
    throw error;
  }
};

export const startVoiceSession = async () => {
  return {
    sessionId: 'your-session-id',
  };
};

export const processVoiceInput = async (audioData: Blob) => {
  try {
    const response = await fetch('https://api.hume.ai/v1/voice/process', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_HUME_API_KEY}`,
        'Content-Type': 'audio/wav',
      },
      body: audioData,
    });
    return await response.json();
  } catch (error) {
    console.error('Error processing voice input:', error);
    throw error;
  }
};

// ---- Chat History (via Hume TypeScript SDK) ----

export type HumeChatListItem = {
  chat_id: string;
  chat_group_id?: string;
  created_at?: string;
  ended_at?: string;
  updated_at?: string;
  last_event_at?: string;
};

export async function listChats(page_number = 0, page_size = 20, ascending_order = false) {
  return client.empathicVoice.chats.listChats({
    pageNumber: page_number,
    pageSize: page_size,
    ascendingOrder: ascending_order,
  });
}

export async function listChatGroups(page_number = 0, page_size = 20, ascending_order = false) {
  return await client.empathicVoice.chatGroups.listChatGroups({
    pageNumber: page_number,
    pageSize: page_size,
    ascendingOrder: ascending_order,
  });
}

export type HumeEvent = ReturnChatEvent & {
  // Back-compat additions used by our mapping helpers
  event_type?: string;
  created_at?: string;
};

/** Fetch all chat events using SDK async iterator; returns oldest->newest */
export async function fetchChatEvents(
  chatId: string,
  _opts: { page_size?: number; max_pages?: number; ascending_order?: boolean } = {}
) {
  const all: HumeEvent[] = [];
  try {
    const iterator = await client.empathicVoice.chats.listChatEvents(chatId, { pageNumber: 0 });
    console.log("iterator", JSON.stringify(iterator))
    for await (const ev of iterator) all.push(ev as HumeEvent);
  } catch (err: any) {
    if (err?.status === 404 || /404/.test(String(err?.message))) {
      const e = new Error('HUME_NOT_FOUND');
      (e as any).status = 404;
      throw e;
    }
    throw err;
  }
  const getTs = (e: HumeEvent) => {
    const v = (e as any).timestamp ?? (e as any).created_at;
    return typeof v === 'string' ? Date.parse(v) : (typeof v === 'number' ? v : 0);
  };
  all.sort((a, b) => getTs(a) - getTs(b));
  return all;
}

// Optional: fetch all events for a chat group (aggregate from chats API)
export async function fetchChatGroupEvents(chatGroupId: string) {
  // 1) List recent chats and filter by group id
  const listed: any = await listChats(0, 50, false);
  let items: any[] = (listed as any)?.items ?? (listed as any)?.chats ?? [];
  if ((!items || items.length === 0) && typeof (listed as any)?.[Symbol.asyncIterator] === 'function') {
    // Some SDK versions return an async iterator
    items = [];
    let count = 0;
    for await (const c of (listed as AsyncIterable<any>)) {
      items.push(c);
      count++;
      if (count >= 50) break;
    }
  }
  const inGroup = items.filter((c) => {
    const gid = (c as any).chat_group_id ?? (c as any).chatGroupId;
    return String(gid || '') === String(chatGroupId);
  });

  // 2) Fetch events for each chat and merge
  const all: HumeEvent[] = [];
  for (const c of inGroup) {
    const cid = (c as any).chat_id ?? (c as any).chatId;
    if (!cid) continue;
    try {
      const evs = await fetchChatEvents(String(cid), { ascending_order: true });
      all.push(...(evs as HumeEvent[]));
    } catch (e) {
      console.warn('Failed fetching events for chat in group', cid, e);
    }
  }
  // 3) Sort by timestamp (oldest->newest)
  const getTs = (e: HumeEvent) => {
    const v = (e as any).timestamp ?? (e as any).created_at;
    return typeof v === 'string' ? Date.parse(v) : (typeof v === 'number' ? v : 0);
  };
  all.sort((a, b) => getTs(a) - getTs(b));
  return all;
}

export const MESSAGE_EVENT_TYPES = new Set(["USER_MESSAGE", "AGENT_MESSAGE", "MESSAGE", "TEXT_MESSAGE"]);

export function mapEventsToMessages(events: HumeEvent[]) {
  return events
    .map((ev) => {
      const msg = (ev as any).message;
      const contentRaw = (ev as any).messageText ?? (ev as any).text ?? msg?.content ?? msg?.text ?? '';
      const roleRaw = (ev as any).role ?? msg?.role ?? (ev as any).type ?? '';
      const ts = (ev as any).timestamp ?? (ev as any).created_at ?? msg?.created_at ?? Date.now();
      let text = String(contentRaw ?? '').trim();
      if (!text) return null;

      const roleLc = String(roleRaw || '').toLowerCase();
      let role: 'user' | 'agent' | 'system' = roleLc.includes('user') ? 'user' : roleLc.includes('assistant') || roleLc.includes('agent') ? 'agent' : 'system';
      if (role === 'system') return null; // drop system/meta events

      // Drop known meta markers or VAD/segment-like content quickly
      const combinedType = String((ev as any).type ?? (ev as any).event_type ?? msg?.type ?? '').toLowerCase();
      if (combinedType.includes('vad') || combinedType.includes('segment') || combinedType.includes('system')) return null;

      // Strip simple XML/HTML-like tags and collapse whitespace
      text = text.replace(/<[^>]+>/g, ' ').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

      // Heuristic: if the text is mostly digits/symbols (>70% non-letters), consider it telemetry and drop
      const letters = (text.match(/[A-Za-z]/g) || []).length;
      const nonLetters = Math.max(text.length - letters, 0);
      if (text.length > 0 && nonLetters > letters * 2.5) return null;

      // Truncate extremely long payloads to avoid UI noise
      const MAX_LEN = 1200;
      if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN) + ' …';

      const id = String((ev as any).id ?? (ev as any).event_id ?? (ev as any).eventId ?? (msg?.id ?? msg?.event_id ?? msg?.eventId ?? crypto.randomUUID()));
      return { id, role: role as 'user' | 'agent', text, timestamp: new Date(ts) };
    })
    .filter(Boolean);
}

/** Sync latest chats list into localStorage 'hume_chats' (IDs only) */
export async function syncChatsIntoLocalStorage(limit = 20) {
  try {
    const existingRaw = localStorage.getItem('hume_chats');
    const existing: Array<{ chat_id: string; chat_group_id?: string; updated_at: number | string }> = existingRaw ? JSON.parse(existingRaw) : [];
    const coerceTs = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? Date.parse(v) : Date.now());

    // Merge existing and new, then collapse to most recent per chat_group_id (fallback to chat_id)
    const mapped = await listChats(0, limit, false);
    const data: any = mapped;
    // Support both object responses and async iterators from the SDK
    let items: any[] = (data as any)?.items ?? (data as any)?.chats ?? [];
    if ((!items || items.length === 0) && typeof (data as any)?.[Symbol.asyncIterator] === 'function') {
      try {
        items = [];
        let count = 0;
        for await (const c of data as AsyncIterable<any>) {
          items.push(c);
          count++;
          if (count >= limit) break;
        }
      } catch (iterErr) {
        console.warn('Failed iterating chats list; falling back to empty list', iterErr);
        items = [];
      }
    }
    console.debug('[Hume] listChats items count:', Array.isArray(items) ? items.length : 0);
    const merged = [...existing, ...items.map((c) => ({
      chat_id: (c as any).chat_id ?? (c as any).chatId,
      chat_group_id: (c as any).chat_group_id ?? (c as any).chatGroupId,
      updated_at:
        (c as any).updated_at ?? (c as any).updatedAt ??
        (c as any).ended_at ?? (c as any).endedAt ??
        (c as any).last_event_at ?? (c as any).lastEventAt ??
        (c as any).created_at ?? (c as any).createdAt ?? new Date().toISOString(),
    }))];

    const groups = new Map<string, { chat_id: string; chat_group_id?: string; updated_at: number }>();
    for (const c of merged) {
      const key = (c as any).chat_group_id || (c as any).chat_id;
      const ts = coerceTs((c as any).updated_at);
      const prev = groups.get(key);
      if (!prev || ts > prev.updated_at) {
        groups.set(key, { chat_id: (c as any).chat_id, chat_group_id: (c as any).chat_group_id, updated_at: ts });
      }
    }
    const updated = Array.from(groups.values()).sort((a,b) => b.updated_at - a.updated_at).slice(0, limit);
    localStorage.setItem('hume_chats', JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed syncing hume_chats', e);
    return [];
  }
}

// ---- Stored Chats (chat_id + name) helpers ----
export type StoredChat = { chat_id: string; name: string; updated_at: number; chat_group_id?: string };

const STORED_CHATS_KEY = 'stored_chats';

export function listStoredChats(limit = 50): StoredChat[] {
  try {
    const raw = localStorage.getItem(STORED_CHATS_KEY);
    const arr: StoredChat[] = raw ? JSON.parse(raw) : [];
    return arr.slice(0, limit);
  } catch {
    return [];
  }
}

// export function upsertStoredChat(chat_id: string, name: string, chat_group_id?: string) {
//   try {
//     const now = Date.now();
//     const raw = localStorage.getItem(STORED_CHATS_KEY);
//     const arr: StoredChat[] = raw ? JSON.parse(raw) : [];
//     const idx = arr.findIndex((c) => c.chat_id === chat_id);
//     const item: StoredChat = { chat_id, name: name?.trim() || `Chat ${chat_id.slice(0,6)}`, updated_at: now, ...(chat_group_id ? { chat_group_id } : {}) };
//     if (idx >= 0) arr[idx] = { ...arr[idx], ...item };
//     else arr.unshift(item);
//     arr.sort((a,b) => b.updated_at - a.updated_at);
//     localStorage.setItem(STORED_CHATS_KEY, JSON.stringify(arr.slice(0, 200)));
//   } catch {}
// }

export function upsertStoredChat(chat_id: string, name: string, chat_group_id?: string) {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(STORED_CHATS_KEY);
    let arr: StoredChat[] = raw ? JSON.parse(raw) : [];
    
    // Remove any existing entries with the same chat_id to prevent duplicates
    arr = arr.filter(c => c.chat_id !== chat_id);
    
    // Create new chat entry
    const item: StoredChat = { 
      chat_id, 
      name: name?.trim() || `Chat ${chat_id.slice(0,6)}`, 
      updated_at: now, 
      ...(chat_group_id ? { chat_group_id } : {}) 
    };
    
    // Add to beginning of array (most recent first)
    arr.unshift(item);
    
    // Keep only unique chat_ids and limit to 200 most recent
    const uniqueChats = Array.from(new Map(arr.map(chat => [chat.chat_id, chat])).values());
    
    localStorage.setItem(STORED_CHATS_KEY, JSON.stringify(uniqueChats.slice(0, 200)));
  } catch (e) {
    console.warn('Failed to upsert chat', e);
  }
}

/** Try to produce a friendly chat name from events: prefer first USER message, else fallback */
export function deriveChatNameFromEvents(events: HumeEvent[], chatId?: string): string {
  try {
    for (const ev of events) {
      const role = (ev as any).role || (ev as any).message?.role || '';
      const t = (ev as any).messageText ?? (ev as any).text ?? (ev as any).message?.content;
      if (String(role).toUpperCase().includes('USER') && t) {
        const name = String(t).trim().replace(/\s+/g, ' ').slice(0, 40);
        if (name) return name;
      }
    }
  } catch {}
  return `Chat ${chatId ? chatId.slice(0, 6) : ''}`.trim();
}

/** Resume a previous session by binding chat_id to the active WebSocket and signaling resume */
export async function resumeChat(chatId: string, conversationKey: string = 'default') {
  const entry = getOrCreateSocket(conversationKey);
  const socket = entry.socket;
  bindChatCapture(entry);
  await socket.tillSocketOpen();
  try {
    // Inform server to attach to prior chat
    // @ts-ignore
    (socket as any).socket.send(JSON.stringify({ type: 'session_settings', chat_id: chatId }));
    // Optional: explicitly signal resume per docs (emits RESUME_ONSET)
    // @ts-ignore
    ;(socket as any).socket.send(JSON.stringify({ type: 'resume_assistant_message' }));
  } catch (e) {
    console.warn('Failed to resume chat', e);
    throw e;
  }
  // Remember for future sends
  entry.chatId = chatId;
  rememberHumeChatId(chatId, entry.chatGroupId);
  return true;
}
// --- New helpers: raw events, transcript, conversation history, and resume ---

/** Return raw events for a chat, ordered oldest->newest */
export async function getRawChatEvents(chatId: string) {
  return fetchChatEvents(chatId, { ascending_order: true });
}

/** Build a simple transcript string from chat events (User/Assistant turns) */
export async function getChatTranscript(chatId: string) {
  const events = await fetchChatEvents(chatId, { ascending_order: true });
  const lines: string[] = [];
  for (const ev of events) {
    const t = (ev as any).type;
    if (t === 'USER_MESSAGE' || t === 'AGENT_MESSAGE') {
      const role = (ev as any).role === 'USER' ? 'User' : 'Assistant';
      const timestamp = new Date((ev as any).timestamp ?? Date.now()).toLocaleString();
      const text = (ev as any).messageText ?? (ev as any).text ?? (ev as any).message?.content ?? '';
      if (text) lines.push(`[${timestamp}] ${role}: ${text}`);
    }
  }
  return lines.join('\n');
}

/** Aggregate messages across a chat group (multiple sessions) */
export async function getConversationHistory(chatGroupId: string) {
  const events = await fetchChatGroupEvents(chatGroupId);
  return mapEventsToMessages(events);
}

/** Fetch chat metadata (e.g., chat_group_id) via SDK */
export async function getChatMetadata(chatId: string): Promise<{ chat_id: string; chat_group_id?: string } | null> {
  try {
    const meta: any = await client.empathicVoice.chats.getChat(chatId as any);
    const chat_id = meta?.chat_id ?? meta?.chatId;
    const chat_group_id = meta?.chat_group_id ?? meta?.chatGroupId;
    return { chat_id, chat_group_id };
  } catch (e) {
    console.warn('Failed to get chat metadata', e);
    return null;
  }
}


export const setDynamicVariable = async (name: string, value: string) => {
  try {
    const resumedChatGroupId = localStorage.getItem("hume_chat_group_id");
    if (!resumedChatGroupId) {
      console.warn('No chat group ID found in localStorage');
      return;
    }
    
    const socket = client.empathicVoice.chat.connect({
      resumedChatGroupId,
      configId: "d44bd54b-5593-4563-a3b3-78019346c060"
    });
    
    await socket.tillSocketOpen();
    
    socket.socket.send(
      JSON.stringify({
        type: "session_settings",
        variables: {
          name: "Alexander",
          age: 15,
          is_philosopher: true
        }
      })
    );
    
    socket.close();
    console.log("setDynamicVariable", name, value);
  } catch (e) {
    console.error('Failed to set dynamic variable', e);
  }
};


export const getAudioContructions = async (chatId: string) => {
  try {
    const response = await client.empathicVoice.chatGroups.getAudio(chatId, {
      pageNumber: 0,
      pageSize: 100,
      ascendingOrder: false
    });
    
    if (response.audioReconstructionsPage?.length > 0) {
      const audioItem = response.audioReconstructionsPage[0];
      if (audioItem.signedAudioUrl) {
        // Fetch the file first
        const fileResponse = await fetch(audioItem.signedAudioUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch audio: ${fileResponse.statusText}`);
        }
        
        // Convert the response to a blob
        const blob = await fileResponse.blob();
        
        // Create a URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary anchor element to trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.download = audioItem.filename || `audio_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        return { success: true, message: 'Download started' };
      }
    }
    
    return { success: false, message: 'No audio files found' };
  } catch (error) {
    console.error('Failed to get audio constructions', error);
    return { 
      success: false, 
      message: 'Failed to download audio', 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
};
