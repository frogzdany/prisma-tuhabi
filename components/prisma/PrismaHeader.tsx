"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { Icon } from "@/components/icon/Icon";
import { PrismaLogoMark } from "@/components/icon/PrismaLogoMark";

// Prisma header — adapted from the design package's <Header /> component.
// Logo + name/subtitle on the left, inline stats panel on the right.

export interface PrismaHeaderProps {
  counters?: {
    total: number;
    iBuyer: number;
    pulppo: number;
    nurture: number;
  };
}

const DEFAULT_COUNTERS = { total: 23, iBuyer: 14, pulppo: 7, nurture: 2 };

export function PrismaHeader({ counters = DEFAULT_COUNTERS }: PrismaHeaderProps) {
  // Stats panel hidden by default — it's decorative chrome that distracts
  // during the demo. Toggle on to surface it for engineering / Q&A.
  const [showStats, setShowStats] = useState(false);

  return (
    <Box
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border"
      bg="bg.surface"
      px={{ base: 4, md: "24px" }}
      py={{ base: 3, md: "20px" }}
      boxShadow="card"
    >
      <HStack justify="space-between" align="center" gap={6} flexWrap="wrap">
        {/* Left: logo + title */}
        <HStack gap={4} align="center">
          <Box
            w="56px"
            h="56px"
            borderRadius="xl"
            bg="linear-gradient(135deg, #1C2438 0%, #131927 100%)"
            borderWidth="1px"
            borderColor="border.strong"
            display="grid"
            placeItems="center"
            overflow="hidden"
            position="relative"
          >
            <PrismaLogoMark size={34} />
          </Box>
          <Stack gap="4px">
            <HStack gap="10px" align="baseline">
              <Text fontSize="24px" fontWeight="700" letterSpacing="-0.015em" color="fg" lineHeight="1.1">
                Prisma
              </Text>
              <Text fontSize="16px" color="fg.faint">
                ·
              </Text>
              <Text fontSize="16px" color="fg.muted" fontWeight="500">
                Centro de Triaje Tuhabi
              </Text>
            </HStack>
            <HStack gap={0} fontSize="11.5px" color="fg.dim" letterSpacing="0.14em" textTransform="uppercase" fontWeight="600">
              <Text>INTERNAL</Text>
              <Text mx="6px" color="fg.faint">
                ·
              </Text>
              <Text>GTM HACKATHON CDMX</Text>
            </HStack>
          </Stack>
        </HStack>

        {/* Right: inline stat panel (toggle to show / hide) */}
        <HStack gap="14px" align="center">
          {showStats && (
            <HStack gap={0} align="stretch">
              <StatCell label="Hoy" value={counters.total} color="fg" />
              <StatCell label="iBuyer" value={counters.iBuyer} color="brand.300" hasBorder />
              <StatCell label="Pulppo" value={counters.pulppo} color="pulppo.400" hasBorder />
              <StatCell label="Nurture" value={counters.nurture} color="nurture.400" hasBorder isLast />
            </HStack>
          )}
          <Box
            as="button"
            onClick={() => setShowStats((v) => !v)}
            h="34px"
            px="12px"
            borderRadius="md"
            borderWidth="1px"
            borderColor={showStats ? "accent.line" : "border"}
            bg={showStats ? "accent.subtle" : "bg.elevated"}
            color={showStats ? "accent" : "fg.muted"}
            display="flex"
            alignItems="center"
            gap="6px"
            cursor="pointer"
            transition="all 120ms ease"
            _hover={{ bg: showStats ? "accent.subtle" : "bg.subtle", color: showStats ? "accent" : "fg" }}
            title={showStats ? "Ocultar métricas" : "Ver métricas del día"}
            aria-pressed={showStats}
          >
            <Icon name={showStats ? "visibility_off" : "visibility"} size={14} />
            <Text fontSize="12px" fontWeight="600" letterSpacing="0.02em">
              {showStats ? "Ocultar" : "Métricas"}
            </Text>
          </Box>
        </HStack>
      </HStack>
    </Box>
  );
}

function StatCell({
  label,
  value,
  color,
  hasBorder,
  isLast,
}: {
  label: string;
  value: number;
  color: string;
  hasBorder?: boolean;
  isLast?: boolean;
}) {
  return (
    <Stack
      gap={1}
      align="flex-start"
      px={isLast ? "4px" : "22px"}
      pl={hasBorder ? "22px" : "0"}
      borderRightWidth={isLast ? "0" : "1px"}
      borderColor="border.soft"
      minW="88px"
    >
      <Text fontSize="26px" fontWeight="700" letterSpacing="-0.02em" lineHeight="1" color={color} fontFamily="mono" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </Text>
      <Text fontSize="11px" color="fg.dim" letterSpacing="0.14em" textTransform="uppercase" fontWeight="600">
        {label}
      </Text>
    </Stack>
  );
}
