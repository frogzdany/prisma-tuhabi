---
marp: true
theme: prisma
paginate: true
transition: fade 320ms
title: Prisma. Centro de Triaje
description: Cada mensaje del vendedor en su mejor ruta, en menos de treinta segundos.
---

<!-- _class: title -->

<img src="assets/brand/logo.png" class="logo-hero" alt="Prisma" />

# Prisma

## Centro de Triaje para TuHabi

<p class="oneliner">Cada mensaje del vendedor en su mejor ruta, en menos de treinta segundos.</p>

iBuyer directo, asesor Pulppo o nurture, con transparencia total de comisiones.

---

<!-- _class: divider -->

<img src="assets/brand/logo.png" class="logo-mark" alt="" />

### El problema

# Hoy se gana mucho y se deja mucho en la mesa.

El motor iBuyer es tan estricto como debe ser.
Miles de vendedores caen fuera del buybox cada mes y muchos terminan en silencio.

---

<!-- _class: stats -->

<img src="assets/brand/logo.png" class="logo-mark" alt="" />

# Por qué existe el hueco

<div class="stat-grid">
  <div class="stat">
    <span class="stat-num">1B USD</span>
    <span class="stat-lbl">Transacciones combinadas TuHabi y Pulppo durante 2025. Buena base, el upside está en lo no capturado.</span>
  </div>
  <div class="stat">
    <span class="stat-num">11 / 32</span>
    <span class="stat-lbl">Estados con cobertura iBuyer. Veintiún estados quedan en blanco frente a la demanda inbound.</span>
  </div>
  <div class="stat">
    <span class="stat-num">0.5M a 4M MXN</span>
    <span class="stat-lbl">Rango de compra iBuyer. Pulppo promedia seis millones, así que hay una zona muerta entre los dos.</span>
  </div>
  <div class="stat">
    <span class="stat-num">40 a 60 por ciento</span>
    <span class="stat-lbl">Rango de rechazo benchmark en iBuyers grandes. Sobre TuHabi son entre diez y veinte mil leads al año.</span>
  </div>
  <div class="stat">
    <span class="stat-num">800 asesores</span>
    <span class="stat-lbl">Red Pulppo recién adquirida. Cada lead rechazado por iBuyer podría llegar a uno, hoy el ruteo es manual.</span>
  </div>
  <div class="stat">
    <span class="stat-num">100M USD</span>
    <span class="stat-lbl">Capital fresco H1 2026 dedicado a IA. El momento para mover esta palanca es ahora.</span>
  </div>
</div>

<div class="refs">
<strong>Fuentes:</strong> reportes públicos TuHabi y Pulppo 2025. Buybox y cobertura: página pública TuHabi. Rechazo iBuyer: reportes financieros Opendoor 2022 a 2024. Capital IA: cobertura BBVA Spark México H1 2026.
</div>

---

<!-- _class: divider -->

<img src="assets/brand/logo.png" class="logo-mark" alt="" />

### La solución

# Un agente que enruta cada lead en menos de treinta segundos, sin perder ninguno.

Conversacional desde WhatsApp y canales similares.
Decide entre iBuyer, asesor Pulppo o nurture.
Explica los números al vendedor (neto, comisión, tiempo).
Persiste el lead en Supabase y se integra con cualquier CRM vía webhook.

---

<!-- _class: phases -->

<img src="assets/brand/logo.png" class="logo-mark" alt="" />

# Cómo funciona Prisma

<div class="phase-grid">
  <div class="phase">
    <span class="phase-tag">FASE 1</span>
    <h3>Entiende</h3>
    <ul>
      <li>Lee el mensaje en español de México</li>
      <li>Detecta zona y tipo de propiedad</li>
      <li>Estima urgencia y motivación</li>
    </ul>
  </div>
  <div class="phase">
    <span class="phase-tag">FASE 2</span>
    <h3>Decide</h3>
    <ul>
      <li>Cruza zona contra capas de riesgo</li>
      <li>Estima valor y valida buybox</li>
      <li>Busca asesor Pulppo si aplica</li>
      <li>Calcula tres escenarios con netos</li>
    </ul>
  </div>
  <div class="phase">
    <span class="phase-tag">FASE 3</span>
    <h3>Actúa</h3>
    <ul>
      <li>Responde con voz local</li>
      <li>Guarda lead y decisión en Supabase</li>
      <li>Se integra al CRM ya conectado</li>
    </ul>
  </div>
</div>

<p class="phase-foot"><strong>Orquestador:</strong> un solo loop con Claude Haiku, bajo siete segundos por triaje. Make.com lo dispara desde cualquier canal.</p>

---

<!-- _class: demo -->

<img src="assets/brand/logo.png" class="logo-hero" alt="Prisma" />

### Ahora lo ven correr

# Demo en vivo

<p class="demo-cue">Cuatro mensajes reales. Cuatro rutas distintas. Una sola pantalla con la decisión siempre visible.</p>

<p class="demo-foot">Cambiamos a la app. Volvemos a los slides en treinta segundos.</p>

---

<!-- _class: chart -->

<img src="assets/brand/logo.png" class="logo-mark" alt="" />

# Lo que acaban de ver, a escala

<p class="chart-sub">Casi la mitad de los leads termina en Pulppo, ruta que hoy queda en silencio. El resto se cierra como iBuyer o queda en nurture vivo.</p>

![Distribución de rutas](assets/01-routing.png)

<p class="chart-foot">Proporciones ilustrativas calibradas con el benchmark Opendoor de rechazo (44 por ciento) y la cobertura pública iBuyer de TuHabi (11 de 32 estados).</p>

