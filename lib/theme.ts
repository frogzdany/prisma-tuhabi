import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Prisma design system — dark-mode-first, teal-primary.
// Source tokens: prisma/project/index.html design package.

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Brand palette aligned to design's teal accent (#5EEAD4 is brand.300).
        brand: {
          50:  { value: "#F0FDFA" },
          100: { value: "#CCFBF1" },
          200: { value: "#99F6E4" },
          300: { value: "#5EEAD4" }, // ⭐ canonical accent
          400: { value: "#2DD4BF" },
          500: { value: "#14B8A6" },
          600: { value: "#0D9488" },
          700: { value: "#0F766E" },
          800: { value: "#115E59" },
          900: { value: "#134E4A" },
        },
        // Ink palette = the dark-mode surfaces. Lower numbers = lighter.
        ink: {
          50:  { value: "#E6EAF2" }, // body text in dark
          100: { value: "#9AA4BB" }, // muted text
          200: { value: "#6B7691" }, // dim text
          300: { value: "#4A546B" }, // faint text
          400: { value: "#364462" }, // scrollbar hover
          500: { value: "#2A3754" }, // border strong
          600: { value: "#1F2A3F" }, // border default
          700: { value: "#1C2438" }, // elev-3 (selected/active)
          800: { value: "#161D2F" }, // elev-2 (card / hover)
          900: { value: "#111726" }, // elev-1 (panel)
          950: { value: "#0A0E1A" }, // canvas bg (deep navy, not black)
        },
        // Semantic-route accents (kept consistent with design).
        pulppo: {
          400: { value: "#A78BFA" },
        },
        risk: {
          400: { value: "#F59E0B" },
        },
        nurture: {
          400: { value: "#94A3B8" },
        },
      },
      fonts: {
        heading: { value: "var(--font-inter), system-ui, -apple-system, sans-serif" },
        body: { value: "var(--font-inter), system-ui, -apple-system, sans-serif" },
        mono: { value: "var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace" },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          canvas:   { value: { base: "{colors.ink.50}",  _dark: "{colors.ink.950}" } },
          surface:  { value: { base: "white",            _dark: "{colors.ink.900}" } },
          elevated: { value: { base: "{colors.gray.50}", _dark: "{colors.ink.800}" } },
          subtle:   { value: { base: "{colors.gray.100}", _dark: "{colors.ink.700}" } },
          inset:    { value: { base: "{colors.gray.50}", _dark: "#0E1322" } },
        },
        fg: {
          DEFAULT: { value: { base: "{colors.ink.900}", _dark: "{colors.ink.50}" } },
          muted:   { value: { base: "gray.600",         _dark: "{colors.ink.100}" } },
          dim:     { value: { base: "gray.500",         _dark: "{colors.ink.200}" } },
          faint:   { value: { base: "gray.400",         _dark: "{colors.ink.300}" } },
        },
        border: {
          DEFAULT: { value: { base: "gray.200", _dark: "{colors.ink.600}" } },
          strong:  { value: { base: "gray.300", _dark: "{colors.ink.500}" } },
          soft:    { value: { base: "gray.100", _dark: "#182238" } },
        },
        accent: {
          DEFAULT: { value: { base: "{colors.brand.500}", _dark: "{colors.brand.300}" } },
          strong:  { value: { base: "{colors.brand.600}", _dark: "{colors.brand.400}" } },
          subtle:  { value: { base: "{colors.brand.50}",  _dark: "rgba(94,234,212,0.10)" } },
          line:    { value: { base: "{colors.brand.200}", _dark: "rgba(94,234,212,0.28)" } },
        },
      },
      shadows: {
        lift: { value: "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)" },
        card: { value: "0 1px 0 rgba(255,255,255,0.025) inset" },
        accentGlow: { value: "0 0 0 1px rgba(94,234,212,0.35), 0 0 24px -6px rgba(94,234,212,0.35)" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
