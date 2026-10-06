# Vesper — Technical Documentation

This document holds setup, architecture, deployment, implementation notes, and validation history. The [README](README.md) is the visual introduction for players.

## Run the browser game

Requirements: Node.js 22.13 or later and pnpm 11.25.0 (pinned in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev:web
```

Open the local URL printed by Vite. For a production build:

```sh
pnpm build:web
pnpm preview:web
```

`build:web` writes a static site to `dist-web/`. It reuses `app/game/Game.tsx`, the existing game modules, UI components, and `public/` assets. It does not require a backend or API key. `web/main.tsx` is the standalone React entry point; `vite.web.config.ts` handles its build. No gameplay implementation is duplicated.

## GitHub and Netlify

Put the repository on GitHub first. Netlify can then import it and deploy future pushes automatically. The checked-in `netlify.toml` provides:

| Setting | Value |
| --- | --- |
| Base directory | Repository root |
| Build command | `pnpm build:web` |
| Publish directory | `dist-web` |
| Node version | `22` |

`NETLIFY_NEXT_PLUGIN_SKIP=true` disables an automatically detected Next.js adapter. Next-compatible dependencies belong to the existing Sites build; the Netlify entry point is a plain Vite static build.

The package manager is pinned in `package.json`; keep `pnpm-lock.yaml` with the source. Do not publish `public/` on its own: it contains assets, not a built game. No Netlify functions or framework adapter are needed by this static entry point.

Netlify documentation: [Deploy from your repository](https://docs.netlify.com/start/quickstarts/deploy-from-repository/).

The existing Sites preview remains private. This repository preparation does not create a GitHub repository, deploy to Netlify, or change preview access. Replace the README's private preview link with a verified public URL after deployment. Browser saves belong to each origin: progress on the current preview does not automatically transfer to a Netlify URL.

## Project map

| Path | Responsibility |
| --- | --- |
| `app/game/Game.tsx` | Title screen, HUD, books, settings, dialogue, voice lifecycle |
| `app/game/engine.js` | Simulation, combat, quests, interaction, save scheduling |
| `app/game/data.js` | Spell definitions, places, characters, lore, controls |
| `app/game/rules.js` | State, progression, incantation parsing, save restoration |
| `app/game/voice.js` | Browser speech recognition |
| `app/game/casting-help.js` | Failure guidance, invocations, spell aliases |
| `app/game/movement.js` | Locomotion, collision, camera smoothing |
| `app/game/performance.js` | Performance presets and render scheduling |
| `app/game/scene.js` | World construction |
| `app/game/art-direction.js` | Visual materials and scene art helpers |
| `app/game/character-art.js` | Shared human character models |
| `app/game/software-renderer.js` | Reduced-detail Canvas rendering fallback |
| `public/art/` | Generated portraits, sky, and surface art |
| `public/world-guide.md` | Setting, spellbook, and future-world lore |
| `web/` | Standalone static entry point for Netlify and local development |
| `tests/` | Existing gameplay, performance, save, movement, and character checks |

## Validation commands

```sh
pnpm exec tsc --noEmit
node tests/chapter.mjs
node tests/performance-and-help.mjs
node tests/movement-and-save.mjs
node tests/character-art.mjs
pnpm build:web
```

These checks do not replace a real microphone test or a hardware-rendered playthrough. The earlier implementation notes below distinguish automated checks from browser observations. A new public deployment should be checked for startup, assisted casting, voice permission and recognition, and saving across refresh.

## Documentation and image policy

Keep the README focused on screenshots, the premise, and playable features. Put technical changes here. Keep playable features distinct from planned worldbuilding. Do not invent a public demo URL or silently change a private deployment's audience.

The README images are unmodified captures retained from development:

| Image | What it shows |
| --- | --- |
| `docs/screenshots/bellwether-spellcasting.jpg` | Bellwether and Stoneward's invocation hint, before the latest character revision |
| `docs/screenshots/grimoire.jpg` | Ember Lance's grimoire page from an earlier interface/world-art revision |
| `docs/screenshots/character-showcase.jpg` | Latest human character revision shown from four angles in a development viewer |
| `docs/screenshots/save-and-continue.jpg` | Save settings and browser-local chronicle behavior |

The gameplay captures use the compatibility renderer. They are screenshots, not concept art. The character showcase is a development view, not an in-game screen. New browser captures were unavailable during this documentation pass; replace historical captures with current hardware-rendered screenshots when available.

## Implemented scope and future work

The opening chapter includes nine learnable spells, both progression routes, six linked quests, a rune puzzle, a boss, and the gate ending. The broader setting describes higher spell levels and ranks; those descriptions do not make later chapters playable.

The later continent, high-rank realm, incantationless casting, parallel casting, multiplayer, AR/VR, generative NPC dialogue, and server-enforced anti-cheat remain future work. No SSS rank is implemented.

## Existing host and implementation history

Repository preparation on 2026-10-05: the standalone production build, TypeScript check, complete chapter integration harness, README/documentation relative links, screenshot decoding, and production asset references passed. The static output contains approximately 2.49 MB of uncompressed files, including images. Vite reports a 655.70 kB minified engine chunk; this is a download-size observation, not a runtime performance measurement. No public Netlify deployment or new browser playtest has been performed in this pass.

The sections below preserve the existing implementation and validation notes. The original Sites build remains available alongside the new static web build.

## Development

The project uses the Sites Vinext starter, React, TypeScript, and Three.js. Preserve the pnpm lockfile and the Site identity in `.openai/hosting.json`.

- `pnpm dev`: development server (managed Sites uses its supervised preview).
- `pnpm build`: production build.
- `node tests/chapter.mjs`: engine integration checks for both progression routes, all spell unlocks, puzzle/boss/finale, and core voice rules.
- `pnpm exec tsc --noEmit`: type check.

Speech uses browser-provided recognition. It is not a microphone-quality, speaker-verification, or anti-cheat system. HTTPS, permission, service availability, and internet access may be required. No API key is needed. NPC dialogue does not call an AI service.

A Canvas 2D painter renderer provides reduced-detail graphics when WebGL is unavailable. Hardware rendering is recommended for full visuals. Core progression is identical.

The cel-art revision adds stepped toon lighting and ink outlines, articulated character models with sculpted hair and facial features, illustrated portraits for the entire named cast, painted sky and surface materials, layered foliage, detailed town architecture, and animated spell sigils. Both renderers use the same models and generated art assets. The compatibility renderer uses affine texture projection and contact shadows; the hardware path provides perspective-correct textures and full directional shadows. Art lives in `public/art/`; procedural models and styling live in `app/game/art-direction.js`.

WebMCP tools are feature-detected and register only when `document.modelContext` exists. They expose read-only chronicle state and opening the same books available in the UI. The current QA browser lacked that proposed API, so live WebMCP validation was unavailable.

## Validation

Performance revision: Balanced (default, 30 FPS cap), Battery saver (24), and High detail (60) control resolution, effects, and shadows. Resolution adapts to measured rendering cost. Title, paused, and hidden-tab states suspend world rendering and simulation. GPU scenery is merged by material and spatial region, and actor parts are merged without removing animation joints. Shadow maps are 1024² and update at most every 150 ms. Particle bursts share geometry and are bounded. The CPU renderer caches edge keys and shade palettes and culls distant foliage.

`node tests/performance-and-help.mjs` verifies actual-world scenery batching (312 meshes to 103 batches), player batching (77 to 46 meshes), dynamic-object preservation, frame caps, idle suspension, and spell-help/alias rules. These are workload reductions, not measured GPU FPS improvements. Browser QA covered software rendering, Stoneward cooldown help and its transition to ready, and changing performance presets while paused. Failed casts show persistent contextual guidance; hover or focus a hotbar spell for its invocation and use. “Stonewall” and “stone wall” resolve to Stoneward without bypassing invocation, level, or unlock checks.

The engine integration harness covers the complete independent chapter and academy acceptance/rejection. Browser inspection verifies game startup in software compatibility mode, assisted casting, spellbook, atlas, and codex. Physical microphone recognition and the GPU path require validation on a device providing those capabilities.

The visual revision passed TypeScript checking and the chapter integration harness. Browser review verified the new models/materials, portrait HUD, People codex, and assisted spell casting in compatibility mode. Existing browser saves retain their identity and progression.

Movement/save revision: camera-relative locomotion now uses frame-rate-independent acceleration and braking, shortest-angle turning, distance-based footfalls, swept wall sliding, and a camera arm that contracts around buildings. Smooth motion targets 60 FPS with reduced effects and no shadows. Existing version-1 saves remain compatible; character progression, position, settings, and camera view persist locally. Autosave runs every 10 seconds and on pause, hiding, and leaving; Settings includes a timestamp and Save now. Exams and temporary combat effects restart after reload. Clearing browser data removes the local chronicle; no cloud synchronization is provided.

`node tests/movement-and-save.mjs` checks equal travel across 24/30/60/144 FPS, diagonal speed, braking, sliding and dodge collisions, camera obstruction, angular wrap, progression/camera save round-trip, exam reset, and preservation of the previous save when storage fails.

Character volume revision: all seven characters retain human features. The shared model now has a continuous shaped torso and jaw, tapered limbs, almond eye surfaces, solid oval hair locks, a curved shoulder mantle, and wraparound coat panels with thickness. The previous six-head/chibi-style model has been replaced by longer proportions. Facial details use softer contours; the compatibility renderer uses averaged vertex normals and a gentler palette for characters. A seam-key correction prevents negative-zero coordinates from generating false outlines. Existing portraits and character identities remain intact.

Static nested face/outfit pieces now batch across their containers while preserving animation pivots and the independent staff crystal. The revised player has 6,662 triangles and 45 material batches (previously 5,762 triangles and 46 batches); this is a geometry/batch budget comparison, not an FPS benchmark. `node tests/character-art.mjs` verifies all seven human models, torso depth, finite geometry, posed/transformed batching, animation pivots, staff identity, and geometry limits. Front, three-quarter, profile, rear, and live gameplay were reviewed using compatibility rendering. Hardware rendering still requires an available GPU for direct visual validation.
