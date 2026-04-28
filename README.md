# V6 compact research / wiki / literature patch

Apply from the repository root:

```bash
rsync -av haoyuwu97-v6-compact-research-wiki-literature/ ./
python3 -m http.server 8000
```

Check:

- `http://localhost:8000/research.html`
- `http://localhost:8000/wiki.html`
- `http://localhost:8000/leisure.html`

The HTML files reference `academic-refresh.css?v=20260427-v6` and page JS with the same version suffix to avoid stale browser cache.

Commit:

```bash
git add research.html wiki.html leisure.html \
  assets/css/academic-refresh.css \
  assets/js/research.js assets/js/wiki.js assets/js/literature.js

git commit -m "Compact subpage headers and literature bubble map"
git push
```
