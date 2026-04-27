# Apply V3 Patch

From your local repository root:

```bash
unzip haoyuwu97-academic-refresh-v3.zip
rsync -av haoyuwu97-academic-refresh-v3/ ./
python3 -m http.server 8000
```

Preview:

```text
http://localhost:8000/
http://localhost:8000/research.html
http://localhost:8000/wiki.html
http://localhost:8000/wiki-entry.html?project=pilots
http://localhost:8000/leisure.html
```

Commit:

```bash
git status
git diff
git add index.html research.html wiki.html \
  assets/css/academic-refresh.css \
  assets/js/home.js assets/js/research.js assets/js/wiki.js assets/js/wiki-entry.js assets/js/literature.js
git commit -m "Refine academic homepage research wiki and literature map"
git push
```

This patch intentionally keeps the route structure unchanged. The literature engine still lives at `leisure.html` so no navigation or deployment rewrite is required.
