import '../App.css'
import ChatInput from '../components/ChatInput'
import ChatBubble, { type ChatRole } from '../components/ChatBubble'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiX, FiMaximize2, FiMinimize2, FiPhone } from 'react-icons/fi'
import { 
  sendAudioToHume, sendMessageToHume, listStoredChats, getAudioContructions, 
  fetchConversationByGroup,
} from '../Services/humeService'
import { useNavigate } from 'react-router-dom'

// --- Keep all your types and chat logic here ---
type Message = { 
  id: string; 
  role: ChatRole; 
  text: string; 
  timestamp: Date; 
  audioBlob?: Blob; 
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  humeChatGroupId?: string;
};

function ChatPage() {
    const navigate = useNavigate();
    
    const [conversations, setConversations] = useState<Conversation[]>(() => {
      const saved = localStorage.getItem('conversations');
      return saved ? JSON.parse(saved) : [
        {
          id: 'conv-1',
          title: 'New Conversation',
          messages: [
            { 
              id: 'm1', 
              role: 'system', 
              text: 'Welcome to aico. This is a system message.', 
              timestamp: new Date(Date.now() - 3600000) 
            },
            { 
              id: 'm2', 
              role: 'agent', 
              text: 'Hi! I’m your assistant. Ask me anything.', 
              timestamp: new Date(Date.now() - 1800000) 
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
    });
    
    const [currentConversationId, setCurrentConversationId] = useState<string>(conversations[0]?.id || '');
    const messages = useMemo(() => {
      const conv = conversations.find(c => c.id === currentConversationId);
      return conv ? conv.messages : [];
    }, [conversations, currentConversationId]);


    const [chatGroups, setChatGroups] = useState<HumeChatGroup[]>([]);

    useEffect(() => {
      async function fetchGroups() {
        try {
          const groups = await listStoredChats(); // now async
          console.log("Fetched chat groups:", groups);
          // Deduplicate by id, keep the entry with the latest timestamp
          const byId = new Map<string, any>();
          for (const g of groups) {
            const current = byId.get(g.id);
            const gTime = (g.endTimestamp ?? g.startTimestamp ?? 0) as number;
            const cTime = current ? (current.endTimestamp ?? current.startTimestamp ?? 0) : -Infinity;
            if (!current || gTime > cTime) {
              byId.set(g.id, g);
            }
          }
          // Optional: sort by latest timestamp desc for display consistency
          const uniqueLatest = Array.from(byId.values()).sort(
            (a, b) => ((b.endTimestamp ?? b.startTimestamp ?? 0) as number) - ((a.endTimestamp ?? a.startTimestamp ?? 0) as number)
          );
          setChatGroups(uniqueLatest);
        } catch (e) {
          console.error("Failed to load chat groups:", e);
        }
      }
      fetchGroups();
    }, []);





  
    // Persist conversations across refresh
    useEffect(() => {
      try { localStorage.setItem('conversations', JSON.stringify(conversations)); } catch {}
    }, [conversations]);
  
    const handleAudioSend = async (audioBlob: Blob) => {
      if (!currentConversationId) return;
      
      const conversation = conversations.find(c => c.id === currentConversationId);
      if (!conversation) return;
      
      try {
        // Verify the audio blob is valid
        if (!(audioBlob instanceof Blob)) {
          console.error('Invalid audio blob received');
          return;
        }
        
        console.log('Audio blob type:', audioBlob.type, 'size:', audioBlob.size);
        
        // Show a placeholder message while processing
        const placeholderId = crypto.randomUUID();
        const placeholderMsg: Message = {
          id: placeholderId,
          role: 'user',
          text: '[Voice message - Processing...]',
          timestamp: new Date(),
          audioBlob: audioBlob
        };
        
        setConversations(prev => 
          prev.map(c => c.id === currentConversationId
            ? { 
                ...c, 
                messages: [...c.messages, placeholderMsg],
                updatedAt: new Date()
              }
            : c
          )
        );
        
        // Send audio to Hume
        const conversationHistory = conversation.messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'agent' ? 'assistant' : m.role,
            content: m.text
          }));
        
        const response = await sendAudioToHume(audioBlob, conversationHistory, conversation.humeChatGroupId, currentConversationId);
        
        // Wrap audio playback in a Promise
        await new Promise<void>((resolve) => {
          // Handle audio response
          if (response.audioData) {
            const audioBlob = new Blob([response.audioData], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Create audio element
            const audio = new Audio(audioUrl);
            audio.preload = 'auto';
            
            // Set up event listeners for better error handling
            const handleError = (error: Event) => {
              console.error('Audio playback error:', error);
              // Clean up
              URL.revokeObjectURL(audioUrl);
              audio.removeEventListener('error', handleError);
              audio.removeEventListener('canplaythrough', handleCanPlay);
              audio.removeEventListener('ended', handleEnded);
              resolve();
            };
            
            const handleCanPlay = () => {
              // Only try to play after the audio is ready
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                playPromise.catch(error => {
                  console.error('Error playing audio:', error);
                  handleError(error as unknown as Event);
                });
              }
            };
            
            const handleEnded = () => {
              // Clean up
              URL.revokeObjectURL(audioUrl);
              audio.removeEventListener('error', handleError);
              audio.removeEventListener('canplaythrough', handleCanPlay);
              audio.removeEventListener('ended', handleEnded);
              resolve();
            };
            
            audio.addEventListener('error', handleError);
            audio.addEventListener('canplaythrough', handleCanPlay);
            audio.addEventListener('ended', handleEnded);
            
            // Preload the audio
            audio.load();
          } else {
            resolve();
          }
        });
        
        // Update the placeholder message with the final voice message and bind to Hume chat id
        setConversations(prev => {
          const chatId = (response.chatId as string | undefined) || localStorage.getItem('hume_chat_group_id') || undefined;
          return prev.map(c => {
            if (c.id !== currentConversationId) return c;
            
            // Find the placeholder message
            const updatedMessages = c.messages.map(m => 
              m.id === placeholderId 
                ? {
                    ...m,
                    text: '[Your voice message]',
                    audioBlob: audioBlob
                  }
                : m
            );
  
            // Add the AI's response as a new message
            const agentMsg: Message = { 
              id: crypto.randomUUID(),
              role: 'agent',
              text: response.text || '🎤 [Voice message]',
              timestamp: new Date(),
              audioBlob: response.audioData ? new Blob([response.audioData], { type: 'audio/wav' }) : undefined
            };
  
            return {
              ...c,
              messages: [...updatedMessages, agentMsg],
              updatedAt: new Date(),
              title: c.title === 'New Conversation' ? 'Voice message' : c.title,
              humeChatGroupId: c.humeChatGroupId || chatId,
            };
          });
        });
      } catch (error) {
        console.error('Error processing voice message:', error);
        // Update the placeholder with an error message
        setConversations(prev => 
          prev.map(c => c.id === currentConversationId
            ? {
                ...c,
                messages: c.messages.map(m => 
                  m.id === placeholderId
                    ? {
                        ...m,
                        text: '❌ Failed to process voice message',
                        audioBlob: undefined
                      }
                    : m
                ),
                updatedAt: new Date()
              }
            : c
          )
        );
      }
    };
  
    const handleSend = useCallback(async (text: string) => {
      if (!text.trim() || !currentConversationId) return;
      
      const conversation = conversations.find(c => c.id === currentConversationId);
      if (!conversation) return;
      
      const idUser = crypto.randomUUID();
      const now = new Date();
      
      // Add user message
      const userMsg: Message = { 
        id: idUser, 
        role: 'user', 
        text: text,
        timestamp: now
      };
      
      // Update conversation with new message
      const updatedConversation = {
        ...conversation,
        messages: [...conversation.messages, userMsg],
        updatedAt: now
      };
      
      setConversations(prev => 
        prev.map(c => c.id === currentConversationId ? updatedConversation : c)
      );
      
      try {
        // Prepare conversation history for Hume
        const conversationHistory = updatedConversation.messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'agent' ? 'assistant' : m.role,
            content: m.text
          }));
        
  
          console.log("conversationHistory",  conversation.humeChatGroupId);
        // Get response from Hume
        const response = await sendMessageToHume(conversationHistory, currentConversationId, conversation.humeChatGroupId);
        
  
        const chatId = (response.chatGroupId as string | undefined) || localStorage.getItem("hume_chat_group_id") || undefined;
        if (chatId) {
          localStorage.setItem("hume_chat_group_id", chatId);
        }
        console.log("response", response);
        const agentMsg: Message = { 
          id: crypto.randomUUID(), 
          role: 'agent',
          text: response.text || '',
          timestamp: new Date()
        };
        
        // Update conversation with AI response and bind to Hume chat id
        setConversations(prev => {
          const chatId = (response.chatId as string | undefined) || localStorage.getItem('hume_chat_group_id') || undefined;
          return prev.map(c => c.id === currentConversationId 
            ? { 
                ...c, 
                messages: [...c.messages, agentMsg],
                title: c.title === 'New Conversation' 
                  ? text.substring(0, 30) + (text.length > 30 ? '...' : '')
                  : c.title,
                updatedAt: new Date(),
                humeChatGroupId: chatId,
              } 
            : c
          );
        });
      } catch (error) {
        console.error('Error getting response from Hume:', error);
        const errorMsg: Message = { 
          id: crypto.randomUUID(), 
          role: 'system', 
          text: 'Sorry, there was an error getting a response. Please try again.',
          timestamp: new Date()
        };
        
        setConversations(prev => 
          prev.map(c => c.id === currentConversationId 
            ? { ...c, messages: [...c.messages, errorMsg] } 
            : c
          )
        );
      }
    }, [currentConversationId, conversations]);
  
    const createNewConversation = useCallback(() => {
      const newConversation: Conversation = {
        id: `conv-${Date.now()}`,
        title: 'New Conversation',
        messages: [
          { 
            id: 'm1', 
            role: 'system', 
            text: 'Welcome to a new conversation.', 
            timestamp: new Date() 
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversationId(newConversation.id);
    }, []);
  
    const loadFromHume = useCallback(async (groupId: string) => {
      console.log("[Hume] loadFromHume start for group:", groupId);
    
      try {
        // 1. Fetch conversation history by groupId
        let mappedMessages: Message[] = [];
        console.log("[Hume] Fetching group history:", groupId);
        const conv = await fetchConversationByGroup(groupId);

        console.log("dklajlaskd;ajlkdf", conv);
    
        if (Array.isArray(conv) && conv.length > 0) {
          mappedMessages = conv.map((e: any) => ({
            id: e.id || crypto.randomUUID(),
            role: e.role === "USER" ? "user" : "agent", // FIX HERE
            text: e.content || e.text || "",
            timestamp: new Date(e.timestamp || Date.now()),
          }));
        }
        
    
        if (!mappedMessages || mappedMessages.length === 0) {
          console.warn("[Hume] No history found for group:", groupId);
          return;
        }
    
        // 2. Persist friendly name + refresh sidebar
        try {
          setSidebarRefresh((v) => v + 1);
        } catch (e) {
          console.warn("[Hume] Could not upsert stored chat", e);
        }
    
        // 3. Merge into conversation state
        let targetConversationId: string | null = null;
        setConversations((prev) => {
          const targetConv =
            prev.find((c) => c.humeChatGroupId === groupId) ||
            prev.find((c) => c.id === `hume-${groupId}`);
    
          if (targetConv) {
            const merged: Conversation = {
              ...targetConv,
              humeChatGroupId: groupId,
              title:
                targetConv.title === "New Conversation"
                  ? `Hume chat ${groupId.substring(0, 6)}...`
                  : targetConv.title,
              messages: mappedMessages,
              createdAt: mappedMessages[0]?.timestamp ?? targetConv.createdAt,
              updatedAt: mappedMessages[mappedMessages.length - 1]?.timestamp ?? new Date(),
            };
            targetConversationId = targetConv.id;
            return prev.map((c) => (c.id === targetConv.id ? merged : c));
          } else {
            const newConv: Conversation = {
              id: `hume-${groupId}`,
              title: `Hume chat ${groupId.substring(0, 6)}...`,
              messages: mappedMessages,
              createdAt: mappedMessages[0]?.timestamp ?? new Date(),
              updatedAt: mappedMessages[mappedMessages.length - 1]?.timestamp ?? new Date(),
              humeChatGroupId: groupId,
            };
            targetConversationId = newConv.id;
            return [newConv, ...prev];
          }
        });
    
        // 4. Set as active conversation
        setCurrentConversationId((prevId) => targetConversationId ?? prevId);
      } catch (e) {
        console.error("[Hume] Failed to restore group:", e);
      }
    }, []);
    
    
  
    const [detached, setDetached] = useState<Record<string, { id: string; x: number; y: number }>>({})
    const [resetSignal, setResetSignal] = useState<number>(0)
    const [isMinimized, setIsMinimized] = useState<boolean>(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
  
    const containerVariants = {
      minimized: {
        y: 'calc(100% - 60px)',
        height: '60px',
        transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
      },
      expanded: {
        y: 0,
        height: '100vh',
        transition: { type: 'spring' as const, stiffness: 300, damping: 30 }
      }
    };
  
    const contentVariants = {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: { 
          when: "beforeChildren",
          staggerChildren: 0.1
        }
      }
    };
  
    const messageVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: {
          type: 'spring' as const,
          stiffness: 300,
          damping: 25
        }
      }
    };
  
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])
  
    const handleCallClick = () => {
      navigate('/call');
    };
  
    // Local state to trigger re-render of sidebar list after refresh
    const [sidebarRefresh, setSidebarRefresh] = useState(0);


  return (
        <div className="app-container">
            <div
              className="app-container"
              style={{
                position: "fixed",
                // top: 100,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100vh",
                display: "flex",
                flexDirection: "column", // Header on top, split layout below
                zIndex: 100,
                background: "white",
                overflow: "hidden",
                // paddingTop: "35px",
              }}
            >
              <motion.div
                className="app-header"
                // onClick={toggleMinimize}
                style={{
                  padding: "16px",
                  background: "#181818",
                  color: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  userSelect: "none",
                  position: "relative",
                  zIndex: 9999,
                }}
                whileTap={{ scale: 0.98 }}
              >
                {/* LEFT side buttons + title */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {/* Download */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await getAudioContructions("fac1de25-adc1-49bb-978e-5a892b5732fb");
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      border: "none",
                      color: "white",
                      borderRadius: "6px",
                      width: "100px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}
                    title="Download"
                  >
                    <span>Download</span>
                  </button>
      
                  {/* Title */}
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#4dabf7",
                        boxShadow: "0 0 0 2px rgba(255,255,255,0.3)",
                      }}
                    />
                    {conversations.find((c) => c.id === currentConversationId)?.title ||
                      "AICO Assistant"}
                  </h2>
                </div>
      
                {/* RIGHT side buttons */}
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <button
                    onClick={handleCallClick}
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      border: "none",
                      color: "white",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}
                    title="Start a call"
                  >
                    <FiPhone size={14} />
                    <span>Call</span>
                  </button>
      
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createNewConversation();
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      border: "none",
                      color: "white",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}
                    title="Start new conversation"
                  >
                    <FiPlus size={14} />
                    <span>New</span>
                  </button>
      
                  <motion.div
                    animate={{ rotate: isMinimized ? 0 : 180 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
                  </motion.div>
                </div>
              </motion.div>
      
              {/* ---------------- BODY (Chat 70% + Sidebar 30%) ---------------- */}
              <div
                style={{
                  display: "flex",
                  flex: 1,
                  width: "100%",
                  height: "80%",
                }}
              >
                {/* Chat Section (70%) */}
                <motion.div
                  className="app-content"
                  variants={containerVariants}
                  initial="expanded"
                  animate={isMinimized ? "minimized" : "expanded"}
                  style={{
                    flex: "0 0 75%",
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "100%",
                    overflow: "hidden",
                    background: "#212121",
                    alignItems: "center",
                  }}
                >
                  {/* Messages */}
                  <motion.div
                    className="messages-container"
                    variants={contentVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      width: "80%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      wordWrap: "break-word",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      overflowX: "hidden",
                    }}
                  >
                    <AnimatePresence>
                      {messages.map((msg) => {
                        const isDetached = Boolean(detached[msg.id]);
      
                        if (isDetached) {
                          const d = detached[msg.id];
                          return (
                            <motion.div
                              key={`float-${msg.id}`}
                              className="detached-message"
                              style={{
                                position: "fixed",
                                left: "80%",
                                top: "50%",
                                transform: `translate(-50%, -50%) translate(${d.x}px, ${d.y}px)`,
                                zIndex: 1001,
                                maxWidth: "600px",
                                background: "#181f23",
                                borderRadius: "12px",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                overflow: "hidden",
                              }}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              <div
                                style={{
                                  padding: "12px 16px",
                                  background: "#181f23",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  borderBottom: "1px solid #e9ecef",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "#495057",
                                    fontWeight: 500,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {msg.role}
                                </span>
                                <button
                                  onClick={() => {
                                    setDetached((prev) => {
                                      const next = { ...prev };
                                      delete next[msg.id];
                                      return next;
                                    });
                                    setResetSignal((n) => n + 1);
                                  }}
                                  style={{
                                    backgroundColor: "#181f23",
                                    border: "none",
                                    color: "#868e96",
                                    cursor: "pointer",
                                    padding: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "4px",
                                  }}
                                  title="Return to chat"
                                >
                                  <FiX size={16} />
                                </button>
                              </div>
                              <div style={{ padding: "16px" }}>
                                <ChatBubble
                                  role={msg.role}
                                  timestamp={msg.timestamp}
                                  showTimestamp={false}
                                  audioBlob={msg.audioBlob}
                                >
                                  {msg.text}
                                </ChatBubble>
                              </div>
                            </motion.div>
                          );
                        }
      
                        return (
                          <motion.div
                            key={msg.id}
                            variants={messageVariants}
                            style={{
                              opacity: isDetached ? 0.5 : 1,
                              transition: "opacity 0.2s ease",
                            }}
                          >
                            <ChatBubble
                              key={msg.id}
                              role={msg.role}
                              timestamp={msg.timestamp}
                              audioBlob={msg.audioBlob}
                            >
                              {msg.text}
                            </ChatBubble>
                            {isDetached && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDetached((prev) => {
                                    const next = { ...prev };
                                    delete next[msg.id];
                                    return next;
                                  });
                                  setResetSignal((n) => n + 1);
                                }}
                                style={{
                                  background: "rgba(0,0,0,0.05)",
                                  border: "none",
                                  borderRadius: "50%",
                                  width: "24px",
                                  height: "24px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  color: "#495057",
                                  flexShrink: 0,
                                }}
                                title="Return to chat"
                              >
                                <FiPlus style={{ transform: "rotate(45deg)" }} size={16} />
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </AnimatePresence>
                  </motion.div>
      
                  {/* Input */}
                  <div
                    style={{
                      padding: "16px",
                      background: "#212121",
                      width: "100%",
                      // borderTop: "1px solid #e9ecef",
                      boxShadow: "0 -2px 10px rgba(0,0,0,0.02)",
                    }}
                  >
                    <ChatInput
                      onSend={handleSend}
                      onAudioSend={handleAudioSend}
                      onAudioToggle={(isRecording) => {
                        console.log("Audio recording:", isRecording);
                      }}
                      placeholder="Type a message..."
                    />
                  </div>
                </motion.div>
                <div
                  style={{
                    flex: "0 0 25%",
                    maxHeight: "100%",
                    background: "#181818",
                    // borderLeft: "0.01rem solid #e9ecef",
                    padding: "16px 16px 20px",
                    overflowY: "auto",
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <div
                    style={{
                      marginBottom: "16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 0 8px",
                      position: "sticky",
                      top: 0,
                      background: "#181818",
                      zIndex: 1,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        color: "white",
                        fontWeight: 600,
                      }}
                    >
                      Conversations
                    </h3>
                  </div>
      
                  {/* Stored Conversations */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {chatGroups.map((h, index) => {
                      const convId = `hume-${h.id}`;
                      const isActive = currentConversationId === convId;

                      return (
                        <div
                          key={`chat-${h.id}-${index}`}
                          onClick={() => loadFromHume(h.id)} // use group ID
                          style={{
                            padding: "10px 12px 10px 10px",
                            marginRight: "30px",
                            borderRadius: "6px",
                            background: isActive ? "#212121" : "#212121",
                            cursor: "pointer",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                            transform: "translateY(-2px)",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.9rem",
                              fontWeight: 500,
                              marginBottom: "4px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: "white",
                            }}
                          >
                            {`Chat ${h.id.substring(0, 6)}...`}
                          </div>
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "#6c757d",
                            }}
                          >
                            {new Date(h.startTimestamp).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
      </div>      
      );
}

export default ChatPage;
