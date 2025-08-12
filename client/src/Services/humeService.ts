import { HumeClient } from 'hume';

const client = new HumeClient({
  apiKey: import.meta.env.VITE_HUME_API_KEY,
});

export const sendAudioToHume = async (audioBlob: Blob, conversationHistory: Array<{ role: 'user' | 'assistant' | 'system', content: string }> = []) => {
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
  
        socket.tillSocketOpen().then(async () => {
          try {
            // Only include the most recent message as context
            if (conversationHistory.length > 0) {
              const lastMessage = conversationHistory[conversationHistory.length - 1];
              
              if (lastMessage.role === 'system') {
                // @ts-ignore - Send system message
                socket.socket.send(JSON.stringify({
                  type: 'system_prompt',
                  system_prompt: lastMessage.content.substring(0, 500) // Limit system prompt length
                }));
              } else if (lastMessage.role === 'assistant') {
                // @ts-ignore - Send assistant message as context
                socket.socket.send(JSON.stringify({
                  type: 'assistant_input',
                  text: lastMessage.content.substring(0, 200) // Limit context length
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
            
            // Send end of stream using a valid message type
            // We'll use an empty user_input message to signal the end
            // ws.send(JSON.stringify({
            //   type: 'user_input',
            //   text: ''
            // }));
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