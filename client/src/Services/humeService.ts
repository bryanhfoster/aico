import { HumeClient } from 'hume';
import type { ReturnChatEvent } from 'hume/api/resources/empathicVoice';

const client = new HumeClient({
  apiKey: import.meta.env.VITE_HUME_API_KEY,
});

// Persistent socket registry keyed by conversation
type ChatSocket = {
  socket: ReturnType<typeof client.empathicVoice.chat.connect>;
  chatId?: string;
  chatGroupId?: string;
  listenersBound?: boolean;
};
const socketRegistry = new Map<string, ChatSocket>();

function getOrCreateSocket(conversationKey: string, chatGroupIdHint?: string): ChatSocket {
  const existing = socketRegistry.get(conversationKey);
  const isClosed = existing && ((existing.socket as any)?.socket?.readyState === 3);

  if (!existing || isClosed) {
    const storedGroupId =
      chatGroupIdHint || localStorage.getItem(`hume_chat_group_id_${conversationKey}`);

    const options: any = {};
    if (storedGroupId) {
      options.resumedChatGroupId = storedGroupId;
      console.debug("[Hume] Resuming chat group:", storedGroupId);
    } else {
      console.debug("[Hume] Starting new chat session");
    }

    const socket = client.empathicVoice.chat.connect(options);

    const entry: ChatSocket = { socket, chatGroupId: storedGroupId || undefined };
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
          // rememberHumeChatGroup(entry.chatId, entry.chatGroupId);
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
  chatGroupId?: string;
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
              // rememberHumeChatId(String(chatId), chatGroupId ? String(chatGroupId) : undefined);
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
            const chatId = chatIdHint || entry.chatId;
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

export const sendMessageToHume = async (
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  conversationKey: string = 'default',
  chatGroupIdHint?: string
) => {
  try {
    const entry = getOrCreateSocket(conversationKey, chatGroupIdHint);
    const socket = entry.socket;
    bindChatCapture(entry);

    return new Promise<HumeResponse>((resolve, reject) => {
      let fullResponse = '';
      let finished = false;
      let capturedChatId: string | undefined;
      let messagesSent = false;

      const messageHandler = (message: any) => {
        try {
          // Capture identifiers from any incoming message
          const mm: any = message;
          const chatId = mm.chat_id ?? mm.chatId ?? mm.chat?.id ?? mm.chat?.chat_id ?? mm.conversation_id ?? mm.conversationId ?? mm.session?.chat_id ?? mm.session?.chatId;
          const chatGroupIdGeneric = mm.chat_group_id ?? mm.chatGroupId ?? mm.chat?.group_id ?? mm.chat?.chat_group_id ?? mm.group_id ?? mm.groupId;
          if (chatId && !capturedChatId) {
            capturedChatId = String(chatId);
            console.debug('[Hume] Captured chat id:', capturedChatId);
          }
          if (chatGroupIdGeneric && !entry.chatGroupId) {
            entry.chatGroupId = String(chatGroupIdGeneric);
            localStorage.setItem(`hume_chat_group_id_${conversationKey}`, entry.chatGroupId);
            console.debug('[Hume] Captured chat group id:', entry.chatGroupId);
          }

          if (message.type === 'chat_metadata') {
            const chatGroupId = message.chat_group_id ?? message.chatGroupId;

            if (chatGroupId) {
              entry.chatGroupId = String(chatGroupId);
              console.debug('[Hume] Captured chat group (persistent):', entry.chatGroupId);
              localStorage.setItem(`hume_chat_group_id_${conversationKey}`, chatGroupId);
              
              // Send messages if we haven't already
              if (!messagesSent) {
                messagesSent = true;
                sendMessagesImmediately();
              }
            }
          }

          if (message.type === 'assistant_message') {
            fullResponse += message.message?.content || '';
          } else if (message.type === 'assistant_end') {
            if (!finished) {
              finished = true;
              // Clean up the message handler
              safeOff(socket, 'message', messageHandler);
              safeOff(socket, 'error', errorHandler);
              resolve({ text: fullResponse, chatId: capturedChatId, chatGroupId: entry.chatGroupId });
            }
          } else if (message.type === 'error') {
            safeOff(socket, 'message', messageHandler);
            safeOff(socket, 'error', errorHandler);
            reject(new Error(message.message || 'Unknown error from Hume AI'));
          }
        } catch (err) {
          console.error('[Hume] Handling error:', err);
        }
      };

      const errorHandler = (error: any) => {
        safeOff(socket, 'message', messageHandler);
        reject(error);
      };

      function sendMessagesImmediately() {
        try {
          // Send conversation context (recent messages)
          const recent = messages.slice(-6);
          const last = recent[recent.length - 1];
          const prior = recent.slice(0, -1);

          for (const m of prior) {
            if (m.role === 'assistant' && m.content) {
              (socket as any).socket.send(JSON.stringify({
                type: 'assistant_input',
                text: String(m.content).slice(0, 200),
              }));
            }
          }

          // Send the user's message
          const userText = String(last?.content ?? '').trim();
          if (userText) {
            socket.sendUserInput(userText);
          }
        } catch (err) {
          console.error('[Hume] Error sending messages:', err);
          safeOff(socket, 'message', messageHandler);
          safeOff(socket, 'error', errorHandler);
          reject(err);
        }
      }

      // Add our specific message handler for this request
      socket.on('message', messageHandler);
      socket.on('error', errorHandler);

      socket.tillSocketOpen().then(() => {
        // Check if we already have a chat group ID (existing conversation)
        const existingChatGroupId = chatGroupIdHint || entry.chatGroupId || localStorage.getItem(`hume_chat_group_id_${conversationKey}`);
        
        if (existingChatGroupId) {
          console.debug('[Hume] Using existing chat group ID:', existingChatGroupId);
          // Send messages immediately for existing conversations
          if (!messagesSent) {
            messagesSent = true;
            sendMessagesImmediately();
          }
        }
        // Also send immediately for new conversations; do not wait for chat_metadata
        if (!messagesSent) {
          console.debug('[Hume] No existing chat group; sending immediately for new conversation');
          messagesSent = true;
          sendMessagesImmediately();
        }

      }).catch((error) => {
        safeOff(socket, 'message', messageHandler);
        safeOff(socket, 'error', errorHandler);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Hume communication error:', error);
    throw error;
  }
};

function safeOff(socket: any, event: string, handler: any) {
  if (socket.off) {
    socket.off(event, handler);
  }
}

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

// Optional: fetch all events for a chat group (aggregate from chats API)
export async function fetchConversationByGroup(groupId: string) {
  // 1. Get the group and its chats
  const groupResponse = await client.empathicVoice.chatGroups.getChatGroup(groupId, {
    pageNumber: 0,
    pageSize: 100,
    ascendingOrder: true
  });

  const chats = groupResponse.chatsPage ?? [];
  const allEvents: any[] = [];

  // 2. Loop over each chat and fetch its events
  for (const chat of chats) {
    if (!chat.id) continue;

    const eventsIterator = await client.empathicVoice.chats.listChatEvents(chat.id, {
      pageSize: 100,
      ascendingOrder: true
    });

    for await (const ev of eventsIterator) {
      allEvents.push(ev);
    }
  }


  function formatConversation(events: any[]) {
    return events
      .filter(ev => ["USER_MESSAGE", "AGENT_MESSAGE"].includes(ev.type))
      .map(ev => ({
        role: ev.role,
        text: ev.messageText ?? "",
        timestamp: ev.timestamp
      }));
  }
  const transcript = formatConversation(allEvents);

  allEvents.sort((a, b) => {
    const tA = typeof a.created_at === "string" ? Date.parse(a.created_at) : (a.created_at ?? 0);
    const tB = typeof b.created_at === "string" ? Date.parse(b.created_at) : (b.created_at ?? 0);
    return tA - tB;
  });
  
  console.log("transcript", transcript);
  return transcript;
}

export interface StoredChat {
  chat_group_id: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
}

export async function listStoredChats() {
  try {
    const response = await client.empathicVoice.chats.listChats({
      pageNumber: 0,
      pageSize: 10,
      ascendingOrder: false,
    });

    // Each chat contains chatGroupId, timestamps, etc.
    // You can normalize them into your StoredChat type.
    return response.data.map(chat => ({
      id: chat.chatGroupId, // group is what you want for resuming
      chatId: chat.id,      // individual chat instance if needed
      status: chat.status,
      startTimestamp: chat.startTimestamp,
      endTimestamp: chat.endTimestamp,
      eventCount: chat.eventCount,
    }));
  } catch (err) {
    console.error("Failed to fetch chats from Hume:", err);
    return [];
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
