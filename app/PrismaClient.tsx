"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Badge,
  Box,
  Button,
  Card,
  Grid,
  GridItem,
  HStack,
  Heading,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import type { TraceEvent } from "@/components/agent-trace/TraceRow";
import { WhatsAppMockup } from "@/components/whatsapp/WhatsAppMockup";
import { AgentFlow } from "@/components/agent-flow/AgentFlow";
import { PrismaCore } from "@/components/prisma-core/PrismaCore";
import { PrismaHeader } from "@/components/prisma/PrismaHeader";
import { ListingTourCard } from "@/components/prisma/ListingTourCard";
import { Icon } from "@/components/icon/Icon";
import { useListingAssets } from "@/lib/listings/use-listing-assets";
import type {
  FeeScenario,
  PulppoBroker,
  TriageDecision,
  TriageRoute,
} from "@/lib/shared/schemas";
import { formatMXN } from "@/lib/shared/fees";

// Leaflet needs `window`, so load PropertyMap only on the client.
const PropertyMap = dynamic(() => import("@/components/leaflet/PropertyMap"), {
  ssr: false,
  loading: () => <Skeleton height="320px" borderRadius="md" />,
});

interface FixtureSummary {
  id: string;
  text: string;
}

// Build flag — set to true to bypass the live agent. Users can also force mock
// by adding ?mock=1 to the URL.
const USE_MOCK = false;

interface FixtureMeta {
  label: string;
  zone: string;
  lat: number;
  lng: number;
  riskTier: number;
  tag: string;
  /** Chakra colorPalette name for the tag badge. */
  tagPalette: "brand" | "purple" | "orange" | "gray";
}

const FIXTURE_META: Record<string, FixtureMeta> = {
  "roma-norte": {
    label: "Roma Norte",
    zone: "CDMX",
    lat: 19.415,
    lng: -99.169,
    riskTier: 1,
    tag: "iBuyer · urgente",
    tagPalette: "brand",
  },
  pedregal: {
    label: "Pedregal",
    zone: "CDMX",
    lat: 19.3045,
    lng: -99.1948,
    riskTier: 1,
    tag: "Luxury · Pulppo",
    tagPalette: "purple",
  },
  ecatepec: {
    label: "Ecatepec",
    zone: "EDOMEX",
    lat: 19.6018,
    lng: -99.0501,
    riskTier: 4,
    tag: "Riesgo alto · Pulppo",
    tagPalette: "orange",
  },
  oaxaca: {
    label: "Oaxaca",
    zone: "OAX",
    lat: 17.0732,
    lng: -96.7266,
    riskTier: 2,
    tag: "Sin cobertura · Nurture",
    tagPalette: "gray",
  },
};

const MAP_FIXTURES = Object.entries(FIXTURE_META).map(([id, m]) => ({
  id,
  label: m.label,
  state: m.zone,
  lat: m.lat,
  lng: m.lng,
  riskTier: m.riskTier,
}));

// Seller-facing labels for live status — must mirror AgentFlow's TOOL_META.
// Duplicated here so PrismaClient stays decoupled from AgentFlow internals,
// and so we never leak tool_name (extract_intent, lookup_zone_risk, …) on
// screen during a demo.
const TOOL_SELLER_LABELS: Record<string, string> = {
  extract_intent: "Entiende tu mensaje",
  lookup_zone_risk: "Analiza tu zona",
  lookup_habimetro: "Estima el valor",
  check_buybox: "Verifica si calificas",
  find_brokers: "Busca asesores",
  compute_fee_scenarios: "Compara opciones",
  draft_reply: "Prepara la respuesta",
  generate_voice_reply: "Genera la nota de voz",
  persist_triage: "Guarda tu caso",
};

type PrismaShape =
  | "speech_bubble"
  | "pin"
  | "coin"
  | "check"
  | "group"
  | "scales"
  | "document"
  | "waveform"
  | "disk";

type PrismaTheme = "emerald" | "indigo" | "cyan" | "teal" | "amber";

// Each tool gets its own outline + color so the visualizer reads as the
// current step at a glance (speech bubble = reading, pin = locating, etc.).
const TOOL_VISUAL: Record<string, { shape: PrismaShape; theme: PrismaTheme }> = {
  extract_intent: { shape: "speech_bubble", theme: "emerald" },
  lookup_zone_risk: { shape: "pin", theme: "cyan" },
  lookup_habimetro: { shape: "coin", theme: "amber" },
  check_buybox: { shape: "check", theme: "teal" },
  find_brokers: { shape: "group", theme: "indigo" },
  compute_fee_scenarios: { shape: "scales", theme: "cyan" },
  draft_reply: { shape: "document", theme: "emerald" },
  generate_voice_reply: { shape: "waveform", theme: "teal" },
  persist_triage: { shape: "disk", theme: "indigo" },
};

const STEP_DEFINITIONS: Array<{ id: 1 | 2 | 3; title: string; subtitle: string }> = [
  { id: 1, title: "Elige", subtitle: "una situación" },
  { id: 2, title: "Triaje", subtitle: "en vivo" },
  { id: 3, title: "Decisión", subtitle: "y opciones" },
];

