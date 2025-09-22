

import React from "react";
import { motion } from "framer-motion";
import { AutoSizer } from "react-virtualized";

export default function MicFFT({
  fft,
  className,
  style
}: {
  fft: number[];
  className?: string;
  style?: React.CSSProperties;
}) {
  // CSS styles as JavaScript objects
  const styles = {
    container: {
      position: "relative",
      width: "100%",
      height: "100%"
    },
    svg: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: "100%",
      height: "100%"
    }
  };

  return (
    <div style={styles.container}>
      <AutoSizer>
        {({ width, height }) => (
          <motion.svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            style={{
              ...styles.svg,
              ...style
            }}
            className={className}
          >
            {Array.from({ length: 24 }).map((_, index) => {
              const value = (fft[index] ?? 0) / 4;
              const h = Math.min(Math.max(height * value, 2), height);
              const yOffset = height * 0.5 - h * 0.5;

              return (
                <motion.rect
                  key={`mic-fft-${index}`}
                  height={h}
                  width={2}
                  x={2 + (index * width - 4) / 24}
                  y={yOffset}
                  rx={4}
                />
              );
            })}
          </motion.svg>
        )}
      </AutoSizer>
    </div>
  );
}