"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Theme = "emerald" | "indigo" | "cyan" | "teal" | "amber";

type Shape =
  | "dispersion"
  // generic fallbacks used by the internal timer/cycle
  | "circle"
  | "triangle"
  | "house"
  | "building"
  // per-tool shapes
  | "speech_bubble"
  | "pin"
  | "coin"
  | "check"
  | "group"
  | "scales"
  | "document"
  | "waveform"
  | "disk";

interface PrismaCoreProps {
  isActive?: boolean;
  theme?: Theme;
  height?: number | string;
  statusLabel?: string;
  /**
   * When provided, the visualizer advances its shape every time this value
   * increments (e.g. count of agent trace events). Falls back to a 3s internal
   * timer when omitted so it still animates without an event stream.
   */
  step?: number;
  /**
   * Explicit shape override — when set (and isActive=true) the visualizer
   * locks to this shape instead of cycling via `step` or the internal timer.
   * Used to bind each tool's animation to its own custom outline.
   */
  shape?: Exclude<Shape, "dispersion">;
}

interface ParticleParams {
  baseX: number;
  baseY: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  phase: number;
  size: number;
  opacityPhase: number;
  opacitySpeed: number;
}

interface Particle {
  x: number;
  y: number;
  opacity: number;
}

const THEMES: Record<Theme, { primary: string; secondary: string; glow: string; glowDeep: string }> = {
  emerald: {
    primary: "#10b981",
    secondary: "#34d399",
    glow: "rgba(16, 185, 129, 0.4)",
    glowDeep: "rgba(16, 185, 129, 0.15)",
  },
  indigo: {
    primary: "#6366f1",
    secondary: "#818cf8",
    glow: "rgba(99, 102, 241, 0.4)",
    glowDeep: "rgba(99, 102, 241, 0.15)",
  },
  cyan: {
    primary: "#06b6d4",
    secondary: "#22d3ee",
    glow: "rgba(6, 182, 212, 0.4)",
    glowDeep: "rgba(6, 182, 212, 0.15)",
  },
  teal: {
    primary: "#14b8a6",
    secondary: "#2dd4bf",
    glow: "rgba(20, 184, 166, 0.4)",
    glowDeep: "rgba(20, 184, 166, 0.15)",
  },
  amber: {
    primary: "#f59e0b",
    secondary: "#fbbf24",
    glow: "rgba(245, 158, 11, 0.4)",
    glowDeep: "rgba(245, 158, 11, 0.15)",
  },
};

const PARTICLE_COUNT = 64;

