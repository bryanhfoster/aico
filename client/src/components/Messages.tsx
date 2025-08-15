"use client";
import { cn } from "./../Utils/index";
import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { type ComponentRef, forwardRef } from "react";

const Messages = forwardRef<
  ComponentRef<"div">,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages } = useVoice();

  // Format time to HH:MM AM/PM
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={ref}>
      <AnimatePresence>
        {messages.map((msg, index) => {
          if (msg.type === "user_message" || msg.type === "assistant_message") {
            const isUser = msg.type === "user_message";
            const time = formatTime(msg.receivedAt);
            
            return (
              <motion.div
                key={msg.type + index}
                className={cn(
                  "flex w-full",
                  isUser ? "justify-end" : "justify-start"
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className={cn(
                  "flex max-w-[80%] items-end gap-2",
                  isUser ? "flex-row-reverse" : "flex-row"
                )}>
                  {!isUser ? (
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm">
                      AI
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm">
                      U
                    </div>
                  )}
                  
                  <div className={cn(
                    "p-3 rounded-2xl",
                    isUser 
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-800 rounded-bl-none"
                  )}>
                    <div className="text-sm">{msg.message.content}</div>
                    <div className={cn(
                      "text-xs mt-1 flex items-center gap-1",
                      isUser ? "text-purple-200 justify-end" : "text-gray-500"
                    )}>
                      {time}
                      {isUser && (
                        <span>✓✓</span>
                      )}
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