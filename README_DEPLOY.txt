GitHub Pages deployment notes for haoyuwu97.github.io
====================================================

1. Back up your current repository state first.
2. Copy every file and folder from this package into the root of your haoyuwu97.github.io repository.
3. Commit and push.
4. GitHub Pages should publish automatically because this is a plain static site.

Main files
----------
- index.html                : redesigned landing page
- publications.html         : searchable / filterable publications page
- wiki.html                 : paginated software atlas
- wiki-entry.html           : per-repository detail page
- leisure.html              : random playable rest page with 5 endless mini-games
- assets/css/main.css       : full visual system + day/night theme
- assets/js/site-data.js    : editable content source (profile, publications, software, games)
- assets/js/theme.js        : local-time auto theme + manual toggle
- assets/js/background.js   : CG-polymer-chain animated field

Fast content edits
------------------
- Add/edit publications in assets/js/site-data.js -> publications
- Add/edit repository wiki entries in assets/js/site-data.js -> softwareProjects
- Update profile links, title, summary, and portrait path in assets/js/site-data.js -> profile

Notes
-----
- .nojekyll is included so GitHub Pages serves files exactly as written.
- favicon.svg, robots.txt, sitemap.xml, and 404.html are included.
- The site uses no frameworks and no build step.
