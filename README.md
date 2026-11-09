# Nils Demougeot · Portfolio

Interactive portfolio, drawn as a set of engineering sheets: a 3D loss surface with three optimizers racing on the title sheet, live ports of the projects running in the browser, four orbitable CAD viewports, a plotted globe and a searchable index. Plain static site (HTML, CSS, vanilla JS and a local copy of three.js r128): no build step, no external request.

The previous version of the site is kept in [`v1/`](v1/) and stays online at `/v1/`.

## Preview locally

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` (new site) or `http://localhost:8000/v1/` (previous one).

## Deploy on GitHub Pages

**Settings → Pages → Deploy from a branch → `main`, `/ (root)`**. `.nojekyll` makes GitHub serve every file as is.

## Going back to the previous site

Everything the old site needs is in `v1/` (its own `index.html`, CSS and JS) plus the shared `assets/` (images, fonts, data, CV). Two ways back:

- **Keep both**: nothing to do, the old one lives at `/v1/` and is linked from the footer of the new one.
- **Make the old one the home page again**: `git revert` the commits of the redesign, or check out the last commit before it (`d0acfa0`).

## Structure

```
index.html              the page: sheets, project cards (single source of content), SEO tags and JSON-LD
assets/css/site.css     all styles (tokens at the top)
assets/css/demos.css    styles owned by a demo's own DOM (the La Fabrique mock app)
assets/js/site.js       app: card layout, demo engine, index, globe, skills, find palette, screenshot viewer
assets/js/hero.js       title sheet figure: loss surface + SGD / momentum / Adam (three.js, custom shaders)
assets/js/widgets.js    3D project models (platform, hexapod, H160, rocket) + shared canvas helpers
assets/js/demos.js      2D project demos (ports of the real projects' logic)
assets/js/vendor/       three.js r128
assets/data/            galleries.js (screenshots per project), world land mask, Paris metro graph, Boggle dictionary
assets/img/projects/    project screenshots, one folder per card
assets/fonts/           Archivo (variable: weight + width), JetBrains Mono
assets/cv/              CV served by the download buttons
tools/galleries.html    local tool: project cards and their screenshots
v1/                     previous version of the site (archived, noindex)
```

## Editing content

- **Projects**: one `<article class="proj">` per project inside `<div class="projects" id="projects">` in `index.html`, in display order (most relevant first). That list is the only place where project content lives; `site.js` lays it out:
  - the first 6 cards become the large sheets of *Selected work* (`FEATURED` at the top of `site.js`);
  - cards whose demo is a 3D model (`GL_DEMOS`) become the viewports of the *Workshop*;
  - every card is listed in the *Index*; the remaining ones open there as rows.
  `data-cat` sets the filter chips (`ai`, `sw`, `hw`, `more`); counts are computed on load.
- **The cards tool** (`tools/galleries.html`, Chrome or Edge) still works: it rewrites the `#projects` list (add, edit, reorder, delete) and the screenshots. Its preview shows the previous design, the data it writes is the same.
- **Screenshots**: `assets/data/galleries.js` (plain JSON, written by the tool or by hand). Key = card id without `p-`. They show as the strip under a demo, as the main image of a card without demo, as the hover preview in the Index and in the full-screen viewer.
- **Live demos**: a card with `data-demo="key"` gets its widget from `DEMOS` in `site.js`. Buttons with `data-act="name"` call that method on the widget; widgets write back into elements marked `data-out="name"`. The demo most in view runs, the others sleep.
- **Skills**: `SKILLS` at the top of `site.js`. Each skill lists the card ids where it was used; the numbers are generated.
- **Path**: the timeline rows are in `index.html` (`#tl`, `data-place` = `paris`, `riga` or `boston`); places are `PLACES` in `site.js`; the Gantt bars are in the `gantt` function.
- **Title block, lead, contact text**: in `index.html`. The internship date used by the countdown is `START` in `site.js`.
- **Title sheet figure**: the landscape is the `G` array in `hero.js` (`[x, z, amplitude, spread]`, negative amplitude = a pit); optimizer settings are in `step()`.
- **Find palette** (press `/` or Ctrl/⌘ K): sheets and projects are listed automatically; actions are the `ITEMS` array in `site.js`.
- **Colours and type**: tokens at the top of `site.css` (`--blue` is the logo blue).
- **CV**: overwrite `assets/cv/Resume_Nils_Demougeot.pdf`.
- **SEO**: the `<head>` of `index.html` holds the title, description, canonical URL, link-preview tags and a JSON-LD `Person` block. `assets/img/og-card.jpg` (1200×630) is the link-preview image. After a real content update, bump `dateModified` in the JSON-LD and `lastmod` in `sitemap.xml`.

## Behaviour notes

- Works without WebGL (the title sheet keeps its grid, 3D demos stay off) and without JavaScript (every project is listed as plain text).
- `prefers-reduced-motion`: no auto-rotation, no kinetic type, the optimizer paths are drawn at once.
- Rendering loops only run while their canvas is on screen and the tab is visible; the Boggle dictionary (≈700 KB) loads only when the Boggle demo is used.
- On phones a demo can go full screen (button in its title bar), in landscape where the browser allows it.
- Deep links: `/#p-ligue1`, `/#p-h160`… open the right sheet, viewport or index row.
