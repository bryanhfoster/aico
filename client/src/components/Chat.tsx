// "use client";

// import { VoiceProvider } from "@humeai/voice-react";
// import Messages from "./Messages";
// import Controls from "./Controls";
// import StartCall from "./StartCall";
// import { type ComponentRef, useRef, useEffect } from "react";
// import { toast } from "sonner";

// export default function ClientComponent({
//   accessToken,
// }: {
//   accessToken: string;
// }) {
//   const timeoutRef = useRef<number | null>(null);
//   const messagesRef = useRef<ComponentRef<typeof Messages> | null>(null);
//   const configId = import.meta.env.VITE_HUME_CONFIG_KEY;
//   useEffect(() => {
//     return () => {
//       if (timeoutRef.current) {
//         clearTimeout(timeoutRef.current);
//       }
//     };
//   }, []);

//   // Styles
//   const styles = {
//     container: {
//       display: 'flex',
//       flexDirection: 'column' as const,
//       height: '100%',
//     },
//     content: {
//       flex: 1,
//       overflow: 'hidden',
//     },
//     wrapper: {
//       height: '100%',
//       display: 'flex',
//       flexDirection: 'column' as const,
//     },
//     messagesContainer: {
//       flex: 1,
//       overflowY: 'auto' as const,
//       padding: '1rem',
//       backgroundColor: '#212121',
//     },
//     controlsContainer: {
//       padding: '1rem',
//       backgroundColor: '#212121',
//     },
//     controlsInner: {
//       maxWidth: '64rem',
//       margin: '0 auto',
//       width: '100%',
//     },
//     startCallContainer: {
//       marginTop: '1rem',
//     },
//   };

//   return (
//     <div style={styles.container}>
      
//       <div style={styles.content}>
//         <VoiceProvider
//           onMessage={() => {
//             if (timeoutRef.current) {
//               clearTimeout(timeoutRef.current);
//             }

//             timeoutRef.current = window.setTimeout(() => {
//               if (messagesRef.current) {
//                 const scrollHeight = messagesRef.current.scrollHeight;
//                 messagesRef.current.scrollTo({
//                   top: scrollHeight,
//                   behavior: "smooth",
//                 });
//               }
//             }, 200);
//           }}
//           onError={(error) => {
//             toast.error(error.message);
//           }}
//           onToolCall={async (toolCall, send) => {
//             console.log("Tool call received:", toolCall);
//             try {
//               switch (toolCall?.name) {
//                 case "cancel_ride_by_id": {
//                   return send.success("Ride cancelled successfully");
//                 }
//                 case "get_partner_data": {
//                   return send.success("2 Rides scheduled for tomorrow, Ride 1 is at 10:00 AM from Lahore to Islamabad and Ride 2 is at 11:00 AM from Karachi to Lahore");
//                 }
//                 case "create_ride": {
//                   return send.success("Ride created successfully");
//                 }
//                 default: {
//                   return send.error({
//                     error: `Unsupported tool: ${toolCall?.name ?? "unknown"}`,
//                     code: "TOOL_NOT_IMPLEMENTED",
//                     level: "warn",
//                     content: "This tool is not implemented on the client.",
//                   });
//                 }
//               }
//             } catch (err) {
//               return send.error({
//                 error: "Tool call failed",
//                 code: "TOOL_CALL_ERROR",
//                 level: "error",
//                 content: err instanceof Error ? err.message : "Unknown error occurred",
//               });
//             }
//           }}
//           onInterruption={() => {
//             console.log("Interruption detected");
//           }}
//         >
//           <div style={styles.wrapper}>
//             <div style={styles.messagesContainer}>
//               <Messages ref={messagesRef} />
//             </div>
            
//             <div style={styles.controlsContainer}>
//               <div style={styles.controlsInner}>
//                 <Controls />
//                 <div style={styles.startCallContainer}>
//                   <StartCall configId={configId} accessToken={accessToken} />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </VoiceProvider>
//       </div>
//     </div>
//   );
// }

