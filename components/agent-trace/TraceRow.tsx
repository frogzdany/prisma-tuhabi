"use client";

import { Badge, Box, Code, HStack, Stack, Text } from "@chakra-ui/react";

export interface TraceEvent {
  step: number;
  type: "tool_call" | "tool_result" | "text" | "finish" | "error";
  name?: string;
  input?: unknown;
  output?: unknown;
  text?: string;
  message?: string;
  durationMs?: number;
}

export function TraceRow({ event }: { event: TraceEvent }) {
  const palette = paletteForType(event.type);
  return (
    <Box
      borderLeft="3px solid"
      borderColor={palette}
      bg="bg.canvas"
      px={3}
      py={2}
      borderRadius="sm"
    >
      <HStack gap={3} alignItems="flex-start">
        <Text
          fontFamily="mono"
          fontSize="xs"
          color="fg.muted"
          width="2.5em"
          textAlign="right"
          flexShrink={0}
        >
          {event.step.toString().padStart(2, "0")}
        </Text>
        <Stack gap={1} flex="1" minW="0">
          <HStack gap={2}>
            <Badge size="sm" colorPalette={paletteName(event.type)} variant="subtle">
              {event.type}
            </Badge>
            {event.name && (
              <Text fontFamily="mono" fontSize="xs" fontWeight="semibold">
                {event.name}
              </Text>
            )}
            {typeof event.durationMs === "number" && (
              <Text fontFamily="mono" fontSize="xs" color="fg.muted">
                {event.durationMs}ms
              </Text>
            )}
          </HStack>
          {event.text && (
            <Text fontSize="sm" color="fg">
              {event.text}
            </Text>
          )}
          {event.message && (
            <Text fontSize="sm" color="fg.muted">
              {event.message}
            </Text>
          )}
          {(event.input !== undefined || event.output !== undefined) && (
            <Code
              variant="surface"
              fontSize="2xs"
              whiteSpace="pre-wrap"
              maxH="180px"
              overflowY="auto"
              p={2}
              borderRadius="sm"
            >
              {compactJson(event.input ?? event.output)}
            </Code>
          )}
        </Stack>
      </HStack>
    </Box>
  );
}

export function TraceStat({
  label,
  value,
  color = "fg",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Stack gap={0} alignItems="flex-end">
      <Text fontFamily="mono" fontSize="md" color={color} lineHeight="1">
        {value}
      </Text>
      <Text
        fontFamily="mono"
        fontSize="2xs"
        color="fg.muted"
        textTransform="uppercase"
        letterSpacing="wider"
      >
        {label}
      </Text>
    </Stack>
  );
}

function compactJson(v: unknown): string {
  const s = JSON.stringify(v, null, 2);
  if (!s) return "";
  return s.length > 1000 ? s.slice(0, 1000) + "\n…" : s;
}

function paletteForType(t: TraceEvent["type"]): string {
  if (t === "tool_call") return "brand.500";
  if (t === "tool_result") return "green.500";
  if (t === "text") return "purple.500";
  if (t === "finish") return "teal.500";
  return "red.500";
}

function paletteName(t: TraceEvent["type"]): string {
  if (t === "tool_call") return "brand";
  if (t === "tool_result") return "green";
  if (t === "text") return "purple";
  if (t === "finish") return "teal";
  return "red";
}
