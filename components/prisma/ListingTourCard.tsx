"use client";

import { Badge, Box, HStack, Heading, Stack, Text } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { Icon } from "@/components/icon/Icon";

export interface ListingTourCardProps {
  fixtureLabel: string;
  zone: string;
  coverUrl?: string | null;
  videoUrl?: string | null;
}

export function ListingTourCard({
  fixtureLabel,
  zone,
  coverUrl,
  videoUrl,
}: ListingTourCardProps) {
  if (!coverUrl && !videoUrl) return null;

  return (
    <Box
      bg="bg.surface"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border"
      boxShadow="card"
      overflow="hidden"
    >
      <HStack
        px="22px"
        py="16px"
        borderBottomWidth="1px"
        borderColor="border.soft"
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={2}
      >
        <HStack gap={2} align="center">
          <Icon name="movie" size={16} filled style={{ color: "var(--chakra-colors-pulppo-400)" }} />
          <Heading as="h3" size="sm" color="fg">
            Tour generado para {fixtureLabel}
          </Heading>
          <Badge colorPalette="purple" variant="subtle" fontSize="10.5px" fontFamily="mono">
            AI · Listing Tour
          </Badge>
        </HStack>
        <Text fontSize="11px" color="fg.dim" fontFamily="mono" letterSpacing="0.02em">
          Imagen 4 + Veo 3 · {zone}
        </Text>
      </HStack>
      <Box p="18px">
        <Stack gap={3}>
          {videoUrl ? (
            <PlayableTour videoUrl={videoUrl} coverUrl={coverUrl ?? undefined} />
          ) : coverUrl ? (
            <Box position="relative" w="100%" borderRadius="md" overflow="hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={`Cover de listing para ${fixtureLabel}`}
                style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" }}
              />
              <Badge
                position="absolute"
                top={2}
                left={2}
                colorPalette="purple"
                variant="solid"
                fontSize="10px"
                fontFamily="mono"
              >
                Imagen 4 · cover
              </Badge>
            </Box>
          ) : null}
          <HStack gap={4} fontSize="11.5px" color="fg.muted" fontFamily="mono" wrap="wrap">
            <HStack gap={1}>
              <Text color="fg.dim">cover:</Text>
              <Text color="fg">imagen-4.0</Text>
            </HStack>
            <Text color="fg.faint">·</Text>
            <HStack gap={1}>
              <Text color="fg.dim">video:</Text>
              <Text color="fg">veo-3.0-fast · 4s · 16:9 · img-to-video</Text>
            </HStack>
            <Text color="fg.faint">·</Text>
            <HStack gap={1}>
              <Text color="fg.dim">generación:</Text>
              <Text color="fg">pre-baked en build</Text>
            </HStack>
          </HStack>
          <Text fontSize="12.5px" color="fg.muted" lineHeight="1.55">
            En producción, Prisma dispara este tour por lead — el asesor o iBuyer lo
            reusa como primer activo del listing antes de visitar la propiedad.
          </Text>
        </Stack>
      </Box>
    </Box>
  );
}

function PlayableTour({ videoUrl, coverUrl }: { videoUrl: string; coverUrl?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const el = ref.current;
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
    <Box position="relative" w="100%" borderRadius="md" overflow="hidden" bg="black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={ref}
        src={videoUrl}
        poster={coverUrl}
        playsInline
        controls={playing}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" }}
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
            w="68px"
            h="68px"
            borderRadius="full"
            bg="accent"
            color="#052520"
            display="grid"
            placeItems="center"
            boxShadow="0 6px 24px rgba(0,0,0,0.5)"
          >
            <Icon name="play_arrow" size={32} filled />
          </Box>
        </Box>
      )}
    </Box>
  );
}
