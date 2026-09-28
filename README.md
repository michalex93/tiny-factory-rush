# Tiny Factory Rush

Juego HTML5 casual/idle de fábrica. Administra una línea de producción: materia prima → máquinas → producto → dinero → mejoras.

MVP / candidato a validación en CrazyGames.

**Versión:** 0.6.0 — rediseño visual completo ("toy factory"), juice, audio procedural, SDK CrazyGames

## Stack

- Phaser 4
- TypeScript (strict)
- Vite
- localStorage (sin backend)

## Instalación

```bash
npm install
```

## Ejecutar (desarrollo)

```bash
npm run dev
```

Abre `http://localhost:5173/`.

## Build de producción

```bash
npm run build
npm run preview
```

La salida queda en `dist/` (lista para subir a un host estático / CrazyGames).

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run typecheck` | TypeScript estricto sin emitir |
| `npm run test` | Tests unitarios (Vitest) |
| `npm run build` | typecheck + bundle Vite |
| `npm run preview` | sirve `dist/` |

## Controles

- **Click / tap en una máquina**: la acelera un momento (chispas + ojos felices)
- **Tarjetas bajo cada máquina**: Faster / More room / Worth more
- **Tarjeta "NEXT" (arriba a la derecha)**: siguiente producto (Toys → Space Tech)
- **Música / sonido (arriba a la derecha)**: música y SFX por separado
- Consola: `window.__tfrReset()` reinicia el guardado y recarga

## Arte y audio (v0.6)

Todo el arte es vectorial y se genera al arrancar (`src/art/Textures.ts`), sin archivos de imagen:
máquinas con personalidad (ojos que parpadean, se enojan cuando se atascan, se duermen cuando esperan),
banda transportadora animada, 5 productos × 4 etapas visuales (materia prima → pieza → producto → empacado),
tolva de entrada y camión de reparto. El render es 2× (`src/art/view.ts`) para verse nítido en pantalla completa.

Audio 100 % Web Audio (`src/systems/AudioSystem.ts`): SFX por acción y un loop musical generativo suave.

La capa de texto (`src/ui/copy.ts`) traduce la jerga de los sistemas (OUTPUT, WIP, THROUGHPUT…) a lenguaje de jugador.

## Portadas

`npm run dev` y luego `npm run covers` → genera `covers/` en 1920×1080, 800×1200 y 800×800.

## Eventos

- **Golden Product**: aparece a veces, vale mucho más (★)
- **Production Boost**: producción x2 ~20 s
- **Overdrive**: una máquina va mucho más rápido ~8 s

Configurables / desactivables en `src/config/balance.ts` → `EVENTS`.

## Productos

1. Boxes → 2. Toys → 3. Smartphones → 4. Robots → 5. Space Tech

Misma fábrica; cambia valor y color.

## Estructura

```
src/
  config/       balance.ts, gameConfig.ts
  entities/     Machine, Conveyor, Product
  systems/      Factory, Economy, Upgrades, Events, Progression,
                SaveSystem, Stats, AudioSystem, Platform
  scenes/       BootScene, GameScene, UIScene
  ui/           UpgradeButton, FloatingText
public/assets/  placeholders
```

## Persistencia

Autosave en `localStorage` (`tiny-factory-rush-save`): monedas, upgrades, productos desbloqueados, mute, stats.

## Preparación CrazyGames

- SDK v3 cargado en `index.html`; `src/systems/Platform.ts` llama `init`, `loadingStart/Stop`, `gameplayStart/Stop`, `happytime` (no-op fuera de CrazyGames)
- Entra directo al gameplay (sin menús), inglés por defecto, sin botón de fullscreen propio
- Sin ads reales en esta versión (Basic Launch)

## Checklist candidato (M3)

- [x] Compila (`npm run build`)
- [x] Typecheck + tests
- [x] Loop jugable + upgrades + save
- [x] 5 productos + eventos + audio
- [x] Hit areas touch corregidas
- [x] Feedback visual (sparks, coin fly)
- [x] Arte coherente en alta resolución + música/SFX (v0.6)
- [x] SDK CrazyGames v3 (gameplayStart/Stop, loading, happytime)
- [x] Portadas 16:9, 2:3, 1:1
- [ ] Prueba manual en Chrome móvil del usuario
- [ ] Video preview 15–20 s (opcional)
