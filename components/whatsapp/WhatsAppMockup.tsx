"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon/Icon";
import { PrismaLogoMark } from "@/components/icon/PrismaLogoMark";

// Phone mockup styled per the Prisma design package (prisma/project/index.html).
// WhatsApp-inspired layout but using Prisma's dark navy + teal accent — feels
// like a clean assistant conversation preview, not a chat-clone.

export interface WhatsAppMockupProps {
  incomingMessage?: string;
  isAgentTyping?: boolean;
  agentReply?: string;
  voiceUrl?: string | null;
  videoUrl?: string | null;
  videoCoverUrl?: string | null;
  emptyHint?: string;
}

const PHONE_BG = "#06090F";
const PHONE_BORDER = "#1A2236";
const SCREEN_HDR_GRADIENT = "linear-gradient(180deg, #0F1A2C 0%, #0C1525 100%)";
const INPUT_BG = "#0C1525";

export function WhatsAppMockup({
  incomingMessage,
  isAgentTyping,
  agentReply,
  voiceUrl,
  videoUrl,
  videoCoverUrl,
  emptyHint = "Elige una situación arriba y presiona Triar para ver la conversación.",
}: WhatsAppMockupProps) {
  // Compute the timestamp only after mount — `new Date()` in render produces
  // different output server-side vs client-side and triggers hydration errors.
  const [now, setNow] = useState("");
  useEffect(() => {
    setNow(
      new Intl.DateTimeFormat("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date())
    );
  }, []);

  const chatRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [incomingMessage, agentReply, voiceUrl, videoUrl, isAgentTyping]);

  return (
    <Box
      // Phone shell
      w="320px"
      bg={PHONE_BG}
      borderRadius="38px"
      p="10px"
      borderWidth="1px"
      borderColor={PHONE_BORDER}
      boxShadow="0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 1.5px #0B1120 inset, 0 30px 60px -30px rgba(0,0,0,0.7)"
      position="relative"
    >
      {/* Dynamic Island / notch */}
      <Box
        position="absolute"
        top="14px"
        left="50%"
        transform="translateX(-50%)"
        w="100px"
        h="26px"
        bg={PHONE_BG}
        borderRadius="14px"
        zIndex={2}
      />

      {/* Screen */}
      <Box
        bg="bg.surface"
        borderRadius="30px"
        overflow="hidden"
        display="flex"
        flexDirection="column"
        h="600px"
      >
        {/* Header bar */}
        <Box bgGradient={SCREEN_HDR_GRADIENT} borderBottomWidth="1px" borderColor="border.soft" pt="36px" pb="12px" px="14px">
          <HStack gap="10px" align="center">
            <Box
              w="34px"
              h="34px"
              borderRadius="full"
              bg="linear-gradient(135deg, #1C2438, #131927)"
              borderWidth="1px"
              borderColor="border.strong"
              display="grid"
              placeItems="center"
              position="relative"
            >
              <PrismaLogoMark size={18} />
              {/* Status dot */}
              <Box
                position="absolute"
                bottom={0}
                right={0}
                w="9px"
                h="9px"
                borderRadius="full"
                bg="accent"
                borderWidth="2px"
                borderColor="#0C1525"
              />
            </Box>
            <Stack gap="1px" flex="1">
              <Text fontSize="13px" fontWeight="600" color="fg" lineHeight="1.2">
                Prisma · Tuhabi
              </Text>
              <HStack gap="5px" align="center">
                <Box w="5px" h="5px" borderRadius="full" bg="accent" />
                <Text fontSize="10.5px" color="accent" fontWeight="500">
                  asistente IA · en línea
                </Text>
              </HStack>
            </Stack>
            <HStack gap="4px" color="fg.muted">
              <HeaderIconButton name="call" />
              <HeaderIconButton name="more_vert" />
            </HStack>
          </HStack>
        </Box>

        {/* Chat area */}
        <Box
          ref={chatRef}
          flex="1"
          bg="bg.canvas"
          backgroundImage="radial-gradient(circle at 30% 0%, rgba(94,234,212,0.04), transparent 50%)"
          px="12px"
          py="14px"
          overflowY="auto"
          display="flex"
          flexDirection="column"
          gap="8px"
        >
          {!incomingMessage && !isAgentTyping && !agentReply ? (
            <Stack m="auto" gap="10px" align="center" textAlign="center" color="fg.dim" maxW="220px" px="16px">
              <Icon name="chat_bubble_outline" size={28} style={{ color: "var(--chakra-colors-fg-faint)" }} />
              <Text fontSize="12.5px" lineHeight="1.6">
                {emptyHint}
              </Text>
            </Stack>
          ) : (
            <>
              <DayPill>HOY</DayPill>
              {incomingMessage && <UserBubble text={incomingMessage} time={now} />}
              {isAgentTyping && <TypingBubble />}
              {agentReply && <AgentBubble text={agentReply} time={now} />}
              {voiceUrl && <VoiceBubble url={voiceUrl} time={now} />}
              {videoUrl && <VideoBubble url={videoUrl} poster={videoCoverUrl ?? undefined} time={now} />}
            </>
          )}
        </Box>

        {/* Input bar */}
        <HStack bg={INPUT_BG} borderTopWidth="1px" borderColor="border.soft" px="10px" py="10px" gap="8px">
          <Box flex="1" bg="bg.elevated" borderWidth="1px" borderColor="border" borderRadius="full" px="14px" py="8px" fontSize="12px" color="fg.dim">
            Escribe un mensaje…
          </Box>
          <Box w="36px" h="36px" borderRadius="full" bg="accent" color="#052520" display="grid" placeItems="center" flexShrink={0}>
            <Icon name="mic" size={16} />
          </Box>
        </HStack>
      </Box>
    </Box>
  );
}

