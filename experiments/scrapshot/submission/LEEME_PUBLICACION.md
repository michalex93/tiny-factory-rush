# Scrapshot 0.4.1 — paquete para CrazyGames

Estado: preparado para cargar como Basic Launch. NO enviado ni aprobado.

## Archivos y campos

1. Descomprime el paquete exterior. En el campo del juego carga únicamente `Scrapshot-0.4.1-game.zip`. Contiene `index.html` en la raíz y rutas relativas; no necesita servidor ni claves.
2. Nombre: Scrapshot. Género sugerido: Puzzle / Physics. Etiquetas sugeridas: demolition, cannon, upgrade, physics, casual. Usa las disponibles en el portal.
3. Copia descripción y controles de `metadata-en-es.json`. Inglés es el idioma inicial; español se selecciona en el juego.
4. Carga las tres imágenes de `covers/`: paisaje 1920×1080, vertical 800×1200 y cuadrada 800×800.
5. Carga los dos MP4 de `videos/`: paisaje 1920×1080 y vertical 1080×1620. Duran 18 segundos, son mudos y empiezan por la portada.
6. Motor: HTML5 / JavaScript, física Matter.js. Guardado local. Sin cuentas, compras, anuncios ni SDK. El SDK es opcional para Basic Launch; no marcar integración completa.
7. Dispositivos previstos: escritorio y móvil táctil. Confirmar ambos en la prueba del portal antes de declararlos compatibles.

## Comprobaciones pendientes antes de pulsar Submit

- Abrir el ZIP en la vista previa del Developer Portal. Confirmar que carga sin errores ni recursos ausentes.
- Chrome y Edge: apuntar/soltar, disparo por controles, pausa, reintento, cambio de nivel y sonido después de pausa.
- Teléfono real: tocar y arrastrar sin seleccionar texto, botones accesibles, rotación, legibilidad y rendimiento. La aprobación visual anterior del usuario corresponde a una versión previa.
- Comprobar interfaces de escritorio a 907×510, 1216×684, 1077×606 y 821×462; móvil a 800×450 y tablet a 1080×607.
- Partida nueva: desbloquear munición, comprar una mejora y verificar su cambio visual y funcional. Recargar y confirmar progreso.
- Probar sonido al volver de segundo plano, especialmente iOS; revisar que los controles de la plataforma no tapen botones.
- Revisar recorte de portadas/videos en el portal y completar datos de desarrollador que solicite la cuenta. Después, enviar para evaluación.

## Evidencia disponible

Build de producción correcto y 41 pruebas automatizadas de física/DOM aprobadas. Los 10 contratos tienen soluciones verificadas con equipo base. Los videos son material promocional renderizado con el bundle real; no prueban compatibilidad del navegador. La vista previa administrada estuvo bloqueada por ERR_BLOCKED_BY_CLIENT, por lo que la QA de navegador/portal permanece pendiente. La aceptación, retención e ingresos no están garantizados.

El ZIP del juego está por debajo de 20 MB; consultar el manifiesto para tamaños y SHA-256. No se añadieron criptomonedas ni premios de dinero real.

Referencias oficiales consultadas el 25 de septiembre de 2026:
- https://docs.crazygames.com/requirements/technical/
- https://docs.crazygames.com/requirements/gameplay/
- https://docs.crazygames.com/requirements/game-covers/

Para rehacer el build: `npm ci && npm test` en `experiments/scrapshot`. Empaquetar los archivos de `dist` en la raíz del ZIP y añadir la licencia de Matter.js. No incluir node_modules ni código fuente.
