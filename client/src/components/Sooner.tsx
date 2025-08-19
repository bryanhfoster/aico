import React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// CSS styles for the toaster
const toasterStyles = {
  base: {
    position: "fixed",
    zIndex: 9999,
    inset: "16px",
    pointerEvents: "none",
    "--normal-bg": "var(--popover)",
    "--normal-text": "var(--popover-foreground)",
    "--normal-border": "var(--border)",
  } as React.CSSProperties
};

const Toaster = ({ theme = "light", ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      style={toasterStyles.base}
      toastOptions={{
        className: "toaster",
        style: {
          backgroundColor: "var(--normal-bg)",
          color: "var(--normal-text)",
          border: "1px solid var(--normal-border)",
          borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          padding: "12px 16px",
          fontSize: "14px",
          lineHeight: "1.5",
        }
      }}
      {...props}
    />
  );
};

export { Toaster };