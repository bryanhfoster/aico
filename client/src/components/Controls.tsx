// import { useVoice } from "@humeai/voice-react";
// import { Button } from "./button";
// import { Mic, MicOff, Phone } from "lucide-react";
// import { AnimatePresence, motion } from "framer-motion";
// import { Toggle } from "./toggle";
// import MicFFT from "./MicFFT";
// import { useEffect, useState } from "react";

// export default function Controls() {
//   const {
//     disconnect,
//     status,
//     isMuted,
//     unmute,
//     mute,
//     micFft,
//     pauseAssistant,
//     resumeAssistant,
//     sendSessionSettings
//   } = useVoice();

//   const [assistantPaused, setAssistantPaused] = useState(false);

//   // User input state
//   const [userName, setUserName] = useState("");
//   const [userAge, setUserAge] = useState("");
//   const [isPhilosopher, setIsPhilosopher] = useState(false);
//   const [userContext, setUserContext] = useState("");

//   // CSS styles as JavaScript objects
//   const styles = {
//     container: {
//       position: "fixed",
//       bottom: 0,
//       left: 0,
//       width: "100%",
//       padding: "1rem",
//       paddingBottom: "1.5rem",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//       background: "linear-gradient(to top, var(--card-bg), var(--card-bg-90), var(--card-bg-0))",
//       zIndex: 1 
//     },
//     controlsWrapper: {
//       padding: "1rem",
//       backgroundColor: "var(--card-bg)",
//       borderRadius: "9999px",
//       display: "flex",
//       alignItems: "center",
//       gap: "1rem"
//     },
//     formWrapper: {
//       padding: "1rem",
//       backgroundColor: "#181818",
//       display: "flex",
//       flexDirection: "column",
//       gap: "0.5rem",
//       width: "100%",
//       maxWidth: "20rem",
//       pointerEvents: "auto",
//       zIndex: 9999  , 
//       borderRadius: "20px",
//     },
//     input: {
//       padding: "0.5rem",
//       borderRadius: "0.5rem",
//       color: "white",
//       backgroundColor: "#212121",
//       border: "1px solid #181818"
//     },
//     textarea: {
//       padding: "0.5rem",
//       borderRadius: "0.5rem",
//       minHeight: "4rem",
//       color: "white",
//       backgroundColor: "#212121",
//       border: "1px solid #181818"
//     },
//     checkboxRow: {
//       display: "flex",
//       alignItems: "center",
//       gap: "0.5rem",
//       color: "black"
//     },
//     toggleButton: {
//       borderRadius: "9999px"
//     },
//     micFFTContainer: {
//       position: "relative",
//       height: "2rem",
//       width: "12rem",
//       flexShrink: 1,
//       flexGrow: 0,
//       display: "grid"
//     },
//     endCallButton: {
//       display: "flex",
//       alignItems: "center",
//       gap: "0.25rem",
//       borderRadius: "9999px",
//       backgroundColor: "var(--destructive-bg)",
//       color: "var(--destructive-fg)",
//       padding: "0.5rem 1rem",
//       border: "none",
//       cursor: "pointer"
//     },
//     interruptButton: {
//       display: "flex",
//       alignItems: "center",
//       gap: "0.25rem",
//       borderRadius: "9999px",
//       backgroundColor: "var(--button-bg)",
//       color: "var(--button-text)",
//       padding: "0.5rem 1rem",
//       border: "1px solid var(--border-color-50)",
//       cursor: "pointer"
//     },
//     icon: {
//       width: "1rem",
//       height: "1rem"
//     },
//     phoneIcon: {
//       width: "1rem",
//       height: "1rem",
//       opacity: 0.5,
//       fill: "currentColor",
//       strokeWidth: 0
//     }
//   };

//   // send session settings with user inputs
//   const sendSession = async () => {
//     try {
//       sendSessionSettings({
//         variables: {
//           name: userName,
//           age: Number(userAge),
//           is_philosopher: isPhilosopher
//         },
//         context: {
//           text: userContext,
//           type: "persistent"
//         }
//       });
//     } catch (e) {
//       console.error("Failed to send session settings", e);
//     }
//   };

//   useEffect(() => {
//     if (status.value === "connected") {
//       sendSession();
//     }
//   }, [status.value]);

//   return (
//     <div style={styles.container}>
//       <AnimatePresence>
//         {status.value === "connected" ? (
//           // === Connected controls ===
//           <motion.div
//             initial={{ y: "100%", opacity: 0 }}
//             animate={{ y: 0, opacity: 1 }}
//             exit={{ y: "100%", opacity: 0 }}
//             style={styles.controlsWrapper}
//           >
//             <Toggle
//               style={styles.toggleButton}
//               pressed={!isMuted}
//               onPressedChange={() => {
//                 if (isMuted) {
//                   unmute();
//                 } else {
//                   mute();
//                 }
//               }}
//             >
//               {isMuted ? (
//                 <MicOff style={styles.icon} />
//               ) : (
//                 <Mic style={styles.icon} />
//               )}
//             </Toggle>

//             <div style={styles.micFFTContainer}>
//               <MicFFT fft={micFft} style={{ fill: "currentColor" }} />
//             </div>

//             <Button
//               style={styles.interruptButton}
//               onClick={() => {
//                 if (!assistantPaused) {
//                   pauseAssistant();
//                 } else {
//                   resumeAssistant();
//                 }
//                 if (isMuted) unmute();
//                 setAssistantPaused(!assistantPaused);
//               }}
//             >
//               <span>{assistantPaused ? "Resume" : "Interrupt"}</span>
//             </Button>

