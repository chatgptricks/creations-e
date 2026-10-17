# Creations E

An immersive portfolio for E: orange, ivory, liquid chrome, and a little creative gravity.

## Run

```sh
npm install
npm run build
npm run dev
```

Open http://localhost:4317. The server serves `dist/`; rebuild after changing source. `npm run check` validates JavaScript syntax.

## Experience

- A custom Three.js sculpture with procedural studio reflections, orbital light trails, pointer response and scroll choreography
- A press-and-hold “Bend reality” interaction, with keyboard support
- Four art-directed project worlds: Engine, Sentient 2.0, USS Sentient and Cuentacuentos
- An illustrated project explorer with launch transitions and embedded live websites
- A searchable, filterable index of all 28 projects
- A playful remix interlude, staggered reveals and responsive card interactions
- Mobile layouts, native modal focus management, Escape support and reduced-motion controls

`assets/projects.json` owns the project catalogue. Embedded sites retain their own authentication and embedding restrictions; every live project also offers an external-tab link. No credentials or account data are copied into this portfolio.

## Source

`index.html`, `styles.css`, `app.js`, and `ether-scene.js` form the current experience. `build.mjs` generates static assets and content-versioned module URLs. The previous desktop design and initial concept are preserved in repository history; older root modules are not part of the current build.

Optimized project covers are in `assets/work/`. Editable source artwork and provenance notes are retained there. They use original project illustrations, the Sentient brand symbol, and a real public USS Sentient capture. Fonts and Three.js retain their licenses.

## Hosting

Published on **GitHub Pages** at https://chatgptricks.github.io/creations-e/ from https://github.com/chatgptricks/creations-e.

`.github/workflows/deploy-pages.yml` installs dependencies, checks JavaScript, builds `dist/`, and deploys changes to `main`. Asset and fetch paths remain relative for the `/creations-e/` project URL.

The user explicitly requested GitHub Pages instead of Sites. Do not register, save, or deploy this project using Sites.
