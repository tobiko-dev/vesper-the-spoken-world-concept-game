# Vesper — The Spoken World

*The world remembers every word. What will it remember of yours?*

A single-player fantasy RPG prototype about shaping magic with your voice and finding your own way through the Lantern Vale.

[Play the private preview](https://vesper-spoken-world.strongcaterpillar.chatgpt.site) · [Explore the world](public/world-guide.md)

*The private preview may require access. The repository also contains a standalone browser-playable recovery build.*

## A glimpse of the vale

![Exploring Bellwether with the spell hotbar and Stoneward invocation guidance](docs/screenshots/bellwether-spellcasting.jpg)

*Bellwether, where your first small spells begin a much larger story.*

## Give magic a voice

![The grimoire showing Ember Lance, its spoken invocation, and spell details](docs/screenshots/grimoire.jpg)

*Learn an invocation. Speak its level and name. Make the spell your own.*

## Meet your wayfarer

![The latest human wayfarer design shown from the front, three-quarter angle, side, and back](docs/screenshots/character-showcase.jpg)

*The latest character design, shown from four angles.*

## Return to your chronicle

![The pause menu with the saved chronicle and Save now button](docs/screenshots/save-and-continue.jpg)

*Save your journey, take a break, and return to the vale.*

These images follow the prototype's development. Gameplay and grimoire captures show earlier revisions; the character showcase is the latest design.

## Chapter I

- Third-person exploration in Bellwether and the Lantern Vale.
- Voice casting with a keyboard fallback for all nine hotbar slots.
- Journal, Grimoire, Atlas, Codex, dialogue, local autosaves, and the opening waylight objective.
- Locked future lore for high-order spells and parallel-casting techniques.
- A wider roadmap through the Hushwood, Northwatch, and the Sunken Choir.

## Run the repository build

```bash
python -m http.server 8080
```

Open `http://localhost:8080` in a browser. See [TECHNICAL.md](TECHNICAL.md) for architecture, controls, deployment and recovery notes.
