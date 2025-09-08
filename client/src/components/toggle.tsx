

// Toggle.tsx
import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"

type ToggleProps = React.ComponentProps<typeof TogglePrimitive.Root> & {
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
}

export function Toggle({
  variant = "default",
  size = "default",
  ...props
}: ToggleProps) {
  // Determine style based on variant and size
  const combinedStyle: React.CSSProperties = {
    ...styles.base,
    ...(variant === "outline" ? styles.outline : {}),
    ...(size === "sm" ? styles.sm : size === "lg" ? styles.lg : styles.default),
  }

  // Apply active (data-state="on") style manually via `style`
  const handleStyle = (state: boolean): React.CSSProperties => {
    return {
      ...combinedStyle,
      ...(state ? styles.on : {}),
    }
  }

  const [pressed, setPressed] = React.useState(
    props.pressed ?? props.defaultPressed ?? false
  )

  return (
    <TogglePrimitive.Root
      {...props}
      pressed={pressed}
      onPressedChange={(value) => {
        props.onPressedChange?.(value)
        setPressed(value)
      }}
      style={handleStyle(pressed)}
    >
      {props.children}
    </TogglePrimitive.Root>
  )
}

// 🔽 All styles at the bottom
const styles: { [key: string]: React.CSSProperties } = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "color 0.2s, box-shadow 0.2s",
    outline: "none",
    minWidth: "2.25rem",
    padding: "0 0.5rem",
    height: "2.25rem",
    backgroundColor: "transparent",
    color: "inherit",
    border: "none",
  },
  outline: {
    border: "1px solid #ccc",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },
  sm: {
    height: "2rem",
    padding: "0 0.375rem",
    minWidth: "2rem",
  },
  lg: {
    height: "2.5rem",
    padding: "0 0.625rem",
    minWidth: "2.5rem",
  },
  default: {
    // already handled in base
  },
  on: {
    backgroundColor: "#e0e0e0",
    color: "#000",
  },
}