function getPathPoint(shape: Exclude<Shape, "dispersion">, p: number): { x: number; y: number } {
  const cx = 400;
  const cy = 300;
  const progress = p >= 1.0 ? 0.0 : p;

  if (shape === "circle") {
    const angle = progress * 2 * Math.PI;
    return { x: cx + Math.cos(angle) * 125, y: cy + Math.sin(angle) * 125 };
  }
  if (shape === "triangle") {
    const A = { x: cx, y: cy - 120 };
    const B = { x: cx - 145, y: cy + 110 };
    const C = { x: cx + 145, y: cy + 110 };
    const segment = Math.floor(progress * 3);
    const t = (progress * 3) % 1;
    if (segment === 0) return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
    if (segment === 1) return { x: B.x + (C.x - B.x) * t, y: B.y + (C.y - B.y) * t };
    return { x: C.x + (A.x - C.x) * t, y: C.y + (A.y - C.y) * t };
  }
  if (shape === "house") {
    const A = { x: cx - 125, y: cy + 125 };
    const B = { x: cx - 125, y: cy - 10 };
    const C = { x: cx, y: cy - 120 };
    const D = { x: cx + 125, y: cy - 10 };
    const E = { x: cx + 125, y: cy + 125 };
    const segment = Math.floor(progress * 5);
    const t = (progress * 5) % 1;
    if (segment === 0) return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
    if (segment === 1) return { x: B.x + (C.x - B.x) * t, y: B.y + (C.y - B.y) * t };
    if (segment === 2) return { x: C.x + (D.x - C.x) * t, y: C.y + (D.y - C.y) * t };
    if (segment === 3) return { x: D.x + (E.x - D.x) * t, y: D.y + (E.y - D.y) * t };
    return { x: E.x + (A.x - E.x) * t, y: E.y + (A.y - E.y) * t };
  }
  if (shape === "building") {
    // stepped skyscraper outline
    const A = { x: cx - 75, y: cy + 120 };
    const B = { x: cx - 75, y: cy - 40 };
    const C = { x: cx - 35, y: cy - 40 };
    const D = { x: cx - 35, y: cy - 160 };
    const E = { x: cx + 35, y: cy - 160 };
    const F = { x: cx + 35, y: cy - 40 };
    const G = { x: cx + 75, y: cy - 40 };
    const H = { x: cx + 75, y: cy + 120 };
    const segment = Math.floor(progress * 8);
    const t = (progress * 8) % 1;
    if (segment === 0) return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
    if (segment === 1) return { x: B.x + (C.x - B.x) * t, y: B.y + (C.y - B.y) * t };
    if (segment === 2) return { x: C.x + (D.x - C.x) * t, y: C.y + (D.y - C.y) * t };
    if (segment === 3) return { x: D.x + (E.x - D.x) * t, y: D.y + (E.y - D.y) * t };
    if (segment === 4) return { x: E.x + (F.x - E.x) * t, y: E.y + (F.y - E.y) * t };
    if (segment === 5) return { x: F.x + (G.x - F.x) * t, y: F.y + (G.y - F.y) * t };
    if (segment === 6) return { x: G.x + (H.x - G.x) * t, y: G.y + (H.y - G.y) * t };
    return { x: H.x + (A.x - H.x) * t, y: H.y + (A.y - H.y) * t };
  }
  // per-tool shape — delegate
  return getPerToolPathPoint(shape, progress);
}

function pointOnPolygon(verts: Array<{ x: number; y: number }>, p: number) {
  const n = verts.length;
  const t = p * n;
  const i = Math.floor(t) % n;
  const frac = t - Math.floor(t);
  const a = verts[i];
  const b = verts[(i + 1) % n];
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}

function getPerToolPathPoint(shape: Shape, progress: number): { x: number; y: number } {
  const cx = 400;
  const cy = 300;

  if (shape === "speech_bubble") {
    // Rounded rectangle with a small tail at bottom-left — Prisma "reading" your message.
    const w = 260;
    const h = 160;
    const r = 50;
    const verts: Array<{ x: number; y: number }> = [];
    const addCorner = (x0: number, y0: number, startA: number) => {
      const segs = 5;
      for (let i = 0; i < segs; i++) {
        const a = startA + (i / segs) * (Math.PI / 2);
        verts.push({ x: x0 + Math.cos(a) * r, y: y0 + Math.sin(a) * r });
      }
    };
    addCorner(cx + w / 2 - r, cy - h / 2 + r, -Math.PI / 2);
    addCorner(cx + w / 2 - r, cy + h / 2 - r, 0);
    // bottom edge with tail dip
    verts.push({ x: cx - 20, y: cy + h / 2 });
    verts.push({ x: cx - 55, y: cy + h / 2 + 50 });
    verts.push({ x: cx - 80, y: cy + h / 2 });
    addCorner(cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2);
    addCorner(cx - w / 2 + r, cy - h / 2 + r, Math.PI);
    return pointOnPolygon(verts, progress);
  }

  if (shape === "pin") {
    // Teardrop pin — round top, pointed bottom, for location.
    const r = 90;
    const verts: Array<{ x: number; y: number }> = [];
    const start = -Math.PI * 0.75;
    const end = Math.PI * 0.75;
    const arcSegs = 16;
    for (let i = 0; i <= arcSegs; i++) {
      const a = start + (i / arcSegs) * (end - start);
      verts.push({ x: cx + Math.cos(a) * r, y: cy - 30 + Math.sin(a) * r });
    }
    verts.push({ x: cx, y: cy + 130 });
    return pointOnPolygon(verts, progress);
  }

  if (shape === "coin") {
    // Tight circle to evoke a coin / valuation.
    const angle = progress * 2 * Math.PI;
    return { x: cx + Math.cos(angle) * 110, y: cy + Math.sin(angle) * 110 };
  }

  if (shape === "check") {
    // Bold checkmark stroke — verifies criteria.
    const A = { x: cx - 130, y: cy - 10 };
    const B = { x: cx - 25, y: cy + 95 };
    const C = { x: cx + 150, y: cy - 95 };
    if (progress < 0.4) {
      const t = progress / 0.4;
      return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
    }
    const t = (progress - 0.4) / 0.6;
    return { x: B.x + (C.x - B.x) * t, y: B.y + (C.y - B.y) * t };
  }

  if (shape === "group") {
    // Three avatar-like circles for "find experts".
    const r = 55;
    const centers = [
      { x: cx - 120, y: cy + 25 },
      { x: cx, y: cy - 55 },
      { x: cx + 120, y: cy + 25 },
    ];
    const seg = Math.floor(progress * 3) % 3;
    const t = (progress * 3) % 1;
    const c = centers[seg];
    const a = t * 2 * Math.PI;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
  }

  if (shape === "scales") {
    // Balance with two cups — comparing options.
    const verts: Array<{ x: number; y: number }> = [
      { x: cx, y: cy + 100 },
      { x: cx, y: cy - 70 },
      { x: cx - 120, y: cy - 70 },
      { x: cx - 145, y: cy - 30 },
      { x: cx - 90, y: cy + 5 },
      { x: cx - 70, y: cy - 30 },
      { x: cx - 120, y: cy - 70 },
      { x: cx + 120, y: cy - 70 },
      { x: cx + 145, y: cy - 30 },
      { x: cx + 90, y: cy + 5 },
      { x: cx + 70, y: cy - 30 },
      { x: cx + 120, y: cy - 70 },
      { x: cx, y: cy - 70 },
    ];
    return pointOnPolygon(verts, progress);
  }

  if (shape === "document") {
    // Document outline with a folded top-right corner.
    const w = 180;
    const h = 220;
    const fold = 40;
    const verts: Array<{ x: number; y: number }> = [
      { x: cx - w / 2, y: cy - h / 2 },
      { x: cx + w / 2 - fold, y: cy - h / 2 },
      { x: cx + w / 2, y: cy - h / 2 + fold },
      { x: cx + w / 2, y: cy + h / 2 },
      { x: cx - w / 2, y: cy + h / 2 },
    ];
    return pointOnPolygon(verts, progress);
  }

  if (shape === "waveform") {
    // Horizontal sine — voice note.
    const width = 360;
    const amp = 80;
    const x = cx - width / 2 + progress * width;
    const y = cy + Math.sin(progress * Math.PI * 4) * amp;
    return { x, y };
  }

  if (shape === "disk") {
    // Rounded square — saved/bookmarked.
    const s = 200;
    const r = 28;
    const verts: Array<{ x: number; y: number }> = [];
    const addCorner = (x0: number, y0: number, startA: number) => {
      const segs = 5;
      for (let i = 0; i < segs; i++) {
        const a = startA + (i / segs) * (Math.PI / 2);
        verts.push({ x: x0 + Math.cos(a) * r, y: y0 + Math.sin(a) * r });
      }
    };
    addCorner(cx + s / 2 - r, cy - s / 2 + r, -Math.PI / 2);
    addCorner(cx + s / 2 - r, cy + s / 2 - r, 0);
    addCorner(cx - s / 2 + r, cy + s / 2 - r, Math.PI / 2);
    addCorner(cx - s / 2 + r, cy - s / 2 + r, Math.PI);
    return pointOnPolygon(verts, progress);
  }

  return { x: cx, y: cy };
}

const SHAPE_ORDER: Exclude<Shape, "dispersion">[] = ["circle", "triangle", "house", "building"];

export function PrismaCore({
  isActive = false,
  theme = "emerald",
  height = 420,
  statusLabel,
  step,
  shape,
}: PrismaCoreProps) {
  const [waveOffset, setWaveOffset] = useState(0);
  const [activeShape, setActiveShape] = useState<Shape>("dispersion");
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleParamsRef = useRef<ParticleParams[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const transitionRef = useRef(0);
  const flowProgressRef = useRef(0);
  const shapeCycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Transient boost on every new event — decays each frame.
  const pulseRef = useRef(0);

  const colors = THEMES[theme];
  const eventDriven = typeof step === "number";

  // Initialise particle params once.
  useEffect(() => {
    const params: ParticleParams[] = [];
    const initial: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const baseX = 40 + Math.random() * 720;
      const baseY = 40 + Math.random() * 520;
      params.push({
        baseX,
        baseY,
        radiusX: 20 + Math.random() * 75,
        radiusY: 20 + Math.random() * 65,
        speed: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        size: 2.0 + Math.random() * 4.0,
        opacityPhase: Math.random() * Math.PI * 2,
        opacitySpeed: 2 + Math.random() * 4,
      });
      initial.push({ x: baseX, y: baseY, opacity: 0.6 + Math.random() * 0.4 });
    }
    particleParamsRef.current = params;
    setParticles(initial);
  }, []);

  // Reset to dispersion when going idle.
  useEffect(() => {
    if (!isActive) {
      setActiveShape("dispersion");
      if (shapeCycleTimerRef.current) {
        clearInterval(shapeCycleTimerRef.current);
        shapeCycleTimerRef.current = null;
      }
    }
  }, [isActive]);

  // Explicit shape override has top priority — locks the visualizer to that
  // outline whenever it's provided, flashes a pulse on each shape change.
  useEffect(() => {
    if (!isActive || !shape) return;
    setActiveShape(shape);
    pulseRef.current = 1;
  }, [shape, isActive]);

  // Internal fallback timer: cycle shapes every 3s when no event stream and
  // no explicit shape is wired.
  useEffect(() => {
    if (!isActive || eventDriven || shape) return;
    setActiveShape("circle");
    shapeCycleTimerRef.current = setInterval(() => {
      setActiveShape((prev) => {
        const idx = SHAPE_ORDER.indexOf(prev as Exclude<Shape, "dispersion">);
        return SHAPE_ORDER[(idx + 1) % SHAPE_ORDER.length];
      });
    }, 3000);
    return () => {
      if (shapeCycleTimerRef.current) clearInterval(shapeCycleTimerRef.current);
    };
  }, [isActive, eventDriven, shape]);

  // Event-driven cycle through the generic shape list — fallback for when
  // events are streaming but no explicit per-tool shape is provided.
  useEffect(() => {
    if (!eventDriven || !isActive || shape) return;
    const s = step ?? 0;
    if (s <= 0) {
      setActiveShape("circle");
      return;
    }
    setActiveShape(SHAPE_ORDER[(s - 1) % SHAPE_ORDER.length]);
    pulseRef.current = 1;
  }, [step, eventDriven, isActive, shape]);

  // Main animation loop.
  useEffect(() => {
    let lastTime = Date.now();
    let tick = 0;

    const loop = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      tick += dt;
      setWaveOffset((prev) => (prev + dt * 100) % 360);

      const targetTransition = isActive ? 1.0 : 0.0;
      transitionRef.current += (targetTransition - transitionRef.current) * 0.08;
      // Pulse decays back to 0; while >0 the particles travel the shape faster.
      pulseRef.current = Math.max(0, pulseRef.current - dt * 1.2);
      const flowSpeed = 0.08 + pulseRef.current * 0.35;
      flowProgressRef.current = (flowProgressRef.current + dt * flowSpeed) % 1.0;

      if (particleParamsRef.current.length > 0) {
        setParticles((prev) =>
          prev.map((pt, i) => {
            const params = particleParamsRef.current[i];
            if (!params) return pt;
            const dispersionX = params.baseX + Math.cos(tick * params.speed + params.phase) * params.radiusX;
            const dispersionY = params.baseY + Math.sin(tick * params.speed + params.phase) * params.radiusY;
            let shapeX = dispersionX;
            let shapeY = dispersionY;
            if (activeShape !== "dispersion") {
              const particleFraction = i / particleParamsRef.current.length;
              const pathProgress = (flowProgressRef.current + particleFraction) % 1.0;
              const shapePoint = getPathPoint(activeShape, pathProgress);
              shapeX = shapePoint.x;
              shapeY = shapePoint.y;
            }
            const targetX = dispersionX + (shapeX - dispersionX) * transitionRef.current;
            const targetY = dispersionY + (shapeY - dispersionY) * transitionRef.current;
            const easeFactor = 1 - Math.exp(-8 * dt);
            const nextX = pt.x + (targetX - pt.x) * easeFactor;
            const nextY = pt.y + (targetY - pt.y) * easeFactor;
            const opacityPhase = params.opacityPhase + tick * params.opacitySpeed;
            const baseOpacity = 0.5 + Math.sin(opacityPhase) * 0.4;
            return { x: nextX, y: nextY, opacity: baseOpacity };
          })
        );
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isActive, activeShape]);

  const renderWave = (
    amplitude: number,
    frequency: number,
    phase: number,
    color: string,
    opacity: number,
    strokeWidth = 1.5
  ) => {
    const points: string[] = [];
    const width = 800;
    const centerY = 50;
    const voiceScale = (isActive ? 1.0 : 0.2) + pulseRef.current * 0.6;
    for (let x = 0; x <= width; x += 4) {
      const angle = (x / width) * Math.PI * 2 * frequency + (waveOffset * Math.PI) / 180 + phase;
      const y = centerY + Math.sin(angle) * amplitude * voiceScale;
      points.push(`${x},${y}`);
    }
    return (
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
        points={points.join(" ")}
      />
    );
  };

  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 16,
    background: "radial-gradient(circle at 60% 40%, #131b2e 0%, #080b11 75%)",
  };

  const auraStyle: CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "85%",
    height: "85%",
    borderRadius: "50%",
    pointerEvents: "none",
    filter: "blur(50px)",
    opacity: 0.85,
    background: `radial-gradient(circle, ${colors.glowDeep} 0%, transparent 70%)`,
    transform: `translate(-50%, -50%) scale(${isActive ? 1.2 : 1})`,
    transition: "transform 2s ease, background 0.8s ease",
  };

  const svgStyle: CSSProperties = {
    position: "relative",
    zIndex: 2,
    width: "100%",
    height: "100%",
    maxWidth: 800,
    maxHeight: 600,
  };

  const badgeStyle: CSSProperties = {
    position: "absolute",
    bottom: 18,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 22px",
    background: "rgba(15, 22, 36, 0.55)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: `1px solid ${colors.primary}`,
    color: colors.secondary,
    borderRadius: 28,
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontSize: "0.92rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    display: "flex",
    alignItems: "center",
    gap: 10,
    boxShadow: `0 0 18px ${colors.glow}`,
    pointerEvents: "none",
  };

  const dotStyle: CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: colors.secondary,
    boxShadow: "0 0 10px currentColor",
    animation: isActive ? "prisma-core-pulse 1.4s infinite" : undefined,
  };

  const label =
    statusLabel ??
    (isActive ? "PRISMA: ANALIZANDO LEAD..." : "PRISMA: LISTO / DISPERSO");

  return (
    <div style={containerStyle} aria-hidden="true">
      <style>{`
        @keyframes prisma-core-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 1; }
        }
      `}</style>
      <div style={auraStyle} />
      <svg viewBox="0 0 800 600" style={svgStyle}>
        <defs>
          <filter id="prismaCoreNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g>
          {particles.map((p, i) => {
            const params = particleParamsRef.current[i];
            const size = params?.size ?? 2.5;
            return (
              <g key={i} style={{ filter: "url(#prismaCoreNeonGlow)" }}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={(size + (isActive ? 1.5 : 0)) * 1.6}
                  fill={colors.primary}
                  opacity={p.opacity * 0.3}
                />
                <circle cx={p.x} cy={p.y} r={size} fill={colors.secondary} opacity={p.opacity} />
              </g>
            );
          })}
        </g>

        <g transform="translate(0, 500)">
          {renderWave(22, 2.5, 0, colors.primary, 0.45, 2)}
          {renderWave(14, 4.0, Math.PI / 3, colors.secondary, 0.7, 1.5)}
          {renderWave(8, 6.0, (2 * Math.PI) / 3, "#ffffff", 0.35, 1)}
        </g>
      </svg>

      <div style={badgeStyle}>
        <span style={dotStyle} />
        {label}
      </div>
    </div>
  );
}
