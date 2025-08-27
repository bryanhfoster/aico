import './App.css'
import ChatInput from './components/ChatInput'
import ChatBubble, { type ChatRole } from './components/ChatBubble'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiX, FiMaximize2, FiMinimize2, FiPhone } from 'react-icons/fi'
import { sendAudioToHume, sendMessageToHume, fetchChatEvents, mapEventsToMessages, syncChatsIntoLocalStorage, resumeChat, getChatTranscript, getConversationHistory, getChatMetadata, listStoredChats, upsertStoredChat, deriveChatNameFromEvents, setDynamicVariable, getAudioContructions } from './Services/humeService'
import { Routes, Route, useNavigate } from 'react-router-dom'
import ChatPage from './pages/ChatPage'

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
  humeChatId?: string;
};

function App() {
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
      
      const response = await sendAudioToHume(audioBlob, conversationHistory, conversation.humeChatId, currentConversationId);
      
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
        const chatId = (response.chatId as string | undefined) || localStorage.getItem('hume_chat_id') || undefined;
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
            humeChatId: c.humeChatId || chatId,
          };
        });
      });
      // Upsert stored chat name from the earliest user message as friendly name
      try {
        const chatId = (response.chatId as string | undefined) || localStorage.getItem('hume_chat_id') || undefined;
        if (chatId) {
          const conv = conversations.find(c => c.id === currentConversationId);
          const firstUser = conv?.messages.find(m => m.role === 'user');
          const name = (firstUser?.text || 'Voice chat').slice(0, 40);
          const groupId = localStorage.getItem('hume_chat_group_id') || undefined;
          upsertStoredChat(chatId, name, groupId);
          setSidebarRefresh(v => v + 1);
        }
      } catch {}
      console.log(response);
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
      
      // Get response from Hume
      const response = await sendMessageToHume(conversationHistory, currentConversationId, conversation.humeChatId);
      
      const agentMsg: Message = { 
        id: crypto.randomUUID(), 
        role: 'agent',
        text: response.text || '',
        timestamp: new Date()
      };
      
      // Update conversation with AI response and bind to Hume chat id
      setConversations(prev => {
        const chatId = (response.chatId as string | undefined) || localStorage.getItem('hume_chat_id') || undefined;
        return prev.map(c => c.id === currentConversationId 
          ? { 
              ...c, 
              messages: [...c.messages, agentMsg],
              title: c.title === 'New Conversation' 
                ? text.substring(0, 30) + (text.length > 30 ? '...' : '')
                : c.title,
              updatedAt: new Date(),
              humeChatId: c.humeChatId || chatId,
            } 
          : c
        );
      });
      // Upsert stored chat name (prefer first user message)
      try {
        const chatId = (response.chatId as string | undefined) || localStorage.getItem('hume_chat_id') || undefined;
        if (chatId) {
          const conv = conversations.find(c => c.id === currentConversationId);
          const firstUser = conv?.messages.find(m => m.role === 'user');
          const friendly = (firstUser?.text || text).slice(0, 40);
          const groupId = localStorage.getItem('hume_chat_group_id') || undefined;
          upsertStoredChat(chatId, friendly, groupId);
          setSidebarRefresh(v => v + 1);
        }
      } catch {}
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
    // Refresh chats list so sidebar stays current
    (async () => { try { await syncChatsIntoLocalStorage(20); } catch {} })();
  }, []);

  const loadFromHume = useCallback(async (explicitChatId?: string) => {
    console.log("loadFromHume");
    try {
      let chatId = explicitChatId || localStorage.getItem('hume_chat_id');
      if (explicitChatId) {
        try {
          const raw = localStorage.getItem('hume_chats');
          const list: Array<{ chat_id: string; chat_group_id?: string }> = raw ? JSON.parse(raw) : [];
          const found = list.find((c) => c.chat_id === explicitChatId);
          if (found) {
            localStorage.setItem('hume_chat_id', found.chat_id);
            if (found.chat_group_id) localStorage.setItem('hume_chat_group_id', found.chat_group_id);
          }
        } catch {}
      }
      if (!chatId) {
        // no prompt; rely on stored IDs list
        const listRaw = localStorage.getItem('hume_chats');
        const list: Array<{chat_id: string}> = listRaw ? JSON.parse(listRaw) : [];
        if (list.length === 0) return;
        chatId = list[0].chat_id; // most recent
        // also ensure group id is aligned with the most recent
        try {
          const listFull: Array<{ chat_id: string; chat_group_id?: string }> = listRaw ? JSON.parse(listRaw) : [];
          const found = listFull.find((c) => c.chat_id === chatId);
          if (found) {
            localStorage.setItem('hume_chat_id', found.chat_id);
            if (found.chat_group_id) localStorage.setItem('hume_chat_group_id', found.chat_group_id);
          }
        } catch {}
      }
      if (!chatId) {
        console.warn('No hume_chat_id found in localStorage. Start a Hume chat first.');
        return;
      }
      console.log("chatId", chatId)
      // Fetch paginated events per Hume docs and map to UI messages
      const events = await fetchChatEvents(chatId, { page_size: 100, max_pages: 10, ascending_order: true });
      console.log("events", JSON.stringify(events));
      let mappedMessages = mapEventsToMessages(events) as Message[];

      // If we only got system events (i.e., mappedMessages is empty), try falling back to Chat Group history
      if (!Array.isArray(mappedMessages) || mappedMessages.length === 0) {
        try {
          const raw = localStorage.getItem('hume_chats');
          const list: Array<{ chat_id: string; chat_group_id?: string }> = raw ? JSON.parse(raw) : [];
          const found = list.find((c) => c.chat_id === chatId);
          let groupId = found?.chat_group_id || localStorage.getItem('hume_chat_group_id') || undefined;
          // If group id is unknown, fetch metadata via SDK
          if (!groupId) {
            try {
              const meta = await getChatMetadata(chatId);
              if (meta?.chat_group_id) {
                groupId = meta.chat_group_id;
                localStorage.setItem('hume_chat_group_id', groupId);
              }
            } catch {}
          }
          if (groupId) {
            const conv = await getConversationHistory(groupId);
            if (Array.isArray(conv) && conv.length > 0) {
              mappedMessages = conv as unknown as Message[];
            }
          }
        } catch (e) {
          console.warn('Fallback to chat group history failed', e);
        }
      }

      if (!Array.isArray(mappedMessages) || mappedMessages.length === 0) {
        console.warn('No Hume events found for chat:', chatId);
        return;
      }

      // Upsert a friendly chat name from events and refresh sidebar
      try {
        // Try to get a group id
        let groupId: string | undefined = localStorage.getItem('hume_chat_group_id') || undefined;
        if (!groupId) {
          const meta = await getChatMetadata(chatId);
          if (meta?.chat_group_id) {
            groupId = meta.chat_group_id;
            localStorage.setItem('hume_chat_group_id', groupId);
          }
        }
        const friendly = deriveChatNameFromEvents(events as any, chatId);
        upsertStoredChat(chatId, friendly, groupId);
        setSidebarRefresh(v => v + 1);
      } catch {}

      // Merge into an existing conversation when possible
      let targetConversationId: string | null = null;
      setConversations(prev => {
        // If user clicked a specific History item, prefer a conv bound to that humeChatId
        const targetConv = explicitChatId
          ? prev.find(c => c.humeChatId === chatId) || prev.find(c => c.id === `hume-${chatId}`)
          : prev.find(c => c.id === currentConversationId);

        if (targetConv) {
          const merged: Conversation = {
            ...targetConv,
            humeChatId: chatId,
            title: targetConv.title === 'New Conversation' ? `Hume chat ${chatId.substring(0,6)}...` : targetConv.title,
            messages: mappedMessages,
            createdAt: mappedMessages[0]?.timestamp ?? targetConv.createdAt,
            updatedAt: mappedMessages[mappedMessages.length - 1]?.timestamp ?? new Date(),
          };
          targetConversationId = targetConv.id;
          return prev.map(c => c.id === targetConv.id ? merged : c);
        } else {
          // Create a new conversation only when restoring explicitly and none exists
          const newConv: Conversation = {
            id: `hume-${chatId}`,
            title: `Hume chat ${chatId.substring(0, 6)}...`,
            messages: mappedMessages,
            createdAt: mappedMessages[0]?.timestamp ?? new Date(),
            updatedAt: mappedMessages[mappedMessages.length - 1]?.timestamp ?? new Date(),
            humeChatId: chatId,
          };
          targetConversationId = newConv.id;
          return [newConv, ...prev];
        }
      });
      // Only switch focus when user explicitly chose a chat from History
      if (explicitChatId) {
        // Use the id determined during the state update
        setCurrentConversationId((prevId) => (targetConversationId ?? prevId));
      }
    } catch (e) {
      console.error('Failed to restore from Hume:', e);
    }
  }, []);

  const [detached, setDetached] = useState<Record<string, { id: string; x: number; y: number }>>({})
  const [resetSignal, setResetSignal] = useState<number>(0)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const [showSidebar, setShowSidebar] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const toogledynamicVariable = async () => {
    console.log("toogledynamicVariable")
    setTimeout(async () =>{
      await setDynamicVariable("Alex", "Hitman")
    }, 1000)
  }

  
  useEffect(() => {
    // Only run this once when component mounts
    const timer = setTimeout(() => {
      toogledynamicVariable();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [toogledynamicVariable]);

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

  // Auto-sync the chats list on mount so sidebar isn't empty on first open
  useEffect(() => {
    (async () => {
      try { await syncChatsIntoLocalStorage(20); } catch {}
    })();
  }, []);

  return (
    <Routes>
      <Route path="/call" element={<ChatPage />} />
      <Route path="/" element={
        <div className="app-container" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'white',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Sidebar */}
          <motion.div 
            className="sidebar"
            initial={{ x: -300 }}
            animate={{ x: showSidebar ? 0 : -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '250px',
              height: '100%',
              background: '#f8f9fa',
              borderRight: '1px solid #e9ecef',
              zIndex: 1001,
              padding: '16px 16px 20px',
              overflowY: 'auto',
            }}
          >
            <div style={{ 
              marginBottom: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px 0 8px',
              position: 'sticky',
              top: 0,
              background: '#f8f9fa',
              zIndex: 1
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '1rem', 
                color: '#343a40',
                fontWeight: 600
              }}>Conversations</h3>
              <button
                onClick={() => setShowSidebar(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6c757d',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '4px',
                }}
                title="Close sidebar"
              >
                <FiX size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                onClick={async () => {
                  try {
                    await syncChatsIntoLocalStorage(20);
                    // Force re-render to reflect latest localStorage list
                    setSidebarRefresh((v) => v + 1);
                    // Try to auto-load the most recent chat so the user sees history immediately
                    try {
                      const raw = localStorage.getItem('hume_chats');
                      const list: Array<{ chat_id: string; chat_group_id?: string }> = raw ? JSON.parse(raw) : [];
                      if (list.length > 0 && list[0]?.chat_id) {
                        await loadFromHume(list[0].chat_id);
                      } else {
                        console.info('No Hume chats found after refresh. Start a new conversation to create one.');
                      }
                    } catch (parseErr) {
                      console.warn('Failed to parse refreshed chat list', parseErr);
                    }
                  } catch (e) {
                    console.error('Failed to refresh chats list', e);
                  }
                }}
                style={{
                  background: '#e9ecef',
                  border: '1px solid #dee2e6',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: 'pointer'
                }}
              >Refresh</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {/* Stored Conversations (friendly names) */}
              {(() => {
                const list = listStoredChats(50);
                return list.map((h) => {
                  const convId = `hume-${h.chat_id}`;
                  const isActive = currentConversationId === convId;
                  return (
                    <div
                      key={h.chat_id}
                      onClick={() => {
                        loadFromHume(h.chat_id);
                        setShowSidebar(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        background: isActive ? '#e7f5ff' : '#e7f5ff',
                        border: `1px solid ${isActive ? '#4dabf7' : '#e9ecef'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: '#343a40',
                      }}>
                        {h.name || `Hume chat ${(h.chat_id ?? '').substring(0, 6)}...`}
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        color: '#6c757d',
                      }}>
                        {new Date(h.updated_at ?? Date.now()).toLocaleString()}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </motion.div>

          {/* Overlay when sidebar is open */}
          {showSidebar && (
            <div 
              onClick={() => setShowSidebar(false)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.3)',
                zIndex: 1000,
              }}
            />
          )}

          {/* Header */}
          <motion.div 
            className="app-header"
            onClick={toggleMinimize}
            style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #1971c2, #1864ab)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              position: 'relative',
              zIndex: 1002,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  (async () => { try { await syncChatsIntoLocalStorage(20); } catch {} ; await loadFromHume(); })();
                  setShowSidebar(!showSidebar);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '6px',
                  width: '100px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                title="Show conversations"
              >
              <span>History</span>
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  // (async () => { try { await syncChatsIntoLocalStorage(20); } catch {} ; await loadFromHume(); })();
                  await getAudioContructions("fac1de25-adc1-49bb-978e-5a892b5732fb");
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '6px',
                  width: '100px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                title="Restore from Hume"
              >
                <span>Download</span>
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  // Prefer chat id from current conversation, fallback to last stored
                  try {
                    const current = conversations.find(c => c.id === currentConversationId);
                    const chatId = current?.humeChatId || localStorage.getItem('hume_chat_id') || undefined;
                    if (!chatId) {
                      console.warn('No Hume chat to resume. Start a chat first.');
                      return;
                    }
                    await resumeChat(chatId, currentConversationId || 'default');
                    console.info('Resumed Hume chat', chatId);
                    // Immediately restore the view so user sees the history
                    await loadFromHume(chatId);
                  } catch (err) {
                    console.error('Failed to resume chat', err);
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '6px',
                  width: '100px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                title="Resume last chat session"
              >
                <span>Resume</span>
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const current = conversations.find(c => c.id === currentConversationId);
                    const chatId = current?.humeChatId || localStorage.getItem('hume_chat_id') || undefined;
                    if (!chatId) {
                      console.warn('No Hume chat to fetch transcript for.');
                      return;
                    }
                    const transcript = await getChatTranscript(chatId);
                    // Simple display for now
                    console.info('[Transcript]', '\n' + transcript);
                    alert('Transcript copied to console.');
                  } catch (err) {
                    console.error('Failed to get transcript', err);
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '6px',
                  width: '100px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                title="Show transcript in console"
              >
                <span>Transcript</span>
              </button>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#4dabf7',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.3)'
                }} />
                {conversations.find(c => c.id === currentConversationId)?.title || 'AICO Assistant'}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={handleCallClick}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
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
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                title="Start new conversation"
              >
                <FiPlus size={14} />
                <span>New</span>
              </button>
              <motion.div
                animate={{ rotate: isMinimized ? 0 : 180 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="app-content"
            variants={containerVariants}
            initial="expanded"
            animate={isMinimized ? "minimized" : "expanded"}
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              background: '#f8f9fa',
              alignItems: 'center',
            }}
          >
            {/* Messages container */}
            <motion.div 
              className="messages-container"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                width: '80%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                wordWrap: 'break-word',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                overflowX: 'hidden',
                '& > *': {
                  maxWidth: '100%',
                  minWidth: 0 
                }
              }}
            >
              <AnimatePresence>
                {messages.map((msg) => {
                  const isDetached = Boolean(detached[msg.id])
                  
                  if (isDetached) {
                    const d = detached[msg.id]
                    return (
                      <motion.div
                        key={`float-${msg.id}`}
                        className="detached-message"
                        style={{
                          position: 'fixed',
                          left: '80%',
                          top: '50%',
                          transform: `translate(-50%, -50%) translate(${d.x}px, ${d.y}px)`,
                          zIndex: 1001,
                          maxWidth: '600px',
                          background: 'white',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                          overflow: 'hidden',
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <div style={{ 
                          padding: '12px 16px',
                          background: '#f8f9fa',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #e9ecef',
                        }}>
                          <span style={{ 
                            fontSize: '0.8rem',
                            color: '#495057',
                            fontWeight: 500,
                            textTransform: 'capitalize'
                          }}>
                            {msg.role}
                          </span>
                          <button
                            onClick={() => {
                              setDetached(prev => {
                                const next = { ...prev }
                                delete next[msg.id]
                                return next
                              })
                              setResetSignal(n => n + 1)
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#868e96',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                            }}
                            title="Return to chat"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                        <div style={{ padding: '16px' }}>
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
                    )
                  }

                  return (
                    <motion.div
                      key={msg.id}
                      variants={messageVariants}
                      style={{
                        opacity: isDetached ? 0.5 : 1,
                        transition: 'opacity 0.2s ease',
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
                            setDetached(prev => {
                              const next = { ...prev }
                              delete next[msg.id]
                              return next
                            })
                            setResetSignal(n => n + 1)
                          }}
                          style={{
                            background: 'rgba(0,0,0,0.05)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#495057',
                            flexShrink: 0,
                          }}
                          title="Return to chat"
                        >
                          <FiPlus style={{ transform: 'rotate(45deg)' }} size={16} />
                        </button>
                      )}
                    </motion.div>
                  )
                })}
                <div ref={messagesEndRef} />
              </AnimatePresence>
            </motion.div>

            {/* Input area */}
            <div style={{
              padding: '16px',
              background: 'white',
              width: '100%',
              borderTop: '1px solid #e9ecef',
              boxShadow: '0 -2px 10px rgba(0,0,0,0.02)'
            }}>
              <ChatInput 
                onSend={handleSend} 
                onAudioSend={handleAudioSend}
                onAudioToggle={(isRecording) => {
                  console.log('Audio recording:', isRecording)
                  // Implement audio recording logic here
                }} 
                placeholder="Type a message..."
              />
              
              <div style={{
                fontSize: '0.7rem',
                color: '#868e96',
                textAlign: 'center',
                marginTop: '8px',
                opacity: 0.7
              }}>
                Drag messages to detach them • AICO v1.0.0
              </div>
            </div>
          </motion.div>
        </div>
      } />
    </Routes>
  );
}

export default App
