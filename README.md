# Apply this patch

From the repository root:

```bash
unzip haoyuwu97-v8-literature-publication-fix.zip
rsync -av haoyuwu97-v8-literature-publication-fix/ ./
python3 -m http.server 8000
```

Check:

```text
http://localhost:8000/leisure.html
http://localhost:8000/publications.html
```

Then commit:

```bash
git add leisure.html publications.html assets/css/academic-refresh.css assets/js/literature.js assets/js/publications.js
git commit -m "Improve literature bubble map and complete publications"
git push
```

Use a hard refresh if the browser still serves cached JavaScript:

```text
Cmd/Ctrl + Shift + R
```
