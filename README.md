# Haoyu Wu homepage academic refresh V2 — apply guide

This V2 package contains only the files that need to be added or overwritten in the current `haoyuwu97.github.io` repository. It keeps the static GitHub Pages model but further removes oversized hero blocks, simplifies publications, tightens the wiki layout, and rebuilds the literature network map.

## Apply

From the root of your local clone:

```bash
unzip haoyuwu97-academic-refresh.zip
rsync -av haoyuwu97-academic-refresh/ ./
python3 -m http.server 8000
```

Then open `http://localhost:8000` and inspect:

- `index.html`
- `research.html`
- `publications.html`
- `wiki.html`
- `wiki-entry.html?project=pilots`
- `leisure.html`

If the local preview is acceptable:

```bash
git status
git diff
git add index.html research.html publications.html wiki.html wiki-entry.html leisure.html \
  assets/css/academic-refresh.css \
  assets/js/research.js assets/js/publications.js assets/js/wiki.js assets/js/wiki-entry.js assets/js/literature.js \
  assets/img/research/research-program-map.svg
git commit -m "Academic homepage refresh and literature graph"
git push
```

## Changed files

### Added

- `assets/css/academic-refresh.css` — low-impact academic design override layer.
- `assets/js/literature.js` — online literature network search engine with research-lens triage, cleaner graph layout, browser-local saving, and shortlist export.
- `assets/img/research/research-program-map.svg` — restrained research-program schematic.

### Overwritten

- `index.html`
- `research.html`
- `publications.html`
- `wiki.html`
- `wiki-entry.html`
- `leisure.html`
- `assets/js/research.js`
- `assets/js/publications.js`
- `assets/js/wiki.js`
- `assets/js/wiki-entry.js`

## Design intent

- Preserve the existing static architecture and the Brownian / CG-MD background canvas.
- Add a single CSS override instead of rewriting `main.css`.
- Reduce typography scale, icon dominance, and glassmorphism intensity.
- Shift pages toward a low-key professor/lab-site aesthetic: serif typography, compact headers, direct chronological bibliography, dense wiki layout, and restrained paper-like cards only where useful.
- Keep `leisure.html` as the URL for minimal routing change, but replace the Rest Mode interface with `Literature Graph`.

## Literature engine notes

The literature page queries public metadata APIs directly from the browser. It supports topic/phrase/DOI searches, OpenAlex/Crossref/Semantic Scholar source selection, year limits, result deduplication, personal lens scoring, triage modes, inferred relation edges, a pruned canvas network, local paper inspection, browser-local saving, and Markdown shortlist export.

Because this is a client-side static page, API availability depends on public API rate limits and CORS behavior. The interface reports source-level errors in the status line rather than failing silently.

## Optional cleanup

After confirming that `leisure.html` is stable, you may delete the old unused `assets/js/leisure.js`. It is no longer referenced by the refreshed page.
