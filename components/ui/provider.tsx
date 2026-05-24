"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { system } from "@/lib/theme";
import { EmotionRegistry } from "./emotion-registry";

// The app is always dark (set on <html> in app/layout.tsx), and nothing reads
// useColorMode/useColorModeValue, so we skip next-themes' ThemeProvider — its
// inline FOUC script triggers React 19's "Encountered a script tag while
// rendering React component" warning.
//
// EmotionRegistry pipes Chakra's Emotion-generated CSS into the SSR HTML via
// useServerInsertedHTML so the server- and client-rendered trees agree on
// where the <style> tag lives, fixing the React 19 hydration mismatch.
export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <EmotionRegistry>
      <ChakraProvider value={system}>{children}</ChakraProvider>
    </EmotionRegistry>
  );
}