// ----- Sub-components -----

function HeaderIconButton({ name }: { name: string }) {
  return (
    <Box
      as="button"
      w="30px"
      h="30px"
      borderRadius="8px"
      display="grid"
      placeItems="center"
      transition="background 120ms ease"
      _hover={{ bg: "rgba(255,255,255,0.05)" }}
      cursor="pointer"
    >
      <Icon name={name} size={16} />
    </Box>
  );
}

function DayPill({ children }: { children: React.ReactNode }) {
  return (
    <Box alignSelf="center" my="4px">
      <Text
        fontSize="10px"
        letterSpacing="0.16em"
        textTransform="uppercase"
        color="fg.dim"
        bg="rgba(255,255,255,0.03)"
        borderWidth="1px"
        borderColor="border.soft"
        px="10px"
        py="4px"
        borderRadius="full"
        fontWeight="500"
      >
        {children}
      </Text>
    </Box>
  );
}

function UserBubble({ text, time }: { text: string; time: string }) {
  return (
    <BubbleWrapper side="in">
      <Box
        bg="bg.subtle"
        color="fg"
        maxW="78%"
        px="11px"
        py="8px"
        pb="6px"
        borderRadius="14px"
        borderBottomLeftRadius="4px"
        fontSize="12.5px"
        lineHeight="1.4"
      >
        <Text whiteSpace="pre-wrap">{text}</Text>
        <HStack gap="3px" justify="flex-end" mt="3px" fontSize="9.5px" color="fg.faint">
          <Text>{time}</Text>
        </HStack>
      </Box>
    </BubbleWrapper>
  );
}

function AgentBubble({ text, time }: { text: string; time: string }) {
  return (
    <BubbleWrapper side="out">
      <Box
        bg="linear-gradient(180deg, #14352F 0%, #0E2A26 100%)"
        color="#DFFBF3"
        maxW="78%"
        px="11px"
        py="8px"
        pb="6px"
        borderRadius="14px"
        borderBottomRightRadius="4px"
        fontSize="12.5px"
        lineHeight="1.4"
        borderWidth="1px"
        borderColor="rgba(94,234,212,0.18)"
      >
        <Text whiteSpace="pre-wrap">{text}</Text>
        <HStack gap="3px" justify="flex-end" mt="3px" fontSize="9.5px" color="rgba(223,251,243,0.55)">
          <Icon name="done_all" size={11} />
          <Text>{time}</Text>
        </HStack>
      </Box>
    </BubbleWrapper>
  );
}

function TypingBubble() {
  return (
    <BubbleWrapper side="out">
      <HStack
        bg="bg.elevated"
        px="12px"
        py="10px"
        borderRadius="14px"
        borderBottomRightRadius="4px"
        gap="3px"
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            w="5px"
            h="5px"
            borderRadius="full"
            bg="fg.dim"
            animation="prisma-blink 1.2s ease-in-out infinite"
            style={{ animationDelay: `${i * 0.15}s` }}
            css={{
              "@keyframes prisma-blink": {
                "0%, 60%, 100%": { opacity: 0.3 },
                "30%": { opacity: 1 },
              },
            }}
          />
        ))}
      </HStack>
    </BubbleWrapper>
  );
}

