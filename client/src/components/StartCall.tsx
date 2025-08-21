import { useVoice } from "@humeai/voice-react";
import { toast } from "sonner";
import StartCallUI from "./VoiceContent";

export default function StartCall({ configId, accessToken }: { 
  configId?: string; 
  accessToken: string 
}) {
  const { status, connect } = useVoice();
  
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
    <StartCallUI 
      status={status} 
      startCall={startCall} 
      configId={configId} 
      accessToken={accessToken} 
    />
  );
}
