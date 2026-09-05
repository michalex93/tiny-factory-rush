# Development log — Tiny Factory Rush

## Milestone actual

**M-C.2 — Liquidez funding, Return rate fix, Launch reload, BONUS TIER UI**

Correctivo quirúrgico sobre M-C.1. Artefactos `validate-mc1-*` no modificados.

### 1. Causa Return 180s → 37/86s

Target desde **un tick HUD** al cerrar Shift 1 (`getThroughputPerMin` / `lineIncomePerMin`), deprimido vs ritmo real post-reload (FLOW ~40/min vs ~91/min ⇒ ~86s). MARGIN: referencia baja + Value buys durante Return ⇒ 37s.

**Fix:** referencia = ventas reales del proof-batch Launch; progreso = delta de contadores smartphone tras Return; clamp ±25% canónico; `equivalentSeconds = 210`.

### 2. Funding (35% / 58%)

| Par evaluado | Notas |
|--------------|-------|
| 55/78 (M-C.1) | Timing OK, liquidez 0–1 compra |
| 25–45 / 50–68 | Búsqueda pareada en snapshots Throughput+Margin |
| **35 / 58 (elegido)** | ≥2 / ≥1 compras; ratio Fast/Bal ~0.78–0.80; sin operating reserve |

Durations sin cambio: Balanced 250s · Fast 195s · cap 125%.

### 3–7. Launch reload / BONUS / save

- Return solo desde `return_preview`/`shift_1_complete` (no durante sampling/Launch).
- BONUS TIER: modo en vivo; UI `BONUS +1 — FREE · $0`.
- Save sigue **v5** (campos opcionales con defaults).
- `__tfrSessionReport`: bloques `funding` + `returnDiag`.

### Revalidación humana (cuando se indique)

1. Balanced ≥2 compras en funding; Fast ≥1; BUILD bandas + suelo 9.75.
2. Return FLOW/MARGIN 2–5 min; `__tfrSessionReport().returnDiag.observedToExpectedRatio` ~0.7–1.3.
3. Reload mid-sampling y mid-launch conservan fase.
4. Línea MAX → BONUS visible/gastable; reload no duplica.

---

## M-C.1 (histórico)

**M-C.1 — Smartphone pacing, commissioning Launch y Return normalizado**

Correctivo sobre M-C / M-C.0.1. Fuente: `validate-mc-final.json` + capturas A/B.

### Parámetros M-C.1 (superseded by M-C.2 rates)

| Parámetro | Valor M-C.1 |
|-----------|-------------|
| BALANCED | 55% · 250 s |
| FAST | 78% · 195 s |
| Return | 180 s HUD snapshot (bug → 37/86s) |

### Flujo Launch (commissioning)

```
first_phone → baseline_sampling (8–10 s) → commissioning_goal
→ proof_batch + 1 acción relevante (o waived_at_cap)
→ launch_complete → Shift 1
```

- FLOW: `PHONE RAMP — CLEAR THE FLOW` (unidades + WIP≤16 + acción FLOW)
- MARGIN: `PREMIUM LAUNCH — PROVE THE VALUE` ($ ingreso + OUTPUT hold + acción MARGIN)
- Sin gates de reloj; lote pre-Launch no cuenta

### Return

- FLOW RESTART / MARGIN RESTART con metas acumulativas desde snapshot event-neutral
- Contadores a 0 al mostrar; save/reload conserva progreso
- ONE FREE UPGRADE: normal o **BONUS TIER** si la línea está MAX

### Config / telemetría

- Config: `src/config/smartphoneCampaign.ts` (reexport en `balance.ts`)
- `__tfrSessionReport()` → `currentSessionEvents` + `campaignMarkers` + `campaignState`

### Validación humana (NO ejecutar aún en esta entrega)

1. Throughput + Balanced + events OFF → READY ~210–240 s desde funding_choice; BUILD ≥9.75 min
2. Margin + Fast + events ON → READY ~165–195 s; Fast no antes de 9.75 min total
3. Launch: no completa por elapsed; acción incorrecta no califica; reload no duplica lote
4. Return ambas ramas 2–5 min; no autocompleta al cargar
5. Free upgrade normal y BONUS TIER; cashDelta 0; reload idempotente

### M-C.0.1 (conservado)

- Unlock: solo **BUILD** en READY
- Launch actions: solo compras Speed/Buffer/Value exitosas
- Política bloqueada tras elegir

### Auditoría Smartphones (pre-cambio)

| Ítem | Valor legacy M-B.3 |
|------|-------------------|
| Visibilidad | Tras Toy Mastery → `smartphones_horizon` |
| Earn gate | `unlockAtEarned: 400` (ya cumplido @ Toys 650) |
| Cash cost | `$600` vía Progression |
| Producto | `baseValue 14`, color `0x457b9d`, tint en items |
| Upgrades | Misma línea Speed/Buffer/Value |
| Quality/stability | No hay métricas reales de quality; WIP/OUTPUT sí afectan goals |
| Siguiente | Robots → Space Tech (cash unlock genérico) |

### Flujo campaña

```
Toy Mastery → funding_choice → funding (adaptativo) → READY → BUILD
→ First Smartphone → baseline_sampling → commissioning Launch
→ SHIFT 1 COMPLETE → return preview
→ (nueva carga) Return Challenge → ONE FREE UPGRADE (± BONUS TIER)
```

### No tocado

Ads, offline, streaks, prestige, Redline Routing.

---

## M-B.3 (cerrado)

Toys @650, Toy Mastery 45–90s, OPEN gratis, save/reload mastery OK.