function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <HStack gap="8px" justify="center" wrap="wrap">
      {STEP_DEFINITIONS.map((step, i) => {
        const isActive = step.id === currentStep;
        const isDone = step.id < currentStep;
        const isPending = step.id > currentStep;
        const bg = isActive ? "accent.subtle" : isDone ? "bg.subtle" : "bg.elevated";
        const borderColor = isActive ? "accent.line" : isDone ? "border" : "border";
        const textColor = isActive ? "accent" : isDone ? "fg" : "fg.dim";
        return (
          <HStack key={step.id} gap="8px">
            <HStack
              gap="12px"
              px="18px"
              py="10px"
              borderRadius="full"
              borderWidth="1px"
              borderColor={borderColor}
              bg={bg}
              transition="all 220ms ease"
              opacity={isPending ? 0.55 : 1}
            >
              <Box
                w="28px"
                h="28px"
                borderRadius="full"
                display="grid"
                placeItems="center"
                bg={isActive ? "accent" : isDone ? "#34D399" : "transparent"}
                color={isActive ? "#052520" : isDone ? "#04231A" : "fg.dim"}
                borderWidth={isPending ? "1px" : "0"}
                borderColor="border.strong"
                fontSize="14px"
                fontWeight="700"
                fontFamily="mono"
                animation={isActive ? "prisma-step-pulse 1.6s ease-in-out infinite" : undefined}
                css={{
                  "@keyframes prisma-step-pulse": {
                    "0%, 100%": { boxShadow: "0 0 0 0 rgba(94,234,212,0.4)" },
                    "50%": { boxShadow: "0 0 0 8px rgba(94,234,212,0)" },
                  },
                }}
              >
                {isDone ? "✓" : step.id}
              </Box>
              <Stack gap={0}>
                <Text fontSize="15px" fontWeight="600" color={textColor} lineHeight="1.15">
                  {step.title}
                </Text>
                <Text fontSize="12px" color="fg.dim" lineHeight="1.15" letterSpacing="0.02em">
                  {step.subtitle}
                </Text>
              </Stack>
            </HStack>
            {i < STEP_DEFINITIONS.length - 1 && (
              <Box w="22px" h="1px" bg={step.id < currentStep ? "#34D399" : "border"} opacity={0.6} />
            )}
          </HStack>
        );
      })}
    </HStack>
  );
}

function SectionShell({
  stepNumber,
  title,
  subtitle,
  children,
  anchorRef,
}: {
  stepNumber: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  anchorRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Box
      ref={anchorRef ?? undefined}
      scrollMarginTop="20px"
      animation="prisma-section-in 0.45s cubic-bezier(0.17, 0.84, 0.44, 1) both"
      css={{
        "@keyframes prisma-section-in": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <HStack gap="12px" mb="14px" align="center">
        <Box
          w="30px"
          h="30px"
          borderRadius="full"
          bg="accent.subtle"
          borderWidth="1px"
          borderColor="accent.line"
          color="accent"
          display="grid"
          placeItems="center"
          fontSize="14px"
          fontWeight="700"
          fontFamily="mono"
        >
          {stepNumber}
        </Box>
        <Stack gap="1px">
          <Text fontSize="17px" fontWeight="700" color="fg" lineHeight="1.15" letterSpacing="-0.005em">
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="13px" color="fg.muted" lineHeight="1.2">
              {subtitle}
            </Text>
          )}
        </Stack>
      </HStack>
      {children}
    </Box>
  );
}

