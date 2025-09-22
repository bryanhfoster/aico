
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
      backgroundColor: "#212121", // Adjust to match your card bg
      borderRadius: "0.75rem",
      color: 'white',
      fontSize: '1rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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