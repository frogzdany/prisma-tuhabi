#!/usr/bin/env python3
"""
Render Prisma deck charts in the brand palette.
Run: python3 render_charts.py
Outputs PNG files into ../assets/
"""

import os
import matplotlib.pyplot as plt
import numpy as np

# Prisma brand palette
NAVY_BG = "#0A0E1A"
PANEL = "#111726"
BORDER = "#1F2A3F"
FG = "#E6EAF2"
MUTED = "#9AA4BB"
DIM = "#6B7691"
TEAL = "#5EEAD4"
TEAL_DARK = "#2DD4BF"
VIOLET = "#A78BFA"
AMBER = "#F59E0B"
SLATE = "#94A3B8"
SUCCESS = "#34D399"
DANGER = "#FB7185"

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)


def base_setup(fig, ax):
    fig.patch.set_facecolor(NAVY_BG)
    ax.set_facecolor(NAVY_BG)
    for spine in ax.spines.values():
        spine.set_color(BORDER)
        spine.set_linewidth(1)
    ax.tick_params(colors=MUTED, labelsize=11)
    ax.xaxis.label.set_color(FG)
    ax.yaxis.label.set_color(FG)
    ax.title.set_color(FG)
    ax.grid(axis="y", color=BORDER, linewidth=0.8, alpha=0.7)
    ax.set_axisbelow(True)


def save(fig, name, dpi=180):
    path = os.path.join(OUT, name)
    fig.savefig(path, dpi=dpi, facecolor=NAVY_BG, bbox_inches="tight", pad_inches=0.2)
    plt.close(fig)
    print(f"  wrote {os.path.relpath(path)}")


# 1. Routing outcome distribution (donut)
def chart_routing_distribution():
    """Distribución estimada sobre 10,000 leads inbound al mes."""
    labels = ["iBuyer TuHabi", "Asesor Pulppo", "Nurture (lista de espera)"]
    values = [38, 44, 18]
    colors = [TEAL, VIOLET, SLATE]

    fig, ax = plt.subplots(figsize=(11, 5.8), subplot_kw=dict(aspect="equal"))
    base_setup(fig, ax)

    ax.pie(
        values,
        colors=colors,
        startangle=90,
        wedgeprops=dict(width=0.42, edgecolor=NAVY_BG, linewidth=4),
    )
    ax.text(0, 0.12, "10,000", color=FG, ha="center", va="center",
            fontsize=44, fontweight="bold")
    ax.text(0, -0.14, "leads / mes", color=MUTED, ha="center", va="center",
            fontsize=14)

    total = sum(values)
    for i, (lbl, val, color) in enumerate(zip(labels, values, colors)):
        y = 0.55 - i * 0.42
        ax.scatter(1.55, y, s=360, color=color, zorder=5,
                   edgecolor=NAVY_BG, linewidth=2.5)
        ax.text(1.78, y + 0.06, lbl, color=FG, fontsize=15,
                fontweight="600", va="bottom")
        pct = round(val * 100 / total)
        ax.text(1.78, y - 0.10,
                f"{pct} por ciento  ({val * 100:,} leads / mes)",
                color=MUTED, fontsize=12, va="top")

    ax.set_xlim(-1.4, 3.2)
    ax.set_ylim(-1.3, 1.3)
    ax.axis("off")

    fig.text(0.5, 0.02,
             "Base: 10,000 leads inbound al mes. Mezcla estimada a partir de benchmarks Opendoor y cobertura pública TuHabi.",
             color=DIM, fontsize=10, ha="center")

    save(fig, "01-routing.png")


# 2. Volume scaling
def chart_volume_scaling():
    """Capacidad de triaje por día."""
    x_labels = [
        "Equipo manual\n(8 agentes)",
        "Equipo híbrido\n(4 agentes + Prisma)",
        "Prisma 24 / 7",
    ]
    capacity = [120, 720, 2880]
    colors = [SLATE, VIOLET, TEAL]

    fig, ax = plt.subplots(figsize=(11.5, 6.2))
    base_setup(fig, ax)

    x = np.arange(len(x_labels))
    bars = ax.bar(x, capacity, color=colors, edgecolor=NAVY_BG, linewidth=3, width=0.55)

    ax.set_xticks(x)
    ax.set_xticklabels(x_labels, color=FG, fontsize=12)
    ax.set_ylabel("leads triados por día", color=MUTED, fontsize=12, labelpad=10)
    ax.set_ylim(0, max(capacity) * 1.30)

    for bar, v in zip(bars, capacity):
        ax.text(bar.get_x() + bar.get_width() / 2, v + 220,
                f"{v:,}",
                color=FG, ha="center", va="bottom",
                fontsize=20, fontweight="700")

    ax.text(1, capacity[1] + 80, "6x más", color=VIOLET, fontsize=13,
            ha="center", va="bottom", fontweight="700")
    ax.text(2, capacity[2] + 80, "24x más", color=TEAL, fontsize=13,
            ha="center", va="bottom", fontweight="700")

    fig.subplots_adjust(bottom=0.28, top=0.92)
    fig.text(0.5, 0.05,
             "Base: 15 leads por agente humano por hora, jornada de 8 horas. Prisma sostiene un triaje cada 7 segundos las 24 horas.",
             color=DIM, fontsize=10, ha="center")

    save(fig, "04-volume.png")


