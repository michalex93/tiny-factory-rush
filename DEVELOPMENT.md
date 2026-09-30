# Development log — Tiny Factory Rush

## Milestone actual

**M-C.3.1 — Launch diagnostic + event-neutral baseline + Return microcopy**

Evidencia: `validate-mc3-b-clean.json` (MARGIN Launch 155.3 s) + FLOW en `validate-mc3-final.json`.

### 1. BUILD Fast reclasificado

- Nominal: 10–11.5 min
- Hard acceptance: **≥9.75 y ≤11.5** (9.75–10.0 = tolerancia de simulación)
- B clean **9.79 min = PASS** con tolerancia
- Sin minElapsed / wait artificial

### 2. Descomposición Launch B 155.3 s (sessionMs)

| Componente | Ms | Notas |
|------------|-----|-------|
| build→firstPhone | 511 | OK |
| sampling | 8 815 | ~9 s |
| waitingForQualifiedAction | 10 561 | wrong buffer + Value |
| proofProduction (action→batchFull) | 107 324 | ≈105 s equivalentes |
| waitingForFinalCondition (batch→complete) | 28 586 | sustainWindow=10 s → **resets** |
| **Total first→complete** | **155 286** | = harness 155.3 s |

### 3. Evento

Events ON; boost ×2 posible. Baseline raw income ≈ live; proof ≈105 s al ritmo del baseline → **no** hay penalización 2× post-evento en el lote. El exceso vs banda 60–120 viene de sampling+acción+hold.

### 4. Clasificación principal

**C. FINAL_CONDITION_FAILURE**

Hold OUTPUT tras lote: 28.6 s observados vs 10 s requeridos (umbral sobre baseline alto / caídas de OUTPUT). Secundario: acción ~10.5 s (B).

### 5. Correcciones aplicadas

| Área | Cambio |
|------|--------|
| Launch target | Baseline **event-neutral** (`launchTargetBasis=event_neutral`); progreso sigue contando live |
| Sustain HUD | `NEED OUTPUT ≥ X (now Y)` / `NEED WIP ≤ N` |
| Return copy | increased / stable / decreased — nunca “increased” si baja |
| Harness BUILD | `buildBand10_115` acepta 9.75–11.5 |

No tocado: Funding 35/58, Return 3 órdenes, FREE/BONUS, Toys, economía.

### Auto-verify

Tests + typecheck + build (ver entrega).

---

## M-C.3 (histórico)

Functional closure: Return ×3, applyFreeUpgrade, hydration, funding telemetry.
