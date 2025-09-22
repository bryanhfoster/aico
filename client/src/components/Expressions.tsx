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