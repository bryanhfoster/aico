import { useVoice } from "@humeai/voice-react";
import { Button } from "./button";
import { Mic, MicOff, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Toggle } from "./toggle";
import MicFFT from "./MicFFT";
import { useState } from "react";

export default function Controls() {
  const { disconnect, status, isMuted, unmute, mute, micFft, pauseAssistant, resumeAssistant } = useVoice();
  const [assistantPaused, setAssistantPaused] = useState(false);

  // CSS styles as JavaScript objects
  const styles = {
    container: {
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      padding: "1rem",
      paddingBottom: "1.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(to top, var(--card-bg), var(--card-bg-90), var(--card-bg-0))"
    },
    controlsWrapper: {
      padding: "1rem",
      backgroundColor: "var(--card-bg)",
      border: "1px solid var(--border-color-50)",
      borderRadius: "9999px",
      display: "flex",
      alignItems: "center",
      gap: "1rem"
    },
    toggleButton: {
      borderRadius: "9999px"
    },
    micFFTContainer: {
      position: "relative",
      height: "2rem",
      width: "12rem",
      flexShrink: 1,
      flexGrow: 0,
      display: "grid"
    },
    endCallButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      borderRadius: "9999px",
      backgroundColor: "var(--destructive-bg)",
      color: "var(--destructive-fg)",
      padding: "0.5rem 1rem",
      border: "none",
      cursor: "pointer"
    },
    interruptButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      borderRadius: "9999px",
      backgroundColor: "var(--button-bg)",
      color: "var(--button-text)",
      padding: "0.5rem 1rem",
      border: "1px solid var(--border-color-50)",
      cursor: "pointer"
    },
    icon: {
      width: "1rem",
      height: "1rem"
    },
    phoneIcon: {
      width: "1rem",
      height: "1rem",
      opacity: 0.5,
      fill: "currentColor",
      strokeWidth: 0
    }
  };

  return (
    <div style={styles.container}>
      <AnimatePresence>
        {status.value === "connected" ? (
          <motion.div
            initial={{
              y: "100%",
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: "100%",
              opacity: 0,
            }}
            style={styles.controlsWrapper}
          >
            <Toggle
              style={styles.toggleButton}
              pressed={!isMuted}
              onPressedChange={() => {
                if (isMuted) {
                  unmute();
                } else {
                  mute();
                }
              }}
            >
              {isMuted ? (
                <MicOff style={styles.icon} />
              ) : (
                <Mic style={styles.icon} />
              )}
            </Toggle>

            <div style={styles.micFFTContainer}>
              <MicFFT fft={micFft} style={{ fill: "currentColor" }} />
            </div>

            <Button
              style={styles.interruptButton}
              onClick={() => {
                if (!assistantPaused) {
                  pauseAssistant();
                } else {
                  resumeAssistant();
                }
                if (isMuted) unmute();
                setAssistantPaused(!assistantPaused);
              }}
            >
              <span>{assistantPaused ? "Resume" : "Interrupt"}</span>
            </Button>

            <Button
              style={styles.endCallButton}
              onClick={() => {
                disconnect();
              }}
              variant="destructive"
            >
              <span>
                <Phone style={styles.phoneIcon} />
              </span>
              <span>End Call</span>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}