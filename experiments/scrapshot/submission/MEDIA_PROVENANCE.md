# Media provenance — 0.4.1

Covers: original AI-generated promotional illustrations made with the built-in imagegen tool, edited into three compositions, then resized with FFmpeg. They depict the game's cannon robot, wood/glass/metal targets, physics destruction, upgraded barrel and title. They are illustrations, not screenshots. No third-party game artwork was supplied.

Prompt direction: polished casual physics demolition game cover, title SCRAPSHOT, small yellow and dark-green cannon robot with orange muzzle and gold upgrade bands firing through stacked wood, seafoam glass and sage metal in a warm cream scrapyard. Clear hierarchy and readable title, flying fragments and satisfying collapse, no other text, no borders or external logos. Landscape 16:9; square and portrait edits preserve the same character, palette and title while recomposing for their aspect ratios.

Preview videos: `scripts/render-preview.mjs` runs the compiled production game bundle with jsdom and @napi-rs/canvas. It uses the game's own physics, drawing and controls at normal simulated speed, with scripted aim and synthetic progression saves to demonstrate contracts 1, 6 and 9. No gameplay outcomes are manually animated. In-canvas HUD labels are omitted for clean promotional crops. Portrait is a moving camera crop; it does not depict the mobile interface. Title is overlaid. No audio, pointer, black bars or speed-up. Each contains 17 seconds of game scenes and 1 second of the matching static cover.

This is offline media production, NOT recorded browser play and NOT evidence of browser, mobile or CrazyGames portal QA. Automated verification and pending device checks are documented separately.

Reproduction needs ffmpeg, DejaVu fonts, installed game dependencies and a separate npm directory with @napi-rs/canvas. Run the render script with that directory and an output directory. Prepend a 1-second matching cover and encode H.264/yuv420p at 30 fps. Final dimensions: 1920×1080 and 1080×1620. Runtime game art is procedural canvas; Matter.js MIT notice accompanies the game ZIP.
