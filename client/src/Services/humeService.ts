import { HumeClient } from 'hume';

const client = new HumeClient({
  apiKey: import.meta.env.VITE_HUME_API_KEY,
});

export interface HumeResponse {
  text: string;
  audioData?: ArrayBuffer;
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

export const sendAudioToHume = async (audioBlob: Blob, conversationHistory: Array<{ role: 'user' | 'assistant' | 'system', content: string }> = []): Promise<HumeResponse> => {
    try {
      const socket = client.empathicVoice.chat.connect();
      
      return new Promise((resolve, reject) => {
        let fullResponse = '';
        let audioChunks: Uint8Array[] = [];
        let isFirstMessage = true;
        
        socket.on("message", (message) => {
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
              resolve({ text: fullResponse });
              socket.close();
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
              audioData: finalAudioData.buffer
            });
            
            socket.close();
          }
          else if (message.type === "error") {
            reject(new Error(message.message || 'Unknown error from Hume AI'));
            socket.close();
          }
        });
  
        socket.on("error", (error) => {
          console.error('WebSocket error:', error);
          reject(error);
          socket.close();
        });
  
        socket.tillSocketOpen().then(async () => {
          try {
            // Only include the most recent message as context
            if (conversationHistory.length > 0) {
              const lastMessage = conversationHistory[conversationHistory.length - 1];
              
              if (lastMessage.role === 'system') {
                // @ts-ignore - Send system message
                socket.socket.send(JSON.stringify({
                  type: 'system_prompt',
                  system_prompt: lastMessage.content.substring(0, 500)
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
            socket.close();
          }
        }).catch(reject);
      });
    } catch (error) {
      console.error('Error sending audio to Hume:', error);
      throw error;
    }
};

export const sendMessageToHume = async (messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>) => {
  try {
    const socket = client.empathicVoice.chat.connect();
    
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let isFirstMessage = true;
      
      socket.on("message", (message) => {
        if (message.type === "assistant_message") {
          const text = message.message?.content || '';
          fullResponse += text;
          if (isFirstMessage) {
            isFirstMessage = false;
            setTimeout(() => {
              resolve(fullResponse);
              socket.close();
            }, 500);
          }
        } else if (message.type === "error") {
          reject(new Error(message.message || 'Unknown error from Hume AI'));
          socket.close();
        }
      });

      socket.on("error", (error) => {
        console.error('WebSocket error:', error);
        reject(error);
        socket.close();
      });

      socket.tillSocketOpen().then(() => {
        const recentMessages = messages.slice(-4);
        const formattedMessages = recentMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        }));
        const lastMessage = formattedMessages[formattedMessages.length - 1];
        if (formattedMessages.length === 1) {
          socket.sendUserInput(lastMessage.content);
          return;
        }
        
        const contextMessages = formattedMessages.slice(0, -1);
        const contextSummary = contextMessages
          .map(msg => `${msg.role === 'assistant' ? 'AI' : 'User'}: ${msg.content}`)
          .join('\n');
        
        const context = `[Context: ${contextSummary}]`;
        const messageWithContext = `${context}\n\n${lastMessage.content}`;
        
        if (messageWithContext.length <= 256) {
          socket.sendUserInput(messageWithContext);
        } else {
          socket.sendUserInput(`[Continuing conversation] ${lastMessage.content.substring(0, 220)}`);
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