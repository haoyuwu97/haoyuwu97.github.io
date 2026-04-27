# V5 minimal patch

This patch targets the remaining layout and graph issues after the V4 research patch.

## Files changed

- `research.html`
- `wiki.html`
- `leisure.html`
- `assets/css/academic-refresh.css`
- `assets/js/research.js`
- `assets/js/literature.js`
- `assets/img/research/omiec-oect-hysteresis-toc.svg`
- `assets/img/research/vitrimer-polymer-physics-toc.svg`
- `assets/img/research/scientific-computing-toc.svg`

## Apply

```bash
unzip haoyuwu97-v5-layout-research-literature.zip
rsync -av haoyuwu97-v5-layout-research-literature/ ./
python3 -m http.server 8000
```

Check:

```text
http://localhost:8000/research.html
http://localhost:8000/wiki.html
http://localhost:8000/leisure.html
```

The HTML now uses `?v=20260427-v5` on the refreshed CSS and JS assets to avoid stale browser/module cache.