---

<!-- _class: chart -->

<img src="assets/brand/logo.png" class="logo-mark" alt="" />

# La fuga, en una gráfica

<p class="chart-sub">Antes: solo el segmento dentro del buybox se cierra. Después: ningún lead se tira, cada uno aterriza en su mejor ruta posible.</p>

![Recuperación de leads](assets/05-recovery.png)

<p class="chart-foot">Volúmenes ilustrativos sobre una base de 10,000 leads inbound al mes. Calibrados con benchmarks Opendoor y cobertura pública TuHabi.</p>

---

<!-- _class: icp -->

<img src="assets/brand/logo.png" class="logo-mark" alt="" />

# Cliente ideal

<div class="icp-grid">
  <div class="icp-card">
    <span class="icp-tag">PRIMARIO</span>
    <h3>iBuyers híbridos</h3>
    <p>Compran cartera propia y a la vez tienen red de asesores. TuHabi y Pulppo son el caso uno a uno.</p>
  </div>
  <div class="icp-card">
    <span class="icp-tag">ADYACENTE</span>
    <h3>Proptechs con buybox rígido</h3>
    <p>Opendoor, Habi, Loft, La Haus. Cada vez que rechazan un lead pierden el costo de adquisición.</p>
  </div>
  <div class="icp-card">
    <span class="icp-tag">FUTURO</span>
    <h3>Brokerages digitales en LATAM</h3>
    <p>Volumen alto de leads inbound y equipos chicos. Prisma triaje + handoff levanta su capacidad sin contratar.</p>
  </div>
</div>

<p class="icp-foot"><strong>Señal de calce:</strong> más de 1,000 leads inbound al mes, regla de aceptación binaria, equipo humano que no escala al ritmo del marketing.</p>

---

<!-- _class: team -->

<img src="assets/brand/logo.png" class="logo-mark" alt="" />

# Por qué este equipo lo lleva a producción

<div class="team-grid">
  <div class="team-card">
    <h3>Daniel</h3>
    <span class="team-role">Arquitectura e implementación general</span>
    <p>Diseñó el sistema y unió las piezas. Lleva sistemas con IA a producción.</p>
  </div>
  <div class="team-card">
    <h3>Joseph</h3>
    <span class="team-role">IA, animación y UI</span>
    <p>Cuidó la voz visual y el storytelling del agente paso a paso.</p>
  </div>
  <div class="team-card">
    <h3>Braulio</h3>
    <span class="team-role">Fuentes de datos y validación</span>
    <p>Tipa, valida y persiste cada dato. Decisión trazable, no caja negra.</p>
  </div>
  <div class="team-card">
    <h3>Roberto</h3>
    <span class="team-role">Orquestación del agente</span>
    <p>Montó el loop de herramientas y el caching de prompts. Costo bajo control.</p>
  </div>
  <div class="team-card">
    <h3>Denisse</h3>
    <span class="team-role">Handoff, voz y cierre</span>
    <p>Conecta a asesor, voz en español MX y persistencia. Cierra el ciclo.</p>
  </div>
</div>

<div class="stack-grid">
  <div class="stack-cat">
    <span class="stack-lbl">Razonamiento</span>
    <span class="stack-val">Anthropic Claude Haiku 4.5 + prompt cache</span>
  </div>
  <div class="stack-cat">
    <span class="stack-lbl">Visión y extracción</span>
    <span class="stack-val">Google Gemini 2.5</span>
  </div>
  <div class="stack-cat">
    <span class="stack-lbl">Cover del listing</span>
    <span class="stack-val">Google Imagen 4</span>
  </div>
  <div class="stack-cat">
    <span class="stack-lbl">Tour del listing</span>
    <span class="stack-val">Google Veo 3 (image to video)</span>
  </div>
  <div class="stack-cat">
    <span class="stack-lbl">Voz local MX</span>
    <span class="stack-val">ElevenLabs (voz Sofía)</span>
  </div>
  <div class="stack-cat">
    <span class="stack-lbl">Datos y orquestación</span>
    <span class="stack-val">Supabase + Make.com + Next.js 16</span>
  </div>
</div>

---

<!-- _class: timeline -->

<img src="assets/brand/logo.png" class="logo-mark" alt="" />

# Cómo llegamos al mercado

![Línea de tiempo de integraciones](assets/06-timeline.png)

<p class="timeline-foot">Día uno: piloto con TuHabi y Pulppo. Primer mes: datos reales conectados. Trimestre: WhatsApp Business y tablero histórico.</p>

---

<!-- _class: split -->

<img src="assets/brand/logo.png" class="logo-mark" alt="" />

# Qué pasa el lunes

<div class="col">

### Equipo de adquisición

- Los nuevos mensajes llegan ya triados
- El equipo solo revisa los listos para llamar
- Los rechazos por buybox se vuelven inicio de la ruta Pulppo
- Cero leads tirados al cierre del día

</div>

<div class="col">

### Asesores Pulppo

- Reciben leads tibios, no fríos
- Cada handoff trae contexto y valor estimado
- Borrador de mensaje inicial listo para enviar
- Métricas de desempeño por zona y por asesor

</div>

---

<!-- _class: close -->

<img src="assets/brand/logo.png" class="logo-hero" alt="Prisma" />

# Prisma

## Cada mensaje del vendedor en su mejor ruta.

Sin lead perdido. Sin asesor improvisando. Sin vendedor a ciegas.
Listo para correr el lunes.
