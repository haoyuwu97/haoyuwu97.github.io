# V7 minimal patch: compact top clearance, research titles, wiki copy, and bubble map

Apply from the repository root:

```bash
unzip haoyuwu97-v7-research-wiki-literature-fix.zip
rsync -av haoyuwu97-v7-research-wiki-literature-fix/ ./
python3 -m http.server 8000
```

Check:

```text
http://localhost:8000/research.html
http://localhost:8000/wiki.html
http://localhost:8000/wiki-entry.html?project=pilots
http://localhost:8000/wiki-entry.html?project=channel
http://localhost:8000/leisure.html
```

Files touched:

```text
research.html
wiki.html
wiki-entry.html
leisure.html
assets/css/academic-refresh.css
assets/js/research.js
assets/js/wiki.js
assets/js/wiki-entry.js
assets/js/literature.js
```
