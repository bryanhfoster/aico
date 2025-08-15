import './App.css'
import ChatInput from './components/ChatInput'
import ChatBubble, { type ChatRole } from './components/ChatBubble'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiX, FiMaximize2, FiMinimize2, FiPhone } from 'react-icons/fi'
import { sendAudioToHume, sendMessageToHume } from './Services/humeService'
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

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
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
      
      const response = await sendAudioToHume(audioBlob, conversationHistory);
      
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
      
      // Update the placeholder message with the final voice message
      setConversations(prev => {
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
            title: c.title === 'New Conversation' ? 'Voice message' : c.title
          };
        });
      });
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
      const response = await sendMessageToHume(conversationHistory);
      
      const agentMsg: Message = { 
        id: crypto.randomUUID(), 
        role: 'agent',
        text: String(response),
        timestamp: new Date()
      };
      
      // Update conversation with AI response
      setConversations(prev => 
        prev.map(c => c.id === currentConversationId 
          ? { 
              ...c, 
              messages: [...c.messages, agentMsg],
              title: c.title === 'New Conversation' 
                ? text.substring(0, 30) + (text.length > 30 ? '...' : '')
                : c.title,
              updatedAt: new Date()
            } 
          : c
        )
      );
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
  
  // const deleteConversation = useCallback((conversationId: string) => {
  //   setConversations(prev => {
  //     const updated = prev.filter(c => c.id !== conversationId);
  //     if (conversationId === currentConversationId && updated.length > 0) {
  //       setCurrentConversationId(updated[0].id);
  //     } else if (updated.length === 0) {
  //       createNewConversation();
  //     }
  //     return updated.length > 0 ? updated : [];
  //   });
  // }, [currentConversationId, createNewConversation]);

  const [detached, setDetached] = useState<Record<string, { id: string; x: number; y: number }>>({})
  const [resetSignal, setResetSignal] = useState<number>(0)
  const [isMinimized, setIsMinimized] = useState<boolean>(false)
  const [showSidebar, setShowSidebar] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

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
              top: 100,
              width: '250px',
              height: '100%',
              background: '#f8f9fa',
              borderRight: '1px solid #e9ecef',
              zIndex: 1001,
              padding: '16px',
              overflowY: 'auto',
            }}
          >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#343a40' }}>Conversations</h3>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {conversations.map(conv => (
                <div 
                  key={conv.id}
                  onClick={() => {
                    setCurrentConversationId(conv.id);
                    setShowSidebar(false);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: conv.id === currentConversationId ? '#e7f5ff' : 'white',
                    border: `1px solid ${conv.id === currentConversationId ? '#4dabf7' : '#e9ecef'}`,
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
                    textOverflow: 'ellipsis'
                  }}>
                    {conv.title}
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#6c757d',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {conv.messages.filter(m => m.role === 'user' || m.role === 'agent').length} messages • {new Date(conv.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
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