export function PrismaClient({ fixtures }: { fixtures: FixtureSummary[] }) {
  const [selected, setSelected] = useState<string>(fixtures[0]?.id ?? "roma-norte");
  const [text, setText] = useState<string>(fixtures[0]?.text ?? "");
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [decision, setDecision] = useState<TriageDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [decisionInView, setDecisionInView] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const decisionAnchorRef = useRef<HTMLDivElement | null>(null);
  const triageAnchorRef = useRef<HTMLDivElement | null>(null);

  const pickFixture = useCallback(
    (id: string) => {
      setSelected(id);
      const f = fixtures.find((x) => x.id === id);
      if (f) setText(f.text);
      setEvents([]);
      setDecision(null);
      setError(null);
    },
    [fixtures]
  );

  const triar = useCallback(async (override?: { text: string; fixtureId: string }) => {
    // Resolve which message + fixture to send up front — auto-send paths
    // (clicking a cloud) can't rely on stale state from setText.
    const runText = override?.text ?? text;
    const runFixtureId =
      override?.fixtureId ??
      (text === fixtures.find((f) => f.id === selected)?.text ? selected : undefined);

    setRunning(true);
    setEvents([]);
    setDecision(null);
    setError(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Section 2 fades in once `running` is true — wait one frame, then scroll
    // so the user's eye follows the down-arrow on the Triar button.
    requestAnimationFrame(() => {
      triageAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    try {
      const urlMock =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("mock") === "1";
      const mockParam = USE_MOCK || urlMock ? "&mock=1" : "";
      const res = await fetch(`/api/triage?stream=1${mockParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: runText,
          fixtureId: runFixtureId,
          source: "web",
        }),
        signal: ctrl.signal,
      });
      if (!res.body) {
        setError("No response body");
        setRunning(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) {
          const lines = frame.split("\n");
          let eventName = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventName = line.slice(7).trim();
            else if (line.startsWith("data: ")) data += line.slice(6);
          }
          if (!data) continue;
          let parsed: unknown;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          if (eventName === "trace") {
            setEvents((prev) => [...prev, parsed as TraceEvent]);
          } else if (eventName === "done") {
            const done = parsed as { ok: boolean; decision?: TriageDecision; error?: string };
            if (done.decision) setDecision(done.decision);
            if (done.error) setError(done.error);
          } else if (eventName === "error") {
            const e = parsed as { error?: string; decision?: TriageDecision };
            if (e.decision) setDecision(e.decision);
            setError(e.error ?? "Error desconocido");
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") setError(err.message);
    } finally {
      setRunning(false);
    }
  }, [text, selected, fixtures]);

  // ⌘/Ctrl+Enter triggers Triar — adopted from design's keyboard shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!running && text.trim()) triar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, text, triar]);

  // Auto-scroll to the decision card when the run completes — judges shouldn't
  // have to hunt for the wow moment.
  useEffect(() => {
    if (!decision) return;
    // Wait one frame so the decision card mounts before scrolling.
    requestAnimationFrame(() => {
      decisionAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [decision]);

  // Observe the decision card so we can show a sticky strip when scrolled past.
  useEffect(() => {
    if (!decisionAnchorRef.current) {
      setDecisionInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        // "In view" if any part is intersecting (avoids flashing on edges).
        setDecisionInView(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-40px 0px 0px 0px" }
    );
    observer.observe(decisionAnchorRef.current);
    return () => observer.disconnect();
  }, [decision]);

  const scrollToDecision = useCallback(() => {
    decisionAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
  }, []);

  const resetRun = useCallback(() => {
    setEvents([]);
    setDecision(null);
    setError(null);
  }, []);

  const copyJson = useCallback(() => {
    if (!decision) return;
    const payload = {
      scenario: selected,
      route: decision.chosenRoute,
      reason: decision.reason,
      reply: decision.reply,
      scenarios: decision.scenarios,
      brokers: decision.brokers,
      leadId: decision.leadId,
      decisionId: decision.decisionId,
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
  }, [decision, selected]);

  const selectedMeta = FIXTURE_META[selected];
  const assets = useListingAssets(selected);

  // Drive section reveals + step indicator from agent progress.
  const triageStarted = running || events.length > 0 || !!decision;
  const currentStep: 1 | 2 | 3 = decision ? 3 : triageStarted ? 2 : 1;

  // Seller-friendly status label for the PrismaCore visualizer — never expose
  // tool_name (extract_intent, lookup_zone_risk, …) to the audience.
  const lastEventName = events.at(-1)?.name;
  const lastEventLabel = lastEventName ? TOOL_SELLER_LABELS[lastEventName] : null;

  // Per-tool shape + color while running; on completion settle on a green
  // check so the end state reads as "done / success" regardless of route.
  // (Route info still surfaces via the status label + decision card below.)
  const currentVisual = lastEventName ? TOOL_VISUAL[lastEventName] : undefined;
  const prismaShape: PrismaShape | undefined = decision
    ? "check"
    : currentVisual?.shape;
  const prismaTheme: PrismaTheme = decision
    ? "emerald"
    : (currentVisual?.theme ?? "emerald");

  const prismaStatusLabel = running
    ? lastEventLabel
      ? `PRISMA · ${lastEventLabel.toUpperCase()}`
      : "PRISMA · ANALIZANDO TU PROPIEDAD"
    : decision
      ? `PRISMA · RUTA → ${decision.chosenRoute.toUpperCase()}`
      : "PRISMA · LISTO";

  const showIncoming = running || !!decision;
  const incomingMessage = showIncoming ? text : undefined;
  const isAgentTyping = running && !decision;
  const agentReply = decision?.reply.text;
  const voiceUrl = decision?.reply.audioUrl ?? null;
  const videoUrl = decision ? assets.videoUrl : null;
  const videoCoverUrl = decision ? assets.coverUrl : null;

  return (
    <Stack gap="18px">
      <PrismaHeader />

      {/* Demo wayfinder — three large reveal-on-progress steps */}
      <StepIndicator currentStep={currentStep} />

      {/* Step 1 · Elige una situación — always visible */}
      <SectionShell stepNumber={1} title="Elige una situación" subtitle="Pega un mensaje real o usa un caso de demo">
        <MessagePanel
          fixtures={fixtures}
          selected={selected}
          onPick={pickFixture}
          text={text}
          onTextChange={setText}
          onRun={triar}
          onCancel={cancel}
          running={running}
        />
      </SectionShell>

      {/* Step 2 · Triaje en vivo — reveals when the run starts */}
      {triageStarted && (
        <SectionShell
          stepNumber={2}
          title="Triaje en vivo"
          subtitle="Prisma analiza tu propiedad en segundos"
          anchorRef={triageAnchorRef}
        >
          <Stack gap="18px">
            <PrismaCore
              isActive={running || !!decision}
              theme={prismaTheme}
              shape={prismaShape}
              height={240}
              step={events.length}
              statusLabel={prismaStatusLabel}
            />
            <Grid templateColumns={{ base: "1fr", lg: "minmax(320px, 340px) 1fr" }} gap="18px" alignItems="start">
              <GridItem>
                <Box bg="bg.surface" borderRadius="lg" borderWidth="1px" borderColor="border" boxShadow="card" p="14px" display="flex" justifyContent="center">
                  <WhatsAppMockup
                    incomingMessage={incomingMessage}
                    isAgentTyping={isAgentTyping}
                    agentReply={agentReply}
                    voiceUrl={voiceUrl}
                    videoUrl={videoUrl}
                    videoCoverUrl={videoCoverUrl}
                    emptyHint="Elige una situación arriba y presiona Triar para ver la conversación."
                  />
                </Box>
              </GridItem>
              <GridItem>
                <AgentFlow events={events} running={running} />
              </GridItem>
            </Grid>
          </Stack>
        </SectionShell>
      )}

      {/* Step 3 · Tu decisión — reveals when the run completes */}
      {decision && (
        <SectionShell
          stepNumber={3}
          title="Tu decisión"
          subtitle="Ruta recomendada y opciones para tu propiedad"
          anchorRef={decisionAnchorRef}
        >
          <Stack gap="18px">
            <DecisionFooter
              decision={decision}
              onCopy={copyJson}
              onReset={resetRun}
            />
            <FeeScenarioStack scenarios={decision.scenarios} />
          </Stack>
        </SectionShell>
      )}

      {/* Detalles avanzados — collapsible: Listing tour + Map + Brokers */}
      {decision && (
        <AdvancedDetails
          open={advancedOpen}
          onToggle={() => setAdvancedOpen((v) => !v)}
          hasListing={Boolean(assets.coverUrl || assets.videoUrl)}
          isPulppo={decision.chosenRoute === "Pulppo" && decision.brokers.length > 0}
        >
          {(assets.coverUrl || assets.videoUrl) && (
            <ListingTourCard
              fixtureLabel={selectedMeta?.label ?? selected}
              zone={selectedMeta?.zone ?? ""}
              coverUrl={assets.coverUrl}
              videoUrl={assets.videoUrl}
            />
          )}
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="18px">
            <GridItem>
              <Box bg="bg.surface" borderRadius="lg" borderWidth="1px" borderColor="border" boxShadow="card" overflow="hidden" h="100%">
                <HStack justify="space-between" align="center" px="22px" py="16px" borderBottomWidth="1px" borderColor="border.soft">
                  <HStack gap={2}>
                    <Icon name="map" size={16} style={{ color: "var(--chakra-colors-brand-300)" }} />
                    <Heading as="h3" size="sm" color="fg">
                      Ubicación
                    </Heading>
                  </HStack>
                  <Text fontSize="xs" color="fg.muted" fontFamily="mono">
                    {selectedMeta?.label} · {selectedMeta?.zone}
                    {selectedMeta && selectedMeta.riskTier >= 4 && " · riesgo alto"}
                  </Text>
                </HStack>
                <Box p="18px">
                  <PropertyMap
                    fixtures={MAP_FIXTURES}
                    activeFixtureId={selected}
                    decisionColor={decisionRouteColor(decision.chosenRoute)}
                    height="340px"
                  />
                </Box>
              </Box>
            </GridItem>
            <GridItem>
              {decision.chosenRoute === "Pulppo" && decision.brokers.length > 0 ? (
                <BrokerList brokers={decision.brokers} />
              ) : (
                <RouteSummaryCard route={decision.chosenRoute} />
              )}
            </GridItem>
          </Grid>
        </AdvancedDetails>
      )}

      {error && (
        <Box bg="bg.surface" borderRadius="md" borderWidth="1px" borderColor="#FB7185" p={4}>
          <HStack gap={2} mb={1} align="center">
            <Icon name="error" filled size={16} style={{ color: "#FB7185" }} />
            <Text fontSize="sm" fontWeight="600" color="#FB7185">
              Error
            </Text>
          </HStack>
          <Text fontFamily="mono" fontSize="xs" color="fg.muted" whiteSpace="pre-wrap">
            {error}
          </Text>
        </Box>
      )}

      {/* Sticky compact decision strip — appears when decision is scrolled out */}
      {decision && !decisionInView && (
        <StickyDecisionStrip decision={decision} onJump={scrollToDecision} />
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------------
// Sticky compact decision strip — fixed top, only when decision card off-screen
// ----------------------------------------------------------------------------

function StickyDecisionStrip({
  decision,
  onJump,
}: {
  decision: TriageDecision;
  onJump: () => void;
}) {
  const route = decision.chosenRoute;
  const recommended = decision.scenarios.find((s) => s.recommended);
  const offerText = recommended
    ? route === "Nurture"
      ? "Lista de espera"
      : formatMXN(recommended.netToSellerMXN)
    : "—";
  const palette = routeChakraPalette(route);
  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={50}
      bg="rgba(10, 14, 26, 0.85)"
      backdropFilter="saturate(180%) blur(12px)"
      borderBottomWidth="1px"
      borderColor="accent.line"
      boxShadow="0 12px 30px -18px rgba(0,0,0,0.65)"
      animation="prisma-sticky-down 220ms cubic-bezier(0.17, 0.84, 0.44, 1) both"
      css={{
        "@keyframes prisma-sticky-down": {
          from: { opacity: 0, transform: "translateY(-100%)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Box maxW="1480px" mx="auto" px={{ base: 4, md: "32px" }} py="10px">
        <HStack justify="space-between" gap={4} flexWrap="wrap">
          <HStack gap={3} align="center">
            <Box
              w="28px"
              h="28px"
              borderRadius="8px"
              bg="accent"
              color="#052520"
              display="grid"
              placeItems="center"
              flexShrink={0}
            >
              <Icon name="auto_awesome" size={15} filled />
            </Box>
            <HStack gap={3} align="baseline" flexWrap="wrap">
              <Text
                fontSize="10px"
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="accent"
                fontWeight="600"
              >
                Decisión · ruta {route}
              </Text>
              <Text fontSize="13.5px" fontWeight="600" color="fg">
                {offerText}
              </Text>
              <Badge
                colorPalette={palette}
                variant="subtle"
                fontSize="10.5px"
                px="8px"
                py="3px"
              >
                {routeLabel(route)}
              </Badge>
            </HStack>
          </HStack>
          <HStack gap={2}>
            <Box
              as="button"
              onClick={onJump}
              px="12px"
              py="6px"
              borderRadius="8px"
              borderWidth="1px"
              borderColor="border.strong"
              bg="bg.elevated"
              color="fg"
              fontSize="12px"
              fontWeight="500"
              cursor="pointer"
              display="inline-flex"
              alignItems="center"
              gap="6px"
              transition="background 120ms ease"
              _hover={{ bg: "bg.subtle" }}
            >
              <Icon name="arrow_upward" size={13} />
              Ver decisión
            </Box>
          </HStack>
        </HStack>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------------
// Collapsible "Detalles avanzados" — wraps Listing Tour + Map + Brokers
// ----------------------------------------------------------------------------

function AdvancedDetails({
  open,
  onToggle,
  hasListing,
  isPulppo,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  hasListing: boolean;
  isPulppo: boolean;
  children: React.ReactNode;
}) {
  const bits: string[] = [];
  if (hasListing) bits.push("Tour AI");
  bits.push("Mapa");
  if (isPulppo) bits.push("Asesores");
  else bits.push("Resumen de ruta");
  const summary = bits.join(" · ");

  return (
    <Box
      bg="bg.surface"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border"
      boxShadow="card"
      overflow="hidden"
    >
      <Box
        as="button"
        onClick={onToggle}
        w="100%"
        textAlign="left"
        px="22px"
        py="14px"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        gap={3}
        cursor="pointer"
        transition="background 120ms ease"
        _hover={{ bg: "bg.subtle" }}
        aria-expanded={open}
      >
        <HStack gap={2}>
          <Icon name="data_object" size={16} style={{ color: "var(--chakra-colors-brand-300)" }} />
          <Text fontSize="13px" fontWeight="600" color="fg">
            Detalles avanzados
          </Text>
          <Text fontSize="11.5px" color="fg.muted" fontFamily="mono">
            ({summary})
          </Text>
        </HStack>
        <HStack gap={2}>
          <Text fontSize="11.5px" color="fg.dim">
            {open ? "Ocultar" : "Ver"}
          </Text>
          <Icon name={open ? "expand_less" : "expand_more"} size={18} style={{ color: "var(--chakra-colors-fg-muted)" }} />
        </HStack>
      </Box>
      {open && (
        <Box
          px="22px"
          pb="22px"
          pt="6px"
          borderTopWidth="1px"
          borderColor="border.soft"
          animation="prisma-details-in 0.3s ease-out both"
          css={{
            "@keyframes prisma-details-in": {
              from: { opacity: 0, transform: "translateY(-4px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Stack gap="18px" pt="14px">
            {children}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------------
// Message panel — scenario chips + textarea + Triar button
// ----------------------------------------------------------------------------

function MessagePanel({
  fixtures,
  selected,
  onPick,
  text,
  onTextChange,
  onRun,
  onCancel,
  running,
}: {
  fixtures: FixtureSummary[];
  selected: string;
  onPick: (id: string) => void;
  text: string;
  onTextChange: (v: string) => void;
  onRun: (override?: { text: string; fixtureId: string }) => void;
  onCancel: () => void;
  running: boolean;
}) {
  const charCount = text.length;
  const maxChars = 1000;
  // Manual editor is hidden by default — clicking a cloud triggers a run.
  // Users who want to paste a custom WhatsApp message reveal it on demand.
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <Box bg="bg.surface" borderRadius="lg" borderWidth="1px" borderColor="border" boxShadow="card" px="22px" py="22px">
      {/* Header row */}
      <HStack justify="space-between" gap={6} mb="16px" flexWrap="wrap">
        <Stack gap={1}>
          <Text fontSize="17px" fontWeight="700" color="fg" letterSpacing="-0.005em">
            Mensaje del vendedor
          </Text>
          <Text fontSize="14px" color="fg.muted">
            Elige una situación o pega un mensaje real
          </Text>
        </Stack>
        <HStack gap="14px" align="center">
          {/* Pulse chip — "agente en vivo" */}
          <HStack
            gap={2}
            px="10px"
            pl="8px"
            py="5px"
            borderRadius="full"
            bg="accent.subtle"
            borderWidth="1px"
            borderColor="accent.line"
            color="accent"
          >
            <Box w="6px" h="6px" borderRadius="full" bg="accent" className="prisma-pulse" />
            <Text fontSize="11px" fontWeight="500" letterSpacing="0.02em">
              agente en vivo
            </Text>
          </HStack>
        </HStack>
      </HStack>

      {/* Scenario clouds — click any one to triar instantly. Each cloud */}
      {/* shows the full seller "message" preview + a sticker badge for the route. */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap="18px" mb="14px" mt="14px">
        {fixtures.map((f) => {
          const meta = FIXTURE_META[f.id];
          const isActive = f.id === selected;
          const previewText = f.text ?? "";
          const preview =
            previewText.length > 110 ? `${previewText.slice(0, 110).trim()}…` : previewText;
          return (
            <Box key={f.id} position="relative" opacity={running ? 0.55 : 1} transition="opacity 150ms ease">
              {/* Sticker badge — sits ON the cloud, slightly above */}
              {meta?.tag && (
                <Badge
                  colorPalette={meta.tagPalette}
                  variant="solid"
                  position="absolute"
                  top="-9px"
                  right="14px"
                  fontSize="10px"
                  fontWeight="700"
                  letterSpacing="0.02em"
                  textTransform="uppercase"
                  px="10px"
                  py="4px"
                  borderRadius="full"
                  boxShadow="0 6px 16px -6px rgba(0,0,0,0.55)"
                  pointerEvents="none"
                  zIndex={2}
                  display="inline-flex"
                  alignItems="center"
                  gap="6px"
                >
                  <Box w="5px" h="5px" borderRadius="full" bg="currentColor" />
                  {meta.tag}
                </Badge>
              )}
              {/* The cloud itself — click triggers triar immediately */}
              <Box
                as="button"
                w="100%"
                minH="140px"
                textAlign="left"
                p="18px 18px 22px"
                position="relative"
                // Pronounced bubble: very round corners + tail at bottom-left
                borderRadius="26px 26px 26px 6px"
                borderWidth="1px"
                borderColor={isActive ? "accent.line" : "border"}
                bg={isActive ? "bg.subtle" : "bg.elevated"}
                boxShadow={
                  isActive
                    ? "0 0 0 1px rgba(94,234,212,0.35) inset, 0 18px 36px -18px rgba(94,234,212,0.55)"
                    : "0 10px 24px -16px rgba(0,0,0,0.55)"
                }
                onClick={() => {
                  if (running) return;
                  onPick(f.id);
                  onRun({ text: f.text, fixtureId: f.id });
                }}
                aria-disabled={running}
                cursor={running ? "not-allowed" : "pointer"}
                transition="all 200ms cubic-bezier(0.17, 0.84, 0.44, 1)"
                _hover={{
                  borderColor: "accent.line",
                  transform: running ? undefined : "translateY(-3px)",
                  boxShadow: running
                    ? undefined
                    : "0 22px 38px -20px rgba(94,234,212,0.5)",
                }}
                _active={{ transform: running ? undefined : "translateY(-1px)" }}
                // Bubble tail at bottom-left, color-matched
                _before={{
                  content: '""',
                  position: "absolute",
                  bottom: "-1px",
                  left: "-9px",
                  width: "16px",
                  height: "14px",
                  bg: isActive ? "bg.subtle" : "bg.elevated",
                  borderLeftWidth: "1px",
                  borderBottomWidth: "1px",
                  borderColor: isActive ? "accent.line" : "border",
                  borderBottomLeftRadius: "18px",
                  clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
                  transition: "all 200ms ease",
                }}
              >
                <Stack gap="12px">
                  <HStack gap="12px" align="center">
                    <Box
                      w="30px"
                      h="30px"
                      borderRadius="full"
                      bg={isActive ? "accent" : "accent.subtle"}
                      color={isActive ? "#07221E" : "accent"}
                      display="grid"
                      placeItems="center"
                      flexShrink={0}
                      transition="all 150ms ease"
                    >
                      <Icon name="chat" size={16} filled={isActive} />
                    </Box>
                    <Text
                      fontSize="17px"
                      fontWeight="700"
                      color="fg"
                      letterSpacing="-0.005em"
                      lineHeight="1.15"
                    >
                      {meta?.label ?? f.id}
                    </Text>
                  </HStack>
                  <Text
                    fontSize="13.5px"
                    color="fg.muted"
                    lineHeight="1.55"
                    css={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {preview}
                  </Text>
                </Stack>
              </Box>
            </Box>
          );
        })}
      </Grid>

      {/* Hint + editor toggle */}
      <HStack
        justify="space-between"
        align="center"
        flexWrap="wrap"
        gap="10px"
        mt="6px"
        mb={editorOpen ? "12px" : "0"}
      >
        <HStack gap="8px" color="fg.dim" fontSize="13.5px">
          <Icon name="touch_app" size={16} />
          <Text>Toca una nube para triar al instante</Text>
        </HStack>
        <Box
          as="button"
          onClick={() => setEditorOpen((v) => !v)}
          display="inline-flex"
          alignItems="center"
          gap="6px"
          px="14px"
          py="7px"
          borderRadius="full"
          borderWidth="1px"
          borderColor={editorOpen ? "accent.line" : "border"}
          bg={editorOpen ? "accent.subtle" : "bg.elevated"}
          color={editorOpen ? "accent" : "fg.muted"}
          fontSize="13px"
          fontWeight="600"
          cursor="pointer"
          transition="all 120ms ease"
          _hover={{ bg: editorOpen ? "accent.subtle" : "bg.subtle", color: editorOpen ? "accent" : "fg" }}
          aria-expanded={editorOpen}
        >
          <Icon name={editorOpen ? "close" : "edit_note"} size={14} />
          <Text>{editorOpen ? "Cerrar editor" : "Escribir mi propio mensaje"}</Text>
        </Box>
      </HStack>

      {/* Manual editor — hidden by default, only this path uses the Triar button */}
      {editorOpen && (
        <Box
          animation="prisma-editor-in 0.3s cubic-bezier(0.17, 0.84, 0.44, 1) both"
          css={{
            "@keyframes prisma-editor-in": {
              from: { opacity: 0, transform: "translateY(-6px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Grid templateColumns="1fr auto" gap="12px">
            <Box position="relative">
              <Textarea
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Pega aquí un WhatsApp del vendedor…"
                spellCheck={false}
                bg="bg.inset"
                borderColor="border"
                color="fg"
                fontSize="13.5px"
                lineHeight="1.55"
                px="16px"
                pt="14px"
                pb="32px"
                h="96px"
                resize="none"
                autoFocus
                _focus={{
                  borderColor: "accent.line",
                  boxShadow: "0 0 0 3px rgba(94,234,212,0.06)",
                }}
              />
              <HStack
                position="absolute"
                left="14px"
                right="14px"
                bottom="8px"
                justify="space-between"
                align="center"
                fontSize="11px"
                color="fg.faint"
                pointerEvents="none"
              >
                <HStack gap={1}>
                  <Icon name="lock" size={11} />
                  <Text>PII redacted on save</Text>
                </HStack>
                <Text style={{ fontVariantNumeric: "tabular-nums" }}>
                  {charCount} / {maxChars}
                </Text>
              </HStack>
            </Box>
            <Stack gap={2}>
              <Button
                onClick={() => onRun()}
                disabled={running || !text.trim()}
                bg={running || !text.trim() ? "bg.subtle" : "accent"}
                color={running || !text.trim() ? "fg.dim" : "#052520"}
                borderRadius="md"
                px="20px"
                h="96px"
                minW="142px"
                fontSize="14px"
                fontWeight="600"
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                gap={1}
                boxShadow={running || !text.trim() ? "none" : "0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 24px -12px rgba(45,212,191,0.6)"}
                transition="filter 120ms ease, transform 120ms ease"
                _hover={{ filter: running || !text.trim() ? undefined : "brightness(1.06)", bg: running || !text.trim() ? "bg.subtle" : "accent" }}
                _active={{ transform: running || !text.trim() ? undefined : "translateY(1px)" }}
              >
                {running ? (
                  <>
                    <HStack gap={2} fontSize="15px">
                      <Icon name="progress_activity" size={18} spin />
                      <Text>Triando</Text>
                    </HStack>
                    <Text fontSize="10px" opacity={0.65} letterSpacing="0.14em" textTransform="uppercase" fontWeight="600">
                      en curso
                    </Text>
                  </>
                ) : (
                  <>
                    <HStack gap={2} fontSize="15px">
                      <Text>Triar</Text>
                      <Icon name="arrow_downward" size={18} />
                    </HStack>
                    <Text fontSize="10px" opacity={0.65} letterSpacing="0.14em" textTransform="uppercase" fontWeight="600">
                      ⌘ Enter
                    </Text>
                  </>
                )}
              </Button>
              {running && (
                <Button variant="ghost" size="xs" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
            </Stack>
          </Grid>
        </Box>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------------
// Decision footer — appears when run completes
// ----------------------------------------------------------------------------

function DecisionFooter({
  decision,
  onCopy,
  onReset,
}: {
  decision: TriageDecision;
  onCopy: () => void;
  onReset: () => void;
}) {
  const route = decision.chosenRoute;
  const recommended = decision.scenarios.find((s) => s.recommended);
  const offerText = recommended
    ? route === "Nurture"
      ? "Lista de espera"
      : formatMXN(recommended.netToSellerMXN)
    : "—";
  const confidence = confidenceForRoute(route, decision);
  return (
    <Box
      bg="bg.surface"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border"
      boxShadow="card"
      px="22px"
      py="22px"
    >
      <Box
        bgGradient="linear(to-b, rgba(94,234,212,0.06), rgba(94,234,212,0.02))"
        borderWidth="1px"
        borderColor="accent.line"
        borderRadius="md"
        px="16px"
        py="14px"
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        gap="16px"
        animation="prisma-decision-in 0.5s cubic-bezier(0.17, 0.84, 0.44, 1) both"
        css={{
          "@keyframes prisma-decision-in": {
            from: { opacity: 0, transform: "translateY(8px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        {/* Left */}
        <HStack gap="12px" align="center">
          <Box
            w="34px"
            h="34px"
            borderRadius="10px"
            bg="accent"
            color="#052520"
            display="grid"
            placeItems="center"
          >
            <Icon name="auto_awesome" size={18} filled />
          </Box>
          <Stack gap="2px">
            <Text
              fontSize="12px"
              letterSpacing="0.14em"
              textTransform="uppercase"
              color="accent"
              fontWeight="700"
            >
              Decisión · ruta {route}
            </Text>
            <HStack gap="12px" align="baseline">
              <Text fontSize="22px" fontWeight="700" color="fg" letterSpacing="-0.01em">
                {offerText}
              </Text>
              <Text fontSize="14px" color="fg.dim">
                · confianza {confidence}%
              </Text>
            </HStack>
          </Stack>
        </HStack>
        {/* Right buttons */}
        <HStack gap={2}>
          <FooterButton onClick={onCopy} icon="content_copy">
            Copiar JSON
          </FooterButton>
          <FooterButton onClick={onReset} icon="refresh">
            Reiniciar
          </FooterButton>
          <FooterButton primary icon="rocket_launch" iconFilled>
            Enviar respuesta
          </FooterButton>
        </HStack>
      </Box>
    </Box>
  );
}

function FooterButton({
  children,
  icon,
  iconFilled,
  primary,
  onClick,
}: {
  children: React.ReactNode;
  icon: string;
  iconFilled?: boolean;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <Box
      as="button"
      onClick={onClick}
      px="12px"
      py="7px"
      borderRadius="8px"
      borderWidth="1px"
      borderColor={primary ? "transparent" : "border.strong"}
      bg={primary ? "accent" : "bg.elevated"}
      color={primary ? "#052520" : "fg"}
      fontSize="12px"
      fontWeight="500"
      cursor="pointer"
      transition="filter 120ms ease, background 120ms ease"
      _hover={{ filter: primary ? "brightness(1.06)" : undefined, bg: primary ? undefined : "bg.subtle" }}
      display="inline-flex"
      alignItems="center"
      gap="6px"
    >
      <Icon name={icon} size={13} filled={iconFilled} />
      {children}
    </Box>
  );
}

function confidenceForRoute(route: TriageRoute, decision: TriageDecision): number {
  // Simple heuristic: scale by recommended scenario presence.
  if (route === "iBuyer") return 92;
  if (route === "Pulppo") return decision.brokers.length > 0 ? 88 : 72;
  return 64;
}

// ----------------------------------------------------------------------------
// Fee scenarios
// ----------------------------------------------------------------------------

function FeeScenarioStack({ scenarios }: { scenarios: FeeScenario[] }) {
  return (
    <Box bg="bg.surface" borderRadius="lg" borderWidth="1px" borderColor="border" boxShadow="card" overflow="hidden">
      <HStack px="22px" py="16px" borderBottomWidth="1px" borderColor="border.soft" justify="space-between" align="center">
        <HStack gap={2}>
          <Icon name="analytics" size={16} style={{ color: "var(--chakra-colors-brand-300)" }} />
          <Heading as="h3" size="sm" color="fg">
            Escenarios para el vendedor
          </Heading>
        </HStack>
        <Text fontSize="11px" color="fg.dim" fontFamily="mono" letterSpacing="0.02em">
          transparencia de comisiones
        </Text>
      </HStack>
      <Box p="18px">
        <Grid templateColumns={{ base: "1fr", md: `repeat(${scenarios.length}, 1fr)` }} gap="12px">
          {scenarios.map((s, i) => (
            <ScenarioCard key={s.route} scenario={s} delayMs={i * 80} />
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

function ScenarioCard({ scenario, delayMs }: { scenario: FeeScenario; delayMs: number }) {
  const palette = routeChakraPalette(scenario.route);
  return (
    <Box
      position="relative"
      borderWidth={scenario.recommended ? "1px" : "1px"}
      borderColor={scenario.recommended ? "accent.line" : "border"}
      bg={scenario.recommended ? "bg.subtle" : "bg.elevated"}
      borderRadius="md"
      p="14px"
      boxShadow={scenario.recommended ? "0 0 0 1px rgba(94,234,212,0.25) inset" : "none"}
      overflow="hidden"
      animation="prisma-scn-in 0.4s ease-out both"
      style={{ animationDelay: `${delayMs}ms` }}
      css={{
        "@keyframes prisma-scn-in": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Stack gap="12px">
        <HStack justify="space-between" align="center">
          <Badge colorPalette={palette} variant={scenario.recommended ? "solid" : "subtle"} fontSize="12.5px" fontWeight="700" px="10px" py="5px">
            {scenario.recommended && <Icon name="star" size={12} filled style={{ marginRight: "6px" }} />}
            {routeLabel(scenario.route)}
          </Badge>
        </HStack>
        <Stack gap="2px">
          <Text fontSize="11.5px" color="fg.dim" fontFamily="mono" letterSpacing="0.08em" textTransform="uppercase" fontWeight="600">
            neto al vendedor
          </Text>
          <Text fontWeight="800" fontSize="28px" color="fg" letterSpacing="-0.015em" lineHeight="1.05">
            {formatMXN(scenario.netToSellerMXN)}
          </Text>
        </Stack>
        <HStack gap="20px" fontSize="13px" fontFamily="mono">
          <Stack gap="1px">
            <Text color="fg.dim" fontSize="11px">tiempo</Text>
            <Text color="fg" fontWeight="600">
              {scenario.estimatedTimeDays !== null ? `${scenario.estimatedTimeDays}d` : "—"}
            </Text>
          </Stack>
          <Stack gap="1px">
            <Text color="fg.dim" fontSize="11px">fee</Text>
            <Text color="fg" fontWeight="600">{(scenario.feePct * 100).toFixed(1)}%</Text>
          </Stack>
          <Stack gap="1px">
            <Text color="fg.dim" fontSize="11px">bruto</Text>
            <Text color="fg" fontWeight="600">{formatMXN(scenario.estimatedGrossMXN)}</Text>
          </Stack>
        </HStack>
        <Text fontSize="13.5px" color="fg.muted" lineHeight="1.55">
          {scenario.tradeoff}
        </Text>
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------------
// Brokers list
// ----------------------------------------------------------------------------

function BrokerList({ brokers }: { brokers: PulppoBroker[] }) {
  return (
    <Box bg="bg.surface" borderRadius="lg" borderWidth="1px" borderColor="border" boxShadow="card" overflow="hidden" h="100%">
      <HStack px="22px" py="16px" borderBottomWidth="1px" borderColor="border.soft" gap={2}>
        <Icon name="handshake" size={16} style={{ color: "var(--chakra-colors-pulppo-400)" }} />
        <Heading as="h3" size="sm" color="fg">
          Asesores Pulppo recomendados ({brokers.length})
        </Heading>
      </HStack>
      <Box p="18px">
        <Stack gap={2}>
          {brokers.map((b, i) => (
            <HStack
              key={b.id}
              borderWidth="1px"
              borderColor="border"
              borderRadius="md"
              p="12px"
              justify="space-between"
              bg="bg.elevated"
              animation="prisma-broker-in 0.35s ease-out both"
              style={{ animationDelay: `${i * 70}ms` }}
              css={{
                "@keyframes prisma-broker-in": {
                  from: { opacity: 0, transform: "translateX(-6px)" },
                  to: { opacity: 1, transform: "translateX(0)" },
                },
              }}
            >
              <HStack gap={3}>
                <Box
                  w="36px"
                  h="36px"
                  borderRadius="full"
                  bg={tierBg(b.specialtyTier)}
                  color={tierFg(b.specialtyTier)}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontWeight="700"
                  fontSize="sm"
                  borderWidth="1px"
                  borderColor="border.strong"
                >
                  {b.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </Box>
                <Stack gap={0}>
                  <Text fontWeight="600" fontSize="13.5px" color="fg">
                    {b.name}
                  </Text>
                  <Text fontSize="11.5px" color="fg.muted">
                    {b.state} · {b.recentClosings} cierres recientes
                  </Text>
                </Stack>
              </HStack>
              <Badge variant="subtle" colorPalette={tierToPalette(b.specialtyTier)} fontSize="11px">
                {b.specialtyTier}
              </Badge>
            </HStack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

function RouteSummaryCard({ route }: { route: TriageRoute }) {
  const config =
    route === "iBuyer"
      ? {
          icon: "bolt",
          title: "iBuyer directo — sin asesor intermediario",
          body: "Tuhabi compra directamente. Cero comisión, ~10 días para cerrar.",
          accent: "var(--chakra-colors-brand-300)",
        }
      : {
          icon: "schedule",
          title: "Sin asesor disponible en esta zona",
          body: "Mantén al vendedor en lista. Le avisamos cuando expandamos cobertura.",
          accent: "var(--chakra-colors-nurture-400)",
        };
  return (
    <Box bg="bg.surface" borderRadius="lg" borderWidth="1px" borderColor="border" boxShadow="card" h="100%" p="22px">
      <Stack gap={3} h="100%" justify="center" align="center" textAlign="center">
        <Box
          w="56px"
          h="56px"
          borderRadius="14px"
          bg="bg.elevated"
          borderWidth="1px"
          borderColor="border.strong"
          display="grid"
          placeItems="center"
          color={config.accent}
        >
          <Icon name={config.icon} size={28} filled />
        </Box>
        <Text fontWeight="600" color="fg" fontSize="14px">
          {config.title}
        </Text>
        <Text fontSize="12.5px" color="fg.muted" maxW="sm" lineHeight="1.5">
          {config.body}
        </Text>
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function routeChakraPalette(route: TriageRoute): "brand" | "purple" | "gray" {
  if (route === "iBuyer") return "brand";
  if (route === "Pulppo") return "purple";
  return "gray";
}

function decisionRouteColor(route: TriageRoute): string {
  if (route === "iBuyer") return "#5EEAD4";
  if (route === "Pulppo") return "#A78BFA";
  return "#94A3B8";
}

function routeLabel(route: TriageRoute): string {
  if (route === "iBuyer") return "iBuyer directo (Tuhabi)";
  if (route === "Pulppo") return "Asesor Pulppo";
  return "Nurture / lista de espera";
}

function tierToPalette(tier: PulppoBroker["specialtyTier"]): "brand" | "purple" | "gray" {
  if (tier === "luxury") return "purple";
  if (tier === "mid") return "brand";
  return "gray";
}

function tierBg(tier: PulppoBroker["specialtyTier"]): string {
  if (tier === "luxury") return "rgba(167,139,250,0.18)";
  if (tier === "mid") return "rgba(94,234,212,0.16)";
  return "rgba(148,163,184,0.18)";
}

function tierFg(tier: PulppoBroker["specialtyTier"]): string {
  if (tier === "luxury") return "var(--chakra-colors-pulppo-400)";
  if (tier === "mid") return "var(--chakra-colors-brand-300)";
  return "var(--chakra-colors-nurture-400)";
}
