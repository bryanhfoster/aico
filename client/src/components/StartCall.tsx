import { useVoice, VoiceProvider } from "@humeai/voice-react";
import { toast } from "sonner";
import StartCallUI from "./VoiceContent";

export default function StartCall({ configId, accessToken }: { 
  configId?: string; 
  accessToken: string 
}) {
  const { status, connect, sendToolMessage } = useVoice();
  
  const handleToolCall = async (toolCall: any, send: any) => {
    console.log("Tool call received:", toolCall);

    if (toolCall.name === "cancel_ride_by_id") {
      try {
        const response = send.success("Failed to cancel ride, try again later");
        sendToolMessage(response);
      } catch (err) {
        console.error("Tool error:", err);
        return send.error({
          error: 'Tool call failed',
          code: 'TOOL_CALL_ERROR',
          level: 'error',
          content: err instanceof Error ? err.message : 'Unknown error occurred'
        });
      }
    }
  };

  const startCall = async () => {
    try {
      await connect({
        auth: { type: "accessToken", value: accessToken },
        configId: configId!,
      });
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Unable to start call");
    }
  };

  return (
    <VoiceProvider onToolCall={handleToolCall} onMessage={(message) => {
      console.log("Message received:", message);
    }}>
      <StartCallUI 
        status={status} 
        startCall={startCall} 
        configId={configId} 
        accessToken={accessToken} 
      />
    </VoiceProvider>
  );
}