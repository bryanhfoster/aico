import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./button";
import { Phone } from "lucide-react";

interface StartCallUIProps {
  status: any;
  startCall: () => void;
  configId?: string;
  accessToken: string;
}

export default function StartCallUI({ status, startCall }: StartCallUIProps) {
  // CSS styles as JavaScript objects
  const styles = {
    overlay: {
      position: "fixed",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      padding: "1rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "var(--background)"
    },
    button: {
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      gap: "0.375rem",
      borderRadius: "9999px",
      padding: "0.5rem 1rem",
      border: "none",
      cursor: "pointer",
      backgroundColor: "var(--button-bg)",
      color: "var(--button-text)"
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
    <AnimatePresence>
      {status.value !== "connected" ? (
        <motion.div
          style={styles.overlay}
          initial="initial"
          animate="enter"
          exit="exit"
          variants={{
            initial: { opacity: 0 },
            enter: { opacity: 1 },
            exit: { opacity: 0 },
          }}
        >
          <AnimatePresence>
            <motion.div
              variants={{
                initial: { scale: 0.5 },
                enter: { scale: 1 },
                exit: { scale: 0.5 },
              }}
            >
              <Button
                style={styles.button}
                onClick={startCall}
              >
                <span>
                  <Phone style={styles.phoneIcon} />
                </span>
                <span>Start Call</span>
              </Button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}