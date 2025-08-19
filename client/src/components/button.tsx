import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

// CSS styles for button variants
const buttonStyles = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    whiteSpace: "nowrap",
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 500,
    transitionProperty: "all",
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
    transitionDuration: "150ms",
    outline: "none",
    "&:disabled": {
      pointerEvents: "none",
      opacity: 0.5
    },
    "& svg": {
      pointerEvents: "none",
      flexShrink: 0,
      width: "1rem",
      height: "1rem"
    },
    "&:focusVisible": {
      borderColor: "var(--ring)",
      boxShadow: "0 0 0 3px var(--ring-opacity-50)"
    },
    '&[ariaInvalid="true"]': {
      boxShadow: "0 0 0 1px var(--destructive-opacity-20)",
      '&.dark': {
        boxShadow: "0 0 0 1px var(--destructive-opacity-40)"
      }
    }
  },
  variants: {
    variant: {
      default: {
        backgroundColor: "var(--primary)",
        color: "var(--primary-foreground)",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "&:hover": {
          backgroundColor: "var(--primary-opacity-90)"
        }
      },
      destructive: {
        backgroundColor: "var(--destructive)",
        color: "white",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "&:hover": {
          backgroundColor: "var(--destructive-opacity-90)"
        },
        "&:focusVisible": {
          boxShadow: "0 0 0 3px var(--destructive-opacity-20)"
        },
        "&.dark": {
          backgroundColor: "var(--destructive-opacity-60)"
        }
      },
      outline: {
        border: "1px solid",
        backgroundColor: "var(--background)",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "&:hover": {
          backgroundColor: "var(--accent)",
          color: "var(--accent-foreground)"
        },
        "&.dark": {
          backgroundColor: "var(--input-opacity-30)",
          borderColor: "var(--input)",
          "&:hover": {
            backgroundColor: "var(--input-opacity-50)"
          }
        }
      },
      secondary: {
        backgroundColor: "var(--secondary)",
        color: "var(--secondary-foreground)",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "&:hover": {
          backgroundColor: "var(--secondary-opacity-80)"
        }
      },
      ghost: {
        "&:hover": {
          backgroundColor: "var(--accent)",
          color: "var(--accent-foreground)"
        },
        "&.dark:hover": {
          backgroundColor: "var(--accent-opacity-50)"
        }
      },
      link: {
        color: "var(--primary)",
        textDecoration: "underline",
        textUnderlineOffset: "4px",
        "&:hover": {
          textDecoration: "underline"
        }
      }
    },
    size: {
      default: {
        height: "2.25rem",
        padding: "0.5rem 1rem",
        "&:has(> svg)": {
          paddingLeft: "0.75rem"
        }
      },
      sm: {
        height: "2rem",
        borderRadius: "0.375rem",
        gap: "0.375rem",
        padding: "0 0.75rem",
        "&:has(> svg)": {
          paddingLeft: "0.625rem"
        }
      },
      lg: {
        height: "2.5rem",
        borderRadius: "0.375rem",
        padding: "0 1.5rem",
        "&:has(> svg)": {
          paddingLeft: "1rem"
        }
      },
      icon: {
        width: "2.25rem",
        height: "2.25rem"
      }
    }
  }
};

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: keyof typeof buttonStyles.variants.variant;
  size?: keyof typeof buttonStyles.variants.size;
  asChild?: boolean;
  style?: React.CSSProperties;
}) {
  const Comp = asChild ? Slot : "button";

  // Merge base styles with variant and size styles
  const combinedStyles = {
    ...buttonStyles.base,
    ...buttonStyles.variants.variant[variant],
    ...buttonStyles.variants.size[size],
    ...style,
    backgroundColor: "red",
  };

  return (
    <Comp
      data-slot="button"
      style={combinedStyles}
      {...props}
    />
  );
}

export { Button };