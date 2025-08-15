import React from "react";
import { motion } from "framer-motion";

// Define types for your data
interface ExpressionData {
  [key: string]: number;
}

// Mock data for expression colors and labels
const expressionColors: Record<string, string> = {
  happy: "#FFD700",
  sad: "#1E90FF",
  angry: "#FF4500",
  surprised: "#9370DB",
  fearful: "#8B4513",
  disgusted: "#32CD32",
  neutral: "#A9A9A9",
};

const expressionLabels: Record<string, string> = {
  happy: "Happy",
  sad: "Sad",
  angry: "Angry",
  surprised: "Surprised",
  fearful: "Fearful",
  disgusted: "Disgusted",
  neutral: "Neutral",
};

// Helper function to check if a key exists in expressionColors
const isExpressionColor = (key: string): boolean => {
  return key in expressionColors;
};

const Expressions: React.FC<{ values: ExpressionData }> = ({ values }) => {
  // Get top 3 expressions by value
  const top3 = Object.entries(values)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="text-xs p-3 w-full grid grid-cols-1 md:grid-cols-3 gap-3">
      {top3.map(([key, value]) => {
        const color = isExpressionColor(key)
          ? expressionColors[key]
          : "var(--bg)";
        
        const clampedValue = Math.min(Math.max(value, 0), 1);
        const percentage = `${clampedValue * 100}%`;

        return (
          <div key={key} className="w-full overflow-hidden">
            <div className="flex items-center justify-between gap-1 pb-1">
              <div className="font-medium truncate tracking-tight">
                {expressionLabels[key] || key}
              </div>
              <div className="tabular-nums opacity-50 tracking-tight">
                {value.toFixed(2)}
              </div>
            </div>
            <div className="relative h-1" style={{ "--bg": color } as React.CSSProperties}>
              <div className="absolute top-0 left-0 size-full rounded-full opacity-10 bg-[var(--bg)]" />
              <motion.div
                className="absolute top-0 left-0 h-full bg-[var(--bg)] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: percentage }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Expressions;