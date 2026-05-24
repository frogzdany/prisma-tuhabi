"use client";

import { useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L, { type LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";

// Prisma property map — real OSM tiles, custom branded markers.
// Dynamically imported via Next dynamic() to avoid SSR (Leaflet needs window).

interface FixturePin {
  id: string;
  label: string;
  state: string;
  lat: number;
  lng: number;
  /** 1 (safe) – 5 (avoid). Halo rendered when ≥4. */
  riskTier: number;
}

export interface PropertyMapProps {
  fixtures: FixturePin[];
  activeFixtureId: string;
  /** Hex color (with #) for the active pin and halo accent. */
  decisionColor?: string;
  /** Height of the rendered map. */
  height?: string | number;
}

const DEFAULT_ZOOM = 13;
const COUNTRY_ZOOM = 5;
const TUHABI_PURPLE = "#7C3AED";
const ECATEPEC_RISK_COLOR = "#EF4444";

function buildMarkerIcon(label: string, color: string, active: boolean): L.DivIcon {
  const size = active ? 42 : 28;
  const ring = active ? `0 0 0 4px ${color}33, 0 2px 10px rgba(0,0,0,0.25)` : "0 1px 4px rgba(0,0,0,0.25)";
  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: ${active ? 16 : 12}px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: ${ring};
      border: 2px solid white;
      transition: all 0.3s ease-out;
    ">${label}</div>
  `;
  return L.divIcon({
    className: "prisma-marker",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FlyToFixture({ coords, zoom }: { coords: LatLngTuple; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(coords, zoom, { duration: 1.4, easeLinearity: 0.25 });
  }, [coords, zoom, map]);
  return null;
}

export default function PropertyMap({
  fixtures,
  activeFixtureId,
  decisionColor = TUHABI_PURPLE,
  height = "320px",
}: PropertyMapProps) {
  const active = fixtures.find((f) => f.id === activeFixtureId) ?? fixtures[0];
  if (!active) return null;
  const center: LatLngTuple = [active.lat, active.lng];

  return (
    <Box
      h={height}
      w="100%"
      borderRadius="md"
      overflow="hidden"
      borderWidth="1px"
      borderColor="border.subtle"
      position="relative"
    >
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render every fixture as a marker; active one is larger + colored. */}
        {fixtures.map((f) => {
          const isActive = f.id === activeFixtureId;
          const color = isActive ? decisionColor : "#94A3B8";
          const initials = f.label
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <Marker
              key={f.id}
              position={[f.lat, f.lng]}
              icon={buildMarkerIcon(initials, color, isActive)}
            />
          );
        })}

        {/* Risk halo for tier ≥4 (only relevant for the active fixture). */}
        {active.riskTier >= 4 && (
          <>
            <Circle
              center={[active.lat, active.lng]}
              radius={1500}
              pathOptions={{
                color: ECATEPEC_RISK_COLOR,
                fillColor: ECATEPEC_RISK_COLOR,
                fillOpacity: 0.18,
                weight: 2,
                dashArray: "6, 6",
              }}
            />
            <Circle
              center={[active.lat, active.lng]}
              radius={900}
              pathOptions={{
                color: ECATEPEC_RISK_COLOR,
                fillOpacity: 0,
                weight: 1.5,
                opacity: 0.55,
              }}
            />
          </>
        )}

        <FlyToFixture
          coords={center}
          zoom={active.riskTier >= 4 ? DEFAULT_ZOOM - 1 : DEFAULT_ZOOM}
        />
      </MapContainer>

      {/* Subtle gradient overlay at the bottom so the OSM attribution + brand reads against the tiles */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        h="40px"
        pointerEvents="none"
        bgGradient="linear(to-t, blackAlpha.300, transparent)"
      />
    </Box>
  );
}
