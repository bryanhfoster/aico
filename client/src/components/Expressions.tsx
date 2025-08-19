// import React from "react";
// import { motion } from "framer-motion";

// // Define types for your data
// interface ExpressionData {
//   [key: string]: number;
// }

// // Mock data for expression colors and labels
// const expressionColors: Record<string, string> = {
//   happy: "#FFD700",
//   sad: "#1E90FF",
//   angry: "#FF4500",
//   surprised: "#9370DB",
//   fearful: "#8B4513",
//   disgusted: "#32CD32",
//   neutral: "#A9A9A9",
// };

// const expressionLabels: Record<string, string> = {
//   happy: "Happy",
//   sad: "Sad",
//   angry: "Angry",
//   surprised: "Surprised",
//   fearful: "Fearful",
//   disgusted: "Disgusted",
//   neutral: "Neutral",
// };

// // Helper function to check if a key exists in expressionColors
// const isExpressionColor = (key: string): boolean => {
//   return key in expressionColors;
// };

// const Expressions: React.FC<{ values: ExpressionData }> = ({ values }) => {
//   // Get top 3 expressions by value
//   const top3 = Object.entries(values)
//     .sort(([, a], [, b]) => b - a)
//     .slice(0, 3);

//   return (
//     <div className="text-xs p-3 w-full grid grid-cols-1 md:grid-cols-3 gap-3">
//       {top3.map(([key, value]) => {
//         const color = isExpressionColor(key)
//           ? expressionColors[key]
//           : "var(--bg)";
        
//         const clampedValue = Math.min(Math.max(value, 0), 1);
//         const percentage = `${clampedValue * 100}%`;

//         return (
//           <div key={key} className="w-full overflow-hidden">
//             <div className="flex items-center justify-between gap-1 pb-1">
//               <div className="font-medium truncate tracking-tight">
//                 {expressionLabels[key] || key}
//               </div>
//               <div className="tabular-nums opacity-50 tracking-tight">
//                 {value.toFixed(2)}
//               </div>
//             </div>
//             <div className="relative h-1" style={{ "--bg": color } as React.CSSProperties}>
//               <div className="absolute top-0 left-0 size-full rounded-full opacity-10 bg-[var(--bg)]" />
//               <motion.div
//                 className="absolute top-0 left-0 h-full bg-[var(--bg)] rounded-full"
//                 initial={{ width: 0 }}
//                 animate={{ width: percentage }}
//                 transition={{ duration: 0.5 }}
//               />
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// };

// export default Expressions;

import { expressionColors, isExpressionColor } from "../Utils/expressionsColors";
import { expressionLabels } from "../Utils/expressionLabels";
import { motion } from "framer-motion";
import * as R from "remeda";
import { useEffect, useState } from "react";

export default function Expressions({
  values,
}: {
  values: Record<string, number>;
}) {
  const top3 = R.pipe(
    values,
    R.entries(),
    R.sortBy(R.pathOr([1], 0)),
    R.reverse(),
    R.take(3)
  );

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const containerStyle = {
    fontSize: "0.75rem",
    padding: "0.75rem",
    width: "100%",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
    gap: "0.75rem",
  };

  // CSS styles as a JavaScript object
  const styles = {
    container: {
      fontSize: "0.75rem",
      padding: "0.75rem",
      width: "100%",
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "0.75rem",
      "@media (min-width: 768px)": {
        gridTemplateColumns: "repeat(3, 1fr)"
      }
    },
    expressionItem: {
      width: "70%",
      overflow: "hidden"
    },
    expressionHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.25rem",
      paddingBottom: "0.25rem"
    },
    expressionLabel: {
      fontWeight: 500,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      letterSpacing: "-0.025em"
    },
    expressionValue: {
      fontVariantNumeric: "tabular-nums",
      opacity: 0.5,
      letterSpacing: "-0.025em"
    },
    progressBarContainer: {
      position: "relative",
      height: "0.25rem"
    },
    progressBarBackground: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "9999px",
      opacity: 0.1
    },
    progressBarFill: {
      position: "absolute",
      top: 0,
      left: 0,
      height: "100%",
      borderRadius: "9999px"
    }
  };

  return (
    <div style={containerStyle}>
      {top3.map(([key, value]) => (
        <div key={key} style={styles.expressionItem}>
          <div style={styles.expressionHeader}>
            <div style={styles.expressionLabel}>
              {expressionLabels[key]}
            </div>
            <div style={styles.expressionValue}>{value.toFixed(2)}</div>
          </div>
          <div style={styles.progressBarContainer}>
            <div 
              style={{
                ...styles.progressBarBackground,
                backgroundColor: isExpressionColor(key) 
                  ? expressionColors[key] 
                  : "var(--bg)"
              }} 
            />
            <motion.div
              style={{
                ...styles.progressBarFill,
                backgroundColor: isExpressionColor(key) 
                  ? expressionColors[key] 
                  : "var(--bg)"
              }}
              initial={{ width: 0 }}
              animate={{
                width: `${R.pipe(
                  value,
                  R.clamp({ min: 0, max: 1 }),
                  (value) => `${value * 100}%`
                )}`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}