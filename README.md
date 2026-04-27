# Research V4 minimal patch

This patch only changes the Research page.

Files changed:

- `research.html`
- `assets/js/research.js`
- `assets/css/academic-refresh.css`
- `assets/img/research/omiec-oect-hysteresis-toc.svg`
- `assets/img/research/vitrimer-polymer-physics-toc.svg`
- `assets/img/research/scientific-computing-toc.svg`

Apply from the repository root:

```bash
unzip haoyuwu97-research-v4-minimal.zip
rsync -av haoyuwu97-research-v4-minimal/ ./
python3 -m http.server 8000
```

Then inspect `http://localhost:8000/research.html`.