"use client";

import { VoiceProvider } from "@humeai/voice-react";
import Messages from "./Messages";
import Controls from "./Controls";
import StartCall from "./StartCall";
import { type ComponentRef, useRef, useEffect, useState } from "react";
import { toast } from "sonner";

type Ride = {
  id: string;
  source: string;
  destination: string;
  time: string;
};

export default function ClientComponent({
  accessToken,
}: {
  accessToken: string;
}) {
  const timeoutRef = useRef<number | null>(null);
  const messagesRef = useRef<ComponentRef<typeof Messages> | null>(null);
  const configId = import.meta.env.VITE_HUME_CONFIG_KEY;

  // 🚖 rides stored in state
  const [rides, setRides] = useState<Ride[]>([
    {
      id: "1",
      source: "Lahore",
      destination: "Islamabad",
      time: "10:00 AM",
    },
    {
      id: "2",
      source: "Karachi",
      destination: "Lahore",
      time: "11:00 AM",
    },
  ]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column" as const,
      height: "100%",
    },
    content: {
      flex: 1,
      overflow: "hidden",
    },
    wrapper: {
      height: "100%",
      display: "flex",
      flexDirection: "column" as const,
    },
    messagesContainer: {
      flex: 1,
      overflowY: "auto" as const,
      padding: "1rem",
      backgroundColor: "#212121",
    },
    controlsContainer: {
      padding: "1rem",
      backgroundColor: "#212121",
    },
    controlsInner: {
      maxWidth: "64rem",
      margin: "0 auto",
      width: "100%",
    },
    startCallContainer: {
      marginTop: "1rem",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <VoiceProvider
          onMessage={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

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
                // 🚖 Cancel ride by ID
                case "cancel_ride_by_id": {
                  const rideId = toolCall.parameters?.id;
                  if (!rideId) {
                    return send.error({
                      error: "Missing ride id",
                      code: "BAD_REQUEST",
                      level: "warn",
                      content: "Missing ride id",
                    });
                  }

                  setRides((prev) =>
                    prev.filter((ride) => ride.id !== String(rideId))
                  );

                  return send.success(`Ride ${rideId} cancelled successfully`);
                }

                // 🚖 Get all rides
                case "get_partner_data": {
                  if (rides.length === 0) {
                    return send.success("No rides are currently scheduled.");
                  }

                  const rideList = rides
                    .map(
                      (r) =>
                        `Ride ${r.id}: ${r.time} from ${r.source} to ${r.destination}`
                    )
                    .join(" | ");

                  return send.success(`Scheduled rides: ${rideList}`);
                }

                // 🚖 Create new ride
                case "create_ride": {
                  let params: any = {};
                  try {
                    params =
                      typeof toolCall.parameters === "string"
                        ? JSON.parse(toolCall.parameters)
                        : toolCall.parameters;
                  } catch (err) {
                    return send.error({
                      error: "Invalid parameters JSON",
                      code: "BAD_REQUEST",
                      level: "error",
                      content: String(err),
                    });
                  }
                
                  const { pickup_location, destination, scheduled_time } = params;
                
                  if (!pickup_location || !destination || !scheduled_time) {
                    return send.error({
                      error: "Missing pickup_location, destination, or scheduled_time",
                      code: "BAD_REQUEST",
                      level: "warn",
                      content: "Missing pickup_location, destination, or scheduled_time",
                    });
                  }
                
                  const newRide: Ride = {
                    id: Date.now().toString(),
                    source: pickup_location,
                    destination,
                    time: scheduled_time,
                  };
                
                  setRides((prev) => [...prev, newRide]);
                
                  return send.success(
                    `Ride created: ${newRide.time} from ${newRide.source} to ${newRide.destination}`
                  );
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
                content:
                  err instanceof Error ? err.message : "Unknown error occurred",
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
