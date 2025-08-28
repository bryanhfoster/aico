"use client";

import { VoiceProvider } from "@humeai/voice-react";
import Messages from "./Messages";
import Controls from "./Controls";
import StartCall from "./StartCall";
import { type ComponentRef, useRef, useEffect } from "react";
import { toast } from "sonner";

export default function ClientComponent({
  accessToken,
}: {
  accessToken: string;
}) {
  const timeoutRef = useRef<number | null>(null);
  const messagesRef = useRef<ComponentRef<typeof Messages> | null>(null);
  const configId = import.meta.env.VITE_HUME_CONFIG_KEY;
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Styles
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100%',
    },
    content: {
      flex: 1,
      overflow: 'hidden',
    },
    wrapper: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '1rem',
      backgroundColor: '#212121',
    },
    controlsContainer: {
      padding: '1rem',
      backgroundColor: '#212121',
    },
    controlsInner: {
      maxWidth: '64rem',
      margin: '0 auto',
      width: '100%',
    },
    startCallContainer: {
      marginTop: '1rem',
    },
  };

  return (
    <div style={styles.container}>
      
      <div style={styles.content}>
        <VoiceProvider
          onMessage={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = window.setTimeout(() => {
              if (messagesRef.current) {
                const scrollHeight = messagesRef.current.scrollHeight;
                messagesRef.current.scrollTo({
                  top: scrollHeight,
                  behavior: "smooth",
                });
              }
            }, 200);
          }}
          onError={(error) => {
            toast.error(error.message);
          }}
          onToolCall={async (toolCall, send) => {
            console.log("Tool call received:", toolCall);
            try {
              switch (toolCall?.name) {
                case "cancel_ride_by_id": {
                  return send.success("Unable to cancel ride, system is down");
                }
                default: {
                  return send.error({
                    error: `Unsupported tool: ${toolCall?.name ?? "unknown"}`,
                    code: "TOOL_NOT_IMPLEMENTED",
                    level: "warn",
                    content: "This tool is not implemented on the client.",
                  });
                }
              }
            } catch (err) {
              return send.error({
                error: "Tool call failed",
                code: "TOOL_CALL_ERROR",
                level: "error",
                content: err instanceof Error ? err.message : "Unknown error occurred",
              });
            }
          }}
          onInterruption={() => {
            console.log("Interruption detected");
          }}
        >
          <div style={styles.wrapper}>
            <div style={styles.messagesContainer}>
              <Messages ref={messagesRef} />
            </div>
            
            <div style={styles.controlsContainer}>
              <div style={styles.controlsInner}>
                <Controls />
                <div style={styles.startCallContainer}>
                  <StartCall configId={configId} accessToken={accessToken} />
                </div>
              </div>
            </div>
          </div>
        </VoiceProvider>
      </div>
    </div>
  );
}