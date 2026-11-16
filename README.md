# Nils Demougeot · Portfolio

Interactive portfolio: 3D data-landscape intro, 3D "What I build" shapes, an explorable globe, a command-line terminal and live project demos. It is a plain static site (HTML, CSS, vanilla JS and a local copy of Three.js r128), with no build step and no external requests.

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
index.html              page markup + inline SVG icon sprite + SEO tags and JSON-LD
robots.txt, sitemap.xml for search engines
assets/css/style.css    all styles (tokens at the top)
assets/js/main.js       app: intro, cursor swarm, terminal, content data
assets/js/widgets.js    WebGL widgets (particle shapes, globe, 3D project models: platform, hexapod, H160, rocket)
assets/js/demos.js      the other project demos (2D canvas, ports of the real projects' logic)
assets/js/gallery.js    screenshot galleries in the project covers + full-screen viewer
assets/js/vendor/       three.js r128
assets/data/            world land mask, Paris metro graph (Liv'in Paris), Boggle dictionary, galleries.js (screenshots per project)
assets/img/logos/       ESILV, MIT, Riga TU
assets/cv/              CV served by the Download button and `cv` command
assets/img/projects/    project screenshots, one folder per card (managed by tools/galleries.html)
tools/galleries.html    local tool: project cards (add, edit, reorder, delete) and their screenshots
```

## Immersive version (`/3d/`)

A second, separate design of the same portfolio lives in `3d/` and is served at `https://nils-demougeot.github.io/3d/`. The classic page (`index.html`) does not depend on it and is unchanged.

Its look is its own: warm paper, black type (Inter Tight, with Instrument Serif italics), hairlines, and a block of ice in WebGL that bends the headline, breaks into chunks that float through the page, orbits a globe in a night section and gathers again at the end.

```
3d/index.html     page markup (uses <base href="../"> so it shares the images, demos and data of the classic site)
3d/css/style.css  styles of the immersive version
3d/css/demos.css  styles the live demos need (copied from assets/css/style.css)
3d/fonts/         Inter Tight and Instrument Serif (SIL Open Font License), self-hosted
3d/js/scene.js    WebGL scene: ice rocks, headline marquee, globe, ring of words
3d/js/app.js      scroll → 3D state, reveals, cursor, skills, project index, project page with galleries and live demos
3d/js/data.js     text of the 19 projects, extracted from index.html
```

- It reuses `assets/js/widgets.js`, `assets/js/demos.js` and `assets/data/galleries.js` as they are: a new screenshot added with the gallery tool shows up in both versions.
- Project texts are a copy: after editing a project card in `index.html`, update the same entry in `3d/js/data.js`. The other texts (about, places, contact) are in `3d/index.html`, and the "What I build" and skills lists at the top of `3d/js/app.js`.
- Each section's 3D state (layout of the ice, position, size, day or night) is one line of `keys()` in `3d/js/app.js`; the layouts themselves are in `layout()` in `3d/js/scene.js`.
- The headline behind the rock is the `parts` array in `buildMarquee()` (`scene.js`); the ring of words at the end is in `buildRing()`.
- Data points: a cloud of dots behind the ice takes the shapes of the trade, section by section (six clusters for the six fields, a small neural network with signals along its edges for the skills, a loss surface under the project index). Shapes are built in the "Data points" block of `scene.js`; which shape each section uses is the `pw` entry of `keys()`.
- Search: `/` or Ctrl/⌘ K opens a palette over projects, skills, sections and a few actions (`INDEX` in `app.js`).
- A project has its own link: `/3d/#ligue1` opens that project (the id is the card id without `p-`).
- Scrolling is inertial with a mouse or trackpad (native on touch and with the keyboard); the 3D lowers its resolution by itself on slow machines and stops drawing while a project page covers it.
- The page is marked `noindex` with a canonical link to the classic page, so search engines keep a single version.
- Without WebGL it falls back to plain paper with the same content.

## Editing content

- **What I build**: the `BUILD` array at the top of `assets/js/main.js`. Each entry has a label, blurb, tags, color and a `shape` (`neural`, `stack`, `tree`, `chip`, `tower`, `shield`). New shapes go in `SHAPES` in `widgets.js`.
- **Terminal answers**: the `R` object in `main.js`; aliases in `ALIASES`. Quick commands are the `.qc` buttons in `index.html`.
- **Globe places**: `PLACES` in `main.js`.
- **Photo in `whoami`**: `assets/img/avatar.jpg` (square), path set in `AVATAR` in `main.js`.
- **Logo / favicon**: `assets/img/logo-nd.png` (nav logo and browser tab icon).
- **Projects**: one `<article class="proj">` per project in `index.html`, in display order (most relevant first). `data-cat` sets the filter chips (`ai`, `sw`, `hw`, `more`, or any chip you add; the counts are computed on load). The easiest way to add, edit, reorder or delete a card is the tool (`tools/galleries.html` → Projets): it rewrites the `#projects` grid of `index.html` and keeps the demo markup of existing cards untouched. The first 10 cards show by default; change `LIMIT` in `main.js`. The Grid / List switch is remembered per browser; the list shows every project as a row that opens into the full card.
- **Project covers**: replace a card's `<div class="cover">…</div>` with `<img class="cover-img" src="assets/img/projects/NAME.jpg" alt="…">` (16:10 works best).
- **Screenshots (galleries)**: open `tools/galleries.html` in Chrome or Edge, pick the Portfolio folder, drop images on a project and click Save. The tool resizes them (1600 px JPEG), can pixelate private zones, writes them to `assets/img/projects/<card id>/` and rewrites `assets/data/galleries.js` (plain JSON, editable by hand). On the site, `assets/js/gallery.js` replaces the card's `.cover` with the gallery: the first 3 images scattered like cards on a gradient in the project colours, then each image on its own, and a full-screen viewer on click. Images keep their own proportions (whole, never cropped) unless an image is set to "fill the frame" in the tool (`"fit": "cover"` in the data).
- **Live demos**: a card with `data-demo="key"` gets its widget from `DEMOS` in `main.js`. Buttons with `data-act="name"` call that method on the widget, and widgets write back into elements marked `data-out="name"`.
- **La Fabrique impact figures**: `IMPACT` at the top of the La Fabrique section of `demos.js` (water and CO₂ per kg of fabric) is a rough estimate; replace it with the app's own factors.
- **CV**: overwrite `assets/cv/Resume_Nils_Demougeot.pdf`.
- **SEO**: the `<head>` of `index.html` holds the title, description, canonical URL, link-preview tags and a JSON-LD `Person` block (school, skills, `sameAs` links to LinkedIn, GitHub, YouTube: add any new public profile there). `assets/img/og-card.jpg` (1200×630) is the link-preview image. `robots.txt` keeps `/tools/` out of search engines and points to `sitemap.xml`. After a real content update, bump `dateModified` in the JSON-LD and `lastmod` in `sitemap.xml`.

## Behaviour notes

- The intro plays once per browser session (about 3 s): a WebGL landscape of points that flattens, seen from above, onto the page's own dot grid (`runIntro` in `main.js`; without WebGL it runs in 2D). Timings are in its `T` object. It is skipped for deep links (`/#demos`) and when the OS asks for reduced motion. Click, scroll or press any key to skip it.
- The cursor light and dust trail only run on devices with a mouse, and are off with reduced motion.
- Press `/` anywhere to jump to the terminal. `projects` lists every project; hidden commands (`predict`, `leak`, `rlnc`, `ttt`, `route`, `quake`, `walk`, `explode`…) drive the demos. Clicking the Academics card runs `education`.
- Demos start only when their card nears the viewport; the Boggle dictionary (≈700 KB) loads only when the Boggle demo is used.