function VoiceBubble({ url, time }: { url: string; time: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onMeta = () => setDuration(el.duration);
    const onTime = () => {
      if (el.duration) setProgress(el.currentTime / el.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play();
      setPlaying(true);
    }
  };

  const fmt = (s: number | null) => {
    if (s == null || Number.isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  // 28-bar waveform — heights based on sine for organic look.
  const bars = Array.from({ length: 28 }).map((_, i) => 4 + Math.abs(Math.sin(i * 1.3)) * 14 + (i % 3) * 2);

  return (
    <BubbleWrapper side="out">
      <Box
        bg="linear-gradient(180deg, #14352F 0%, #0E2A26 100%)"
        color="#DFFBF3"
        maxW="260px"
        px="11px"
        py="8px"
        pb="6px"
        borderRadius="14px"
        borderBottomRightRadius="4px"
        borderWidth="1px"
        borderColor="rgba(94,234,212,0.18)"
      >
        <HStack gap="8px" align="center">
          <Box
            as="button"
            onClick={toggle}
            w="26px"
            h="26px"
            borderRadius="full"
            bg="accent"
            color="#052520"
            display="grid"
            placeItems="center"
            flexShrink={0}
            cursor="pointer"
          >
            <Icon name={playing ? "pause" : "play_arrow"} size={16} filled />
          </Box>
          <HStack gap="2px" align="center" h="22px" flex="1">
            {bars.map((h, i) => {
              const idxFrac = i / (bars.length - 1);
              const isPlayed = idxFrac <= progress;
              return (
                <Box
                  key={i}
                  w="2px"
                  h={`${h}px`}
                  bg={isPlayed ? "accent" : "rgba(94,234,212,0.55)"}
                  borderRadius="1px"
                  transition="background-color 0.2s"
                />
              );
            })}
          </HStack>
          <Text fontSize="10px" color="rgba(223,251,243,0.65)" style={{ fontVariantNumeric: "tabular-nums" }} flexShrink={0}>
            {fmt(audioRef.current?.currentTime ?? 0)} / {fmt(duration)}
          </Text>
        </HStack>
        <HStack gap="3px" justify="flex-end" mt="3px" fontSize="9.5px" color="rgba(223,251,243,0.55)">
          <Icon name="done_all" size={11} />
          <Text>{time}</Text>
        </HStack>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={audioRef} src={url} preload="metadata" />
      </Box>
    </BubbleWrapper>
  );
}

function VideoBubble({ url, poster, time }: { url: string; poster?: string; time: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play();
      setPlaying(true);
    }
  };

  return (
    <BubbleWrapper side="out">
      <Box
        bg="linear-gradient(180deg, #14352F 0%, #0E2A26 100%)"
        maxW="280px"
        p="6px"
        borderRadius="14px"
        borderBottomRightRadius="4px"
        borderWidth="1px"
        borderColor="rgba(94,234,212,0.18)"
      >
        <Box position="relative" borderRadius="10px" overflow="hidden" bg="black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={url}
            poster={poster}
            playsInline
            controls={playing}
            onEnded={() => setPlaying(false)}
            onPause={() => setPlaying(false)}
            style={{ width: "100%", display: "block", aspectRatio: "16 / 9", objectFit: "cover" }}
          />
          {!playing && (
            <Box
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onClick={toggle}
              bg="rgba(0,0,0,0.30)"
              _hover={{ bg: "rgba(0,0,0,0.40)" }}
              transition="background 0.2s"
            >
              <Box
                w="44px"
                h="44px"
                borderRadius="full"
                bg="accent"
                color="#052520"
                display="grid"
                placeItems="center"
                boxShadow="0 4px 16px rgba(0,0,0,0.5)"
              >
                <Icon name="play_arrow" size={22} filled />
              </Box>
            </Box>
          )}
          <HStack
            position="absolute"
            bottom="6px"
            left="6px"
            gap="4px"
            px="8px"
            py="3px"
            borderRadius="6px"
            bg="rgba(0,0,0,0.55)"
            color="white"
            fontSize="9.5px"
            fontFamily="mono"
          >
            <Icon name="movie" size={11} filled />
            <Text>Tour AI · Veo 3</Text>
          </HStack>
        </Box>
        {/* Caption — explains what the video is for so the recipient gets context */}
        <Stack gap="2px" px="4px" pt="6px" pb="2px">
          <Text fontSize="11px" color="rgba(223,251,243,0.92)" lineHeight="1.35" fontWeight="500">
            🎬 Tour AI de tu propiedad
          </Text>
          <Text fontSize="10px" color="rgba(223,251,243,0.62)" lineHeight="1.4">
            Generado para que tu asesor lo comparta con compradores antes de la visita —
            ahorra tiempo y mejora cómo se muestra tu casa.
          </Text>
        </Stack>
        <HStack gap="3px" justify="flex-end" mt="2px" mr="2px" fontSize="9.5px" color="rgba(223,251,243,0.55)">
          <Icon name="done_all" size={11} />
          <Text>{time}</Text>
        </HStack>
      </Box>
    </BubbleWrapper>
  );
}

function BubbleWrapper({ side, children }: { side: "in" | "out"; children: React.ReactNode }) {
  return (
    <Box
      display="flex"
      justifyContent={side === "out" ? "flex-end" : "flex-start"}
      animation="prisma-bubble-in 0.22s ease-out"
      css={{
        "@keyframes prisma-bubble-in": {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      {children}
    </Box>
  );
}