//             <Button
//               style={styles.endCallButton}
//               onClick={() => {
//                 disconnect();
//               }}
//               variant="destructive"
//             >
//               <span>
//                 <Phone style={styles.phoneIcon} />
//               </span>
//               <span>End Call</span>
//             </Button>
//           </motion.div>
//         ) : (
//           // === Pre-call form ===
//           <motion.div
//             initial={{ y: "100%", opacity: 0 }}
//             animate={{ y: 0, opacity: 1 }}
//             exit={{ y: "100%", opacity: 0 }}
//             style={styles.formWrapper}
//           >
//             <input
//               style={styles.input}
//               type="text"
//               placeholder="Your name"
//               value={userName}
//               onChange={(e) => setUserName(e.target.value)}
//             />
//             <input
//               style={styles.input}
//               type="number"
//               placeholder="Your age"
//               value={userAge}
//               onChange={(e) => setUserAge(e.target.value)}
//             />
//             {/* <label style={styles.checkboxRow}>
//               <input
//                 type="checkbox"
//                 checked={isPhilosopher}
//                 onChange={(e) => setIsPhilosopher(e.target.checked)}
//               />
//               Philosopher?
//             </label> */}
//             <textarea
//               style={styles.textarea}
//               placeholder="Context"
//               value={userContext}
//               onChange={(e) => setUserContext(e.target.value)}
//             />
//             <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>
//               Fill this info before starting your call.
//             </p>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }


import { useVoice } from "@humeai/voice-react";
import { Button } from "./button";
import { Mic, MicOff, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Toggle } from "./toggle";
import MicFFT from "./MicFFT";
import { useEffect, useState } from "react";

export default function Controls() {
  const {
    disconnect,
    status,
    isMuted,
    unmute,
    mute,
    micFft,
    pauseAssistant,
    resumeAssistant,
    sendSessionSettings
  } = useVoice();

  const [assistantPaused, setAssistantPaused] = useState(false);

  // Predefined profiles
  const profiles = [
    {
      id: "Upcoming Rides Inquiry",
      name: "Socrates",
      age: 60,
      context: "User wants to know about upcoming rides, always responds after 1 second wait, wait and listen to user."
    },
    {
      id: "Cancel Ride",
      name: "Alice",
      age: 21,
      context: "Recognizes cancellation intent from user input, Confirms ride details before proceeding, Provides cancellation confirmation to user, "
    },
    {
      id: "ETA Request",
      name: "Elena",
      age: 35,
      context: "Recognizes ETA intent from natural language, Provides accurate ETA information, Handles follow-up ETA questions in context, Maintains conversational flow with sub-3-second response."
    }
  ];

  const [selectedProfile, setSelectedProfile] = useState(profiles[0]);

  // CSS styles
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
      background: "linear-gradient(to top, var(--card-bg), var(--card-bg-90), var(--card-bg-0))",
      zIndex: 1 
    },
    controlsWrapper: {
      padding: "1rem",
      backgroundColor: "var(--card-bg)",
      borderRadius: "9999px",
      display: "flex",
      alignItems: "center",
      gap: "1rem"
    },
    formWrapper: {
      padding: "1rem",
      backgroundColor: "#181818",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      width: "100%",
      maxWidth: "20rem",
      pointerEvents: "auto",
      zIndex: 9999, 
      borderRadius: "20px",
    },
    select: {
      padding: "0.5rem",
      borderRadius: "0.5rem",
      color: "white",
      backgroundColor: "#212121",
      border: "1px solid #181818"
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

  // send session settings with selected profile
  const sendSession = async () => {
    try {
      sendSessionSettings({
        variables: {
          name: selectedProfile.name,
          age: selectedProfile.age,
          is_philosopher: selectedProfile.id === "philosopher"
        },
        context: {
          text: selectedProfile.context,
          type: "persistent"
        }
      });
    } catch (e) {
      console.error("Failed to send session settings", e);
    }
  };

  useEffect(() => {
    if (status.value === "connected") {
      sendSession();
    }
  }, [status.value]);

  return (
    <div style={styles.container}>
      <AnimatePresence>
        {status.value === "connected" ? (
          // === Connected controls ===
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            style={styles.controlsWrapper}
          >
            <Toggle
              pressed={!isMuted}
              onPressedChange={() => {
                if (isMuted) unmute();
                else mute();
              }}
            >
              {isMuted ? <MicOff style={styles.icon} /> : <Mic style={styles.icon} />}
            </Toggle>

            <div style={styles.micFFTContainer}>
              <MicFFT fft={micFft} style={{ fill: "currentColor" }} />
            </div>

            <Button
              style={styles.interruptButton}
              onClick={() => {
                if (!assistantPaused) pauseAssistant();
                else resumeAssistant();
                if (isMuted) unmute();
                setAssistantPaused(!assistantPaused);
              }}
            >
              <span>{assistantPaused ? "Resume" : "Interrupt"}</span>
            </Button>

            <Button
              style={styles.endCallButton}
              onClick={() => disconnect()}
              variant="destructive"
            >
              <Phone style={styles.phoneIcon} />
              <span>End Call</span>
            </Button>
          </motion.div>
        ) : (
          // === Pre-call profile select ===
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            style={styles.formWrapper}
          >
            <select
              style={styles.select}
              value={selectedProfile.id}
              onChange={(e) => {
                const profile = profiles.find(p => p.id === e.target.value);
                setSelectedProfile(profile);
              }}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} ({profile.age}) - {profile.context}
                </option>
              ))}
            </select>
            <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>
              Choose a profile before starting your call.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
