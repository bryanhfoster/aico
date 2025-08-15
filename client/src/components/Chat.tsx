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

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-gray-200 p-4 bg-white shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800">AI Assistant</h2>
      </div>
      
      <div className="flex-1 overflow-hidden">
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
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-red-500">
              <Messages ref={messagesRef} />
            </div>
            
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="max-w-3xl mx-auto w-full">
                <Controls />
                <div className="mt-4">
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