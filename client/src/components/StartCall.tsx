"use client";
import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./button";
import { Phone } from "lucide-react";
import { toast } from "sonner";

export default function StartCall({
  configId,
  accessToken,
}: {
  configId?: string;
  accessToken: string;
}) {
  const { status, connect } = useVoice();

  return (
    <AnimatePresence>
      {status.value !== "connected" && (
        <motion.div
          className="fixed inset-0 p-4 flex items-center justify-center bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.5 }}
          >
            <Button
              className="z-50 flex items-center gap-1.5 rounded-full"
              onClick={() => {
                connect({
                  auth: { type: "accessToken", value: accessToken },
                  configId,
                })
                  .catch(() => {
                    toast.error("Unable to start call");
                  });
              }}
            >
              <Phone className="size-4 opacity-50 fill-current" strokeWidth={0} />
              <span>Start Call</span>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}