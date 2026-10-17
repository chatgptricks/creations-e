# Creations E — Objects in motion

An experimental, fullscreen portfolio. E’s projects become physical objects visitors can grab, throw, rearrange, and open.

## Run

```sh
npm install
npm run build
npm run dev
```

Open http://localhost:4317. The server serves `dist/`; rebuild after editing source. `npm run check` validates JavaScript syntax.

## Interaction

- Eight detailed project miniatures: a CRT, spacecraft, storybook, canvas boards, sound machine, poster stack, portable terminal, and novel
- Direct dragging, momentum, collision response, and hover reactions
- Float, gravity, orbit, and sorted modes; a Shake control to scatter the collection
- Optional synthesized interaction sounds, enabled by the visitor
- Project inspection and full-screen embedded live experiences with launch transitions
- Searchable/filterable index of all 28 projects; selecting another project introduces its object into the field
- Keyboard controls: 1–4 for modes, Space to shake, / for the index, Escape to close dialogs
- Mobile layouts, reduced-motion controls, and a complete index when WebGL is unavailable

`assets/projects.json` owns the catalogue. Embedded sites retain their own authentication and embedding restrictions; live projects always offer a separate-tab link. The background scene pauses while a dialog is open.

## Source

- `index.html`, `styles.css`, `app.js`: interface, catalogue, and project viewer
- `playground-scene.js`: Three.js rendering, pointer interaction, motion, and responsive layouts
- `project-objects.js`: project-specific physical miniatures, original artwork, labels, and materials
- `playground-audio.js`: opt-in synthesized sound and audio lifecycle
- `build.mjs`: static build and versioned entry/import URLs

Original Engine and Cuentacuentos artwork is used directly inside the miniatures. Project cover sources and provenance are retained in `assets/work/`. Fonts and Three.js retain their licenses. Earlier portfolio directions remain in repository history; older root modules are not included in the build.

## Hosting

GitHub Pages: https://chatgptricks.github.io/creations-e/

Repository: https://github.com/chatgptricks/creations-e

`.github/workflows/deploy-pages.yml` checks, builds, and deploys changes to `main`. Keep asset and fetch paths relative for the `/creations-e/` project URL.

The user explicitly requested GitHub Pages instead of Sites. Do not register, save, or deploy this project using Sites.
