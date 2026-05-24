#!/usr/bin/env python3
"""
Render the integration timeline chart for the Prisma deck.
Three-phase horizontal flow with stage badges.
Run: python3 render_timeline.py
Output: ../assets/06-timeline.png
"""

import os
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyBboxPatch
from matplotlib.lines import Line2D

# Prisma palette
NAVY_BG = "#0A0E1A"
PANEL = "#111726"
BORDER = "#1F2A3F"
FG = "#E6EAF2"
MUTED = "#9AA4BB"
DIM = "#6B7691"
TEAL = "#5EEAD4"
VIOLET = "#A78BFA"
SLATE = "#94A3B8"
SUCCESS = "#34D399"

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)


def render_timeline():
    fig, ax = plt.subplots(figsize=(13, 6.0))
    fig.patch.set_facecolor(NAVY_BG)
    ax.set_facecolor(NAVY_BG)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6)
    ax.axis("off")

    stages = [
        {
            "x": 2.0,
            "title": "Hoy",
            "subtitle": "YA FUNCIONA",
            "color": TEAL,
            "badge": "1",
            "items": [
                "Modelos en vivo (Anthropic, ElevenLabs)",
                "Persistencia real en Supabase",
                "Activos del listado con IA",
                "Webhook abierto (Make.com, CRMs)",
            ],
        },
        {
            "x": 6.0,
            "title": "Primer mes",
            "subtitle": "DATOS REALES",
            "color": VIOLET,
            "badge": "2",
            "items": [
                "Riesgo real por colonia",
                "Motor de valoración TuHabi",
                "CRM real de Pulppo",
            ],
        },
        {
            "x": 10.0,
            "title": "Trimestre",
            "subtitle": "ESCALA COMPLETA",
            "color": SUCCESS,
            "badge": "3",
            "items": [
                "WhatsApp Business API",
                "Tablero histórico de runs",
                "Reglas de ruteo por equipo",
            ],
        },
    ]

    # Backing line between nodes
    line = Line2D([2.0, 10.0], [4.3, 4.3],
                  color=BORDER, linewidth=4, zorder=1, solid_capstyle="round")
    ax.add_line(line)

    for stage in stages:
        x = stage["x"]
        color = stage["color"]

        # Soft halo
        halo = Circle((x, 4.3), 0.78, color=color, alpha=0.12, zorder=2)
        ax.add_patch(halo)
        # Outer ring
        ring = Circle((x, 4.3), 0.58, facecolor=NAVY_BG,
                      edgecolor=color, linewidth=4, zorder=3)
        ax.add_patch(ring)
        # Big number badge
        ax.text(x, 4.30, stage["badge"], color=color, fontsize=44,
                ha="center", va="center", fontweight="800", zorder=4)

        # Stage title (above)
        ax.text(x, 5.60, stage["title"], color=FG, fontsize=22,
                ha="center", va="bottom", fontweight="700")
        # Subtitle small caps
        ax.text(x, 5.25, stage["subtitle"], color=color, fontsize=11,
                ha="center", va="bottom", fontweight="700")

        # Items below the node, left-aligned card style
        card_w = 3.5
        card_h = 0.45 * len(stage["items"]) + 0.6
        card_x = x - card_w / 2
        card_y = 3.0 - card_h
        card = FancyBboxPatch(
            (card_x, card_y), card_w, card_h,
            boxstyle="round,pad=0.05,rounding_size=0.18",
            facecolor=PANEL, edgecolor=BORDER, linewidth=1.5, zorder=2,
        )
        ax.add_patch(card)

        for i, item in enumerate(stage["items"]):
            yi = 2.70 - i * 0.45
            # Bullet dot
            ax.add_patch(Circle((card_x + 0.22, yi + 0.06),
                                0.06, color=color, zorder=4))
            ax.text(card_x + 0.42, yi + 0.06, item, color=FG, fontsize=12,
                    ha="left", va="center", zorder=4)

    plt.tight_layout()
    out_path = os.path.join(OUT, "06-timeline.png")
    fig.savefig(out_path, dpi=180, facecolor=NAVY_BG,
                bbox_inches="tight", pad_inches=0.25)
    plt.close(fig)
    print(f"  wrote {os.path.relpath(out_path)}")


if __name__ == "__main__":
    plt.rcParams["font.family"] = ["Inter", "Helvetica", "Arial", "sans-serif"]
    render_timeline()
