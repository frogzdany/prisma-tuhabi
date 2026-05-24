"use client";

// Material Symbols Rounded wrapper. Match the design's Icon component.
// CSS class .msr is defined in app/globals.css and the font is loaded in app/layout.tsx.

import { Box, type BoxProps } from "@chakra-ui/react";

export interface IconProps extends Omit<BoxProps, "as" | "children" | "fill"> {
  /** Material Symbols name (e.g. "psychology_alt", "location_on", "play_arrow"). */
  name: string;
  /** Pixel size (font-size). */
  size?: number;
  /** When true, fills the glyph (variable font axis). */
  filled?: boolean;
  /** When true, applies a spin animation. */
  spin?: boolean;
}

export function Icon({
  name,
  size = 18,
  filled = false,
  spin = false,
  className,
  style,
  ...rest
}: IconProps) {
  const classes = ["msr", filled ? "fill" : "", spin ? "prisma-spin" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <Box
      as="span"
      className={classes}
      style={{ fontSize: `${size}px`, ...style }}
      {...rest}
    >
      {name}
    </Box>
  );
}
