# Tiny Factory Rush

Juego HTML5 casual/idle de fábrica. Administra una línea de producción: materia prima → máquinas → producto → dinero → mejoras.

MVP / candidato a validación en CrazyGames.

**Versión:** 0.4.0 — identidad industrial casual (bottleneck / WIP / buffers)

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

- **Click / tap en una máquina**: acelera temporalmente su procesamiento
- **Botones de mejora (panel inferior derecho)**: Speed / Capacity / Profit por máquina
- **Desbloquear (botón izquierdo)**: siguiente producto (Toys → Space Tech)
- **Mute (esquina superior derecha)**: silenciar SFX (persistente)
- Consola: `window.__tfrReset()` reinicia el guardado y recarga

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

- `src/systems/Platform.ts`: hooks `gameplayStart` / `gameplayStop` / ads (no-op)
- `Events.trigger(...)`: listo para rewarded ads futuros
- Sin ads reales en esta versión

## Checklist candidato (M3)

- [x] Compila (`npm run build`)
- [x] Typecheck + tests
- [x] Loop jugable + upgrades + save
- [x] 5 productos + eventos + audio
- [x] Hit areas touch corregidas
- [x] Feedback visual (sparks, coin fly)
- [ ] Prueba manual en Chrome móvil del usuario
- [ ] Integración SDK CrazyGames (futuro)
