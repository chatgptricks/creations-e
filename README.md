# Creations E

An original Windows XP inspired portfolio for E, with an amber desktop, dreamcore wallpaper, and the complete Codex project library.

## Run

```sh
npm install
npm run build
npm run dev
```

Open http://localhost:4317. The server serves `dist/`; run the build after editing source. `npm run check` checks all JavaScript modules.

## Experience

- 28 projects plus system shortcuts, draggable desktop icons, and a searchable Explorer
- Movable, resizable windows with minimize, maximize, and taskbar restoration
- 17 verified deployed frontends launch in embedded windows after individual splash screens
- Projects without a deployed frontend open a project overview after the splash
- Start menu, live-project directory, optional synthesized sounds, motion control, calendar, and display settings
- Dream ambience: soft-focus landscape edges, a warm vignette, drifting light shafts, amber bloom and defocused light, with adjustable intensity in Display Properties
- Three.js chrome sculpture in the 3D Playground
- Phone layouts use full workspace windows and single-tap shortcuts

`assets/projects.json` owns the project catalogue. Public URLs were verified when this version was created. Embedded apps retain their own login requirements; the toolbar arrow opens an app in an external tab if its browser features need that. No credentials or live account data are copied into the portfolio.

## Artwork

Wallpaper generated with the built-in ImageGen tool. The selected asset is `assets/wallpaper-dreamcore.png`; `assets/wallpaper-classic.png` is the earlier blue-sky alternative. The rejected pink version is not part of the project. The final wallpaper prompt is preserved in `assets/WALLPAPER-PROMPT.txt`.

Original retro SVG icons are in `assets/icons/`. Engine, Sentient, and Cuentacuentos artwork is drawn from their existing project assets. Fonts and Three.js retain their licenses. `concepts/beyond-ordinary/` preserves the initial editorial design direction as source only; the desktop is the current site.

## Hosting

Published on **GitHub Pages** at https://chatgptricks.github.io/creations-e/ from https://github.com/chatgptricks/creations-e.

The workflow `.github/workflows/deploy-pages.yml` installs dependencies, checks the JavaScript, builds `dist/`, and deploys it whenever `main` changes. All app assets use relative paths for the `/creations-e/` project URL.

The user explicitly requested GitHub Pages instead of Sites. Do not register, save, or deploy this project using Sites.