# 3. Recovery (before vs after) — two stacked bars to make the recovery obvious
def chart_coverage_recovery():
    """Antes (ruteo manual): la mayoría se pierde.
       Después (Prisma): cada lead aterriza en una ruta."""
    categories = ["Antes\nruteo manual", "Después\ncon Prisma"]
    x = np.arange(len(categories))
    width = 0.45

    # Segments, in stack order from bottom to top:
    ibuyer = [3800, 3800]   # iBuyer cerrado (siempre se cerraba)
    pulppo = [0, 4400]      # recuperado a asesor Pulppo
    nurture = [0, 1800]     # recuperado a nurture viva
    lost = [6200, 0]        # tirados / silencio

    fig, ax = plt.subplots(figsize=(12, 6.4))
    base_setup(fig, ax)

    b1 = ax.bar(x, ibuyer, width, color=TEAL,
                edgecolor=NAVY_BG, linewidth=2, label="iBuyer cerrado")
    b2 = ax.bar(x, pulppo, width, bottom=np.array(ibuyer),
                color=VIOLET, edgecolor=NAVY_BG, linewidth=2,
                label="Handoff a asesor Pulppo")
    b3 = ax.bar(x, nurture, width,
                bottom=np.array(ibuyer) + np.array(pulppo),
                color=SUCCESS, edgecolor=NAVY_BG, linewidth=2,
                label="Lista de nurture viva")
    b4 = ax.bar(x, lost, width,
                bottom=np.array(ibuyer) + np.array(pulppo) + np.array(nurture),
                color=DANGER, edgecolor=NAVY_BG, linewidth=2,
                label="Perdidos / silencio")

    ax.set_xticks(x)
    ax.set_xticklabels(categories, color=FG, fontsize=14, fontweight="600")
    ax.set_ylabel("leads / mes", color=MUTED, fontsize=12, labelpad=10)
    ax.set_ylim(0, 10000 * 1.55)
    ax.set_yticks([0, 2000, 4000, 6000, 8000, 10000])

    # Headline above the chart
    ax.text(0.5, 10000 * 1.46,
            "6,200 leads por mes recuperados",
            color=TEAL, fontsize=17, fontweight="700", ha="center")
    ax.text(0.5, 10000 * 1.38,
            "el 62 por ciento que hoy se pierde por reglas de buybox o cobertura",
            color=MUTED, fontsize=12, ha="center")

    # Inside-segment labels
    def label_segment(xi, y_bottom, value, color, anchor="white"):
        if value <= 0:
            return
        ax.text(xi, y_bottom + value / 2, f"{value:,}",
                color=NAVY_BG if anchor == "dark" else FG,
                ha="center", va="center", fontsize=13, fontweight="700")

    # Antes column (x=0)
    label_segment(0, 0, 3800, TEAL, anchor="dark")
    label_segment(0, 3800, 6200, DANGER, anchor="dark")
    # Después column (x=1)
    label_segment(1, 0, 3800, TEAL, anchor="dark")
    label_segment(1, 3800, 4400, VIOLET, anchor="dark")
    label_segment(1, 3800 + 4400, 1800, SUCCESS, anchor="dark")

    # Totals on top of each bar
    ax.text(0, 10000 + 200, "10,000 leads inbound",
            color=MUTED, ha="center", fontsize=11)
    ax.text(1, 10000 + 200, "10,000 atendidos",
            color=TEAL, ha="center", fontsize=11, fontweight="700")

    # Recovery arrow callout between bars
    ax.annotate("", xy=(0.78, 9700), xytext=(0.22, 9700),
                arrowprops=dict(arrowstyle="->", color=TEAL, lw=2.0))
    ax.text(0.5, 9050, "Prisma recupera 6,200",
            color=TEAL, ha="center", fontsize=12, fontweight="700")

    ax.legend(loc="upper center", bbox_to_anchor=(0.5, 1.20),
              frameon=False, fontsize=10,
              labelcolor=FG, ncol=4, handlelength=1.3, columnspacing=1.6)
    ax.set_xlim(-0.7, 1.7)
    fig.subplots_adjust(top=0.76, bottom=0.18)

    fig.text(0.5, 0.02,
             "Base: 10,000 leads inbound al mes. Rechazo por buybox calibrado al benchmark Opendoor (44 por ciento). Sin cobertura iBuyer derivado de 21 / 32 estados sin presencia.",
             color=DIM, fontsize=9, ha="center")

    save(fig, "05-recovery.png")


if __name__ == "__main__":
    print("Rendering Prisma deck charts...")
    plt.rcParams["font.family"] = ["Inter", "Helvetica", "Arial", "sans-serif"]
    plt.rcParams["axes.titlepad"] = 14

    chart_routing_distribution()
    chart_volume_scaling()
    chart_coverage_recovery()

    print("\nDone. Files in:", OUT)
