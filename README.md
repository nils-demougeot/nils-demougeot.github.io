# Nils Demougeot · Portfolio

Interactive portfolio: particle intro, 3D "What I build" shapes, an explorable globe, a command-line terminal and live project demos. It is a plain static site (HTML, CSS, vanilla JS and a local copy of Three.js r128), with no build step and no external requests.

## Deploy on GitHub Pages

1. Create a repository named `nils-demougeot.github.io` (or any name, for a project site).
2. Push the contents of this folder to the `main` branch.
3. In **Settings → Pages**, pick **Deploy from a branch**, then `main` and `/ (root)`.
4. The site is live at `https://nils-demougeot.github.io/` after a minute or two.

`.nojekyll` is included so GitHub serves every file as is.

## Preview locally

Opening `index.html` directly works. To match GitHub Pages exactly, run:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Structure

```
index.html              page markup + inline SVG icon sprite
assets/css/style.css    all styles (tokens at the top)
assets/js/main.js       app: intro, cursor swarm, terminal, content data
assets/js/widgets.js    WebGL widgets (particle shapes, globe, 3D project models: platform, hexapod, H160, rocket)
assets/js/demos.js      the other project demos (2D canvas, ports of the real projects' logic)
assets/js/vendor/       three.js r128
assets/data/            world land mask, Paris metro graph (Liv'in Paris), Boggle dictionary
assets/img/logos/       ESILV, MIT, Riga TU, Transdev
assets/cv/              CV served by the Download button and `cv` command
```

## Editing content

- **What I build**: the `BUILD` array at the top of `assets/js/main.js`. Each entry has a label, blurb, tags, color and a `shape` (`neural`, `stack`, `tree`, `chip`, `tower`, `shield`). New shapes go in `SHAPES` in `widgets.js`.
- **Terminal answers**: the `R` object in `main.js`; aliases in `ALIASES`. Quick commands are the `.qc` buttons in `index.html`.
- **Globe places**: `PLACES` in `main.js`.
- **Photo in `whoami`**: `assets/img/avatar.jpg` (square), path set in `AVATAR` in `main.js`.
- **Logo / favicon**: `assets/img/logo-nd.png` (nav logo and browser tab icon).
- **Projects**: one `<article class="proj">` per project in `index.html`, in display order (most relevant first). `data-cat` sets the filter chips (`ai`, `sw`, `hw`, `more`; update the counts on the chips if you move a card). The first 10 cards show by default; change `LIMIT` in `main.js`.
- **Project covers**: replace a card's `<div class="cover">…</div>` with `<img class="cover-img" src="assets/img/projects/NAME.jpg" alt="…">` (16:10 works best).
- **Live demos**: a card with `data-demo="key"` gets its widget from `DEMOS` in `main.js`. Buttons with `data-act="name"` call that method on the widget, and widgets write back into elements marked `data-out="name"`.
- **La Fabrique impact figures**: `IMPACT` at the top of the La Fabrique section of `demos.js` (water and CO₂ per kg of fabric) is a rough estimate; replace it with the app's own factors.
- **CV**: overwrite `assets/cv/Nils_Demougeot_CV.pdf`.

## Behaviour notes

- The intro plays once per browser session (about 2 s). It is skipped for deep links (`/#demos`) and when the OS asks for reduced motion. Click, scroll or press any key to skip it.
- The cursor light and dust trail only run on devices with a mouse, and are off with reduced motion.
- Press `/` anywhere to jump to the terminal. `projects` lists every project; hidden commands (`predict`, `leak`, `rlnc`, `ttt`, `route`, `quake`, `walk`, `explode`…) drive the demos. Clicking the Academics card runs `education`.
- Demos start only when their card nears the viewport; the Boggle dictionary (≈700 KB) loads only when the Boggle demo is used.
