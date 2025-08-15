"use client";
import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { type ComponentRef, forwardRef } from "react";

const Messages = forwardRef<
  ComponentRef<"div">,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages } = useVoice();

  // Styles
  const styles = {
    container: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0.75rem',
    },
    messageWrapper: (isUser: boolean) => ({
      display: 'flex',
      width: '100%',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeIn 0.2s ease-out',
    }),
    messageContent: (isUser: boolean) => ({
      display: 'flex',
      maxWidth: '80%',
      gap: '0.5rem',
      alignItems: 'flex-end',
      flexDirection: isUser ? 'row-reverse' : 'row' as const,
    }),
    avatar: (isUser: boolean) => ({
      width: '2rem',
      height: '2rem',
      borderRadius: '50%',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 600,
      fontSize: '0.875rem',
      backgroundColor: isUser ? '#7c3aed' : '#8b5cf6',
    }),
    messageBubble: (isUser: boolean) => ({
      padding: '0.75rem',
      borderRadius: '1rem',
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
      maxWidth: '100%',
      wordWrap: 'break-word' as const,
      backgroundColor: isUser ? '#7c3aed' : '#f3f4f6',
      color: isUser ? 'white' : '#1f2937',
      borderBottomRightRadius: isUser ? '0.25rem' : '1rem',
      borderBottomLeftRadius: isUser ? '1rem' : '0.25rem',
    }),
    messageText: {
      fontSize: '0.875rem',
    },
    messageTime: (isUser: boolean) => ({
      fontSize: '0.75rem',
      marginTop: '0.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      color: isUser ? '#e9d5ff' : '#6b7280',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
    }),
    keyframes: `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,
  };

  // Format time to HH:MM AM/PM
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div style={styles.container} ref={ref}>
      <style>{styles.keyframes}</style>
      <AnimatePresence>
        {messages.map((msg, index) => {
          if (msg.type === "user_message" || msg.type === "assistant_message") {
            const isUser = msg.type === "user_message";
            const time = formatTime(msg.receivedAt);
            
            return (
              <motion.div
                key={msg.type + index}
                style={styles.messageWrapper(isUser)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div style={styles.messageContent(isUser)}>
                  <div style={styles.avatar(isUser)}>
                    {isUser ? 'U' : 'AI'}
                  </div>
                  
                  <div style={styles.messageBubble(isUser)}>
                    <div style={styles.messageText}>{msg.message.content}</div>
                    <div style={styles.messageTime(isUser)}>
                      {time}
                      {isUser && <span>✓✓</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }
          return null;
        })}
      </AnimatePresence>
    </div>
  );
});

export default Messages;