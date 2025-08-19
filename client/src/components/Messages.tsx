// "use client";
// import { useVoice } from "@humeai/voice-react";
// import { AnimatePresence, motion } from "framer-motion";
// import { type ComponentRef, forwardRef } from "react";

// const Messages = forwardRef<
//   ComponentRef<"div">,
//   Record<never, never>
// >(function Messages(_, ref) {
//   const { messages } = useVoice();

//   // Styles
//   const styles = {
//     container: {
//       flex: 1,
//       overflowY: 'auto' as const,
//       padding: '1rem',
//       display: 'flex',
//       flexDirection: 'column' as const,
//       gap: '0.75rem',
//     },
//     messageWrapper: (isUser: boolean) => ({
//       display: 'flex',
//       width: '100%',
//       justifyContent: isUser ? 'flex-end' : 'flex-start',
//       animation: 'fadeIn 0.2s ease-out',
//     }),
//     messageContent: (isUser: boolean) => ({
//       display: 'flex',
//       maxWidth: '80%',
//       gap: '0.5rem',
//       alignItems: 'flex-end',
//       flexDirection: isUser ? 'row-reverse' : 'row' as const,
//     }),
//     avatar: (isUser: boolean) => ({
//       width: '2rem',
//       height: '2rem',
//       borderRadius: '50%',
//       flexShrink: 0,
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       color: 'white',
//       fontWeight: 600,
//       fontSize: '0.875rem',
//       backgroundColor: isUser ? '#7c3aed' : '#8b5cf6',
//     }),
//     messageBubble: (isUser: boolean) => ({
//       padding: '0.75rem',
//       borderRadius: '1rem',
//       fontSize: '0.875rem',
//       lineHeight: '1.25rem',
//       maxWidth: '100%',
//       wordWrap: 'break-word' as const,
//       backgroundColor: isUser ? '#7c3aed' : '#f3f4f6',
//       color: isUser ? 'white' : '#1f2937',
//       borderBottomRightRadius: isUser ? '0.25rem' : '1rem',
//       borderBottomLeftRadius: isUser ? '1rem' : '0.25rem',
//     }),
//     messageText: {
//       fontSize: '0.875rem',
//     },
//     messageTime: (isUser: boolean) => ({
//       fontSize: '0.75rem',
//       marginTop: '0.25rem',
//       display: 'flex',
//       alignItems: 'center',
//       gap: '0.25rem',
//       color: isUser ? '#e9d5ff' : '#6b7280',
//       justifyContent: isUser ? 'flex-end' : 'flex-start',
//     }),
//     keyframes: `
//       @keyframes fadeIn {
//         from { opacity: 0; transform: translateY(10px); }
//         to { opacity: 1; transform: translateY(0); }
//       }
//     `,
//   };

//   // Format time to HH:MM AM/PM
//   const formatTime = (date: Date) => {
//     return date.toLocaleTimeString(undefined, {
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true
//     });
//   };

//   return (
//     <div style={styles.container} ref={ref}>
//       <style>{styles.keyframes}</style>
//       <AnimatePresence>
//         {messages.map((msg, index) => {
//           if (msg.type === "user_message" || msg.type === "assistant_message") {
//             const isUser = msg.type === "user_message";
//             const time = formatTime(msg.receivedAt);
            
//             return (
//               <motion.div
//                 key={msg.type + index}
//                 style={styles.messageWrapper(isUser)}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.2 }}
//               >
//                 <div style={styles.messageContent(isUser)}>
//                   <div style={styles.avatar(isUser)}>
//                     {isUser ? 'U' : 'AI'}
//                   </div>
                  
//                   <div style={styles.messageBubble(isUser)}>
//                     <div style={styles.messageText}>{msg.message.content}</div>
//                     <div style={styles.messageTime(isUser)}>
//                       {time}
//                       {isUser && <span>✓✓</span>}
//                     </div>
//                   </div>
//                 </div>
//               </motion.div>
//             );
//           }
//           return null;
//         })}
//       </AnimatePresence>
//     </div>
//   );
// });

// export default Messages;

import { type ComponentRef, forwardRef } from "react";
import { useVoice } from "@humeai/voice-react";
import Expressions from "./Expressions";
import { AnimatePresence, motion } from "framer-motion";
// import { cn } from "@/utils"; // Make sure to adjust this import path

const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages } = useVoice();

  // CSS styles as a JavaScript object
  const styles = {
    container: {
      flexGrow: 1,
      overflow: "auto",
      padding: "1rem",
      paddingTop: "6rem",
    },
    innerContainer: {
      maxWidth: "42rem",
      margin: "0 auto",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      paddingBottom: "6rem"
    },
    message: {
      width: "80%",
      backgroundColor: "#ffffff", // Adjust to match your card bg
      border: "1px solid #e5e7eb", // Adjust to match your border color
      borderRadius: "0.75rem",
      color: 'black',
      fontSize: '1rem',
    },
    userMessage: {
      marginLeft: "auto"
    },
    messageHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: "1rem",
      paddingLeft: "0.75rem",
      paddingRight: "0.75rem"
    },
    messageRole: {
      fontSize: "0.75rem",
      textTransform: "capitalize",
      fontWeight: 500,
      lineHeight: 1,
      opacity: 0.5,
      letterSpacing: "-0.025em"
    },
    messageTime: {
      fontSize: "0.75rem",
      textTransform: "capitalize",
      fontWeight: 500,
      lineHeight: 1,
      opacity: 0.5,
      letterSpacing: "-0.025em"
    },
    messageContent: {
      paddingBottom: "0.75rem",
      paddingLeft: "0.75rem",
      paddingRight: "0.75rem"
    }
  };

  return (
    <motion.div
      layoutScroll
      style={styles.container}
      ref={ref}
    >
      <motion.div style={styles.innerContainer}>
        <AnimatePresence mode="popLayout">
          {messages.map((msg, index) => {
            if (
              msg.type === "user_message" ||
              msg.type === "assistant_message"
            ) {
              return (
                <motion.div
                  key={msg.type + index}
                  style={{
                    ...styles.message,
                    ...(msg.type === "user_message" ? styles.userMessage : {})
                  }}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: 0,
                  }}
                >
                  <div style={styles.messageHeader}>
                    <div style={styles.messageRole}>
                      {msg.message.role}
                    </div>
                    <div style={styles.messageTime}>
                      {msg.receivedAt.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                        second: undefined,
                      })}
                    </div>
                  </div>
                  <div style={styles.messageContent}>{msg.message.content}</div>
                  <Expressions values={{ ...msg.models.prosody?.scores }} />
                </motion.div>
              );
            }

            return null;
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
});

export default Messages;