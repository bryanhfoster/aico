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
  const configId = '';

  // Clean up timeout on unmount
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
      backgroundColor: 'white',
    },
    header: {
      borderBottom: '1px solid #e5e7eb',
      padding: '1rem',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    },
    headerTitle: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#1f2937',
      margin: 0,
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
      backgroundColor: '#f9fafb',
    },
    controlsContainer: {
      borderTop: '1px solid #e5e7eb',
      padding: '1rem',
      backgroundColor: '#f3f4f6',
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
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>AI Assistant</h2>
      </div>
      
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