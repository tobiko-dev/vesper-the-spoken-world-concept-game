# Vesper — Technical Notes

## What this repository is

This is the browser-playable Chapter I prototype source for **Vesper — The Spoken World**. It is intentionally lightweight: static HTML/CSS/ES modules plus Three.js loaded from jsDelivr. There is no required build step and no generated TypeScript cache.

The repository was reconstructed after the original source-package upload was interrupted. The gameplay state, UI language, confirmed spell data, future-spell roadmap, screenshots, save behavior, and voice-casting rules were recovered from the last verified prototype state. Where the lost scratch archive contained implementation-only details that could not be recovered, this repository uses a small clean replacement implementation rather than inventing a fake copy of the missing bytes.

## Run locally

A local web server is required because the app uses ES modules.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Controls

- `WASD` — move
- hold `Shift` — faster movement/dodge-like sprint
- right-drag — rotate the third-person camera
- mouse wheel — camera distance
- `E` — interact
- `V` — voice cast
- `1`–`9` — assisted keyboard cast (65% potency)
- `J` — journal
- `G` — grimoire
- `Esc` — pause / close world flow

## Voice casting

The prototype uses the browser Web Speech API when `SpeechRecognition` / `webkitSpeechRecognition` is available. A valid direct cast must contain both the level and spell name, for example:

```text
Level 2. Ember Lance.
```

The matcher normalizes curly apostrophes and punctuation so names such as **Thor's Hammer** and **Thor's Lance** can be recognized consistently in contextual spell help. Future-lore spells remain non-castable.

Browsers without speech recognition can still use the `1`–`9` assisted casting fallback.

## Saving

State is stored in `localStorage` under `vesper-spoken-world-save-v2`. The game autosaves:

- every 10 seconds,
- when the pause screen is opened,
- when the page becomes hidden,
- and before leaving the page.

The save includes the character name, HP, mana, position, first quest progress, awakened waylights, and timestamp.

## Architecture

```text
index.html
src/
  main.js       world, movement, UI, saving, interactions, voice casting
  spells.js     playable spell data, locked lore, speech normalization
  styles.css    HUD, title screen, book UI, responsive layout
public/
  world-guide.md
docs/
  screenshots/
netlify.toml
README.md
TECHNICAL.md
```

The 3D scene uses basic Three.js geometry so the repository remains self-contained apart from the Three.js CDN module. The art direction and UI are documented by the screenshots in `docs/screenshots/`.

## Deployment

### Netlify

`netlify.toml` publishes the repository root directly. No install or build command is needed.

### GitHub Pages

The project is also compatible with Pages because asset references are relative. Serve the repository root.

## Recovery / validation notes

Confirmed recovered behavior:

- third-person movement and right-drag camera,
- Bellwether / Lantern Vale setting,
- Ilyra and the three-waylight opening objective,
- `E` interaction,
- `V` voice casting and `1`–`9` assisted casting,
- Journal / Grimoire / Atlas / Codex / Settings surfaces,
- local browser autosaves,
- Ember Lance's confirmed cost/recovery/invocation,
- Stoneward's six-second defensive behavior and invocation,
- future lore roadmap including Parallel/Multicast/Triple/Quad Cast,
- Caldris and Vaelith naming,
- apostrophe normalization for Thor's Hammer / Thor's Lance.

The earlier scratch archive itself is not present in this chat runtime, so this commit is a functional recovery of the verified state rather than a byte-identical restoration of that lost archive.


## Visual restoration

The Netlify migration now uses a reconstructed Bellwether scene based on the retained prototype screenshots: a navy-and-gold humanoid player, textured grass and cobblestone, fountain, cottages, Academy facade, lamps, benches, trees, waylights, and a restored HUD minimap. The original ChatGPT Site source bundle was not exportable, so this is a source-controlled reconstruction rather than a byte-for-byte export.
