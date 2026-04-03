import { formatDOI, renderTagList, makeLinkButton } from './utils.js';

export function publicationCard(item, compact = false) {
  const article = document.createElement('article');
  article.className = `glass-card publication-card tilt-card${compact ? ' compact' : ''}`;
  article.dataset.reveal = '';

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const year = document.createElement('span');
  year.className = 'meta-chip';
  year.textContent = `${item.year}`;

  const venue = document.createElement('span');
  venue.className = 'meta-label';
  venue.textContent = item.venue;
  meta.append(year, venue);

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = item.title;

  const authors = document.createElement('p');
  authors.className = 'card-authors';
  authors.textContent = item.authors;

  const citation = document.createElement('p');
  citation.className = 'card-citation';
  citation.textContent = `${item.venue} · ${item.citation}`;

  const blurb = document.createElement('p');
  blurb.className = 'card-body';
  blurb.textContent = item.blurb;

  const tags = document.createElement('div');
  tags.className = 'tag-list';
  renderTagList(tags, item.tags);

  const actions = document.createElement('div');
  actions.className = 'button-row';
  actions.appendChild(makeLinkButton({ label: 'DOI', href: formatDOI(item.doi), kind: 'secondary' }));

  const nodes = [meta];

  if (!compact) {
    const figureShell = document.createElement('div');
    figureShell.className = 'publication-figure-shell';

    const placeholder = document.createElement('div');
    placeholder.className = 'publication-figure-placeholder';
    const slotPath = item.figure?.slot || `assets/img/publications/${item.id}.png`;
    placeholder.innerHTML = `
      <strong class="figure-slot-title">Figure slot ready</strong>
      <span class="figure-slot-path">${slotPath}</span>
      <span class="figure-slot-note">Place a PNG or JPG with this paper ID inside <code>assets/img/publications/</code>. The page will pick it up automatically.</span>
    `;
    placeholder.hidden = true;

    const img = document.createElement('img');
    img.className = 'publication-figure';
    img.alt = item.figure?.alt || `${item.title} figure preview`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.hidden = true;

    const figureNote = document.createElement('div');
    figureNote.className = 'publication-figure-note';
    figureNote.hidden = !item.figure?.caption;
    if (item.figure?.caption) figureNote.textContent = item.figure.caption;

    const preferred = item.figure?.src || `assets/img/publications/${item.id}.png`;
    const fallback = `assets/img/publications/${item.id}.jpg`;
    img.addEventListener('load', () => {
      img.hidden = false;
      placeholder.hidden = true;
      figureNote.hidden = !item.figure?.caption;
    });
    img.addEventListener('error', () => {
      if (img.dataset.triedFallback === 'true') {
        img.hidden = true;
        placeholder.hidden = false;
        figureNote.hidden = true;
        return;
      }
      img.dataset.triedFallback = 'true';
      img.src = fallback;
    });
    img.src = preferred;

    figureShell.append(img, placeholder, figureNote);
    nodes.push(figureShell);
  }

  nodes.push(title, authors, citation, blurb, tags, actions);
  article.append(...nodes);
  return article;
}

export function projectCard(project) {
  const article = document.createElement('article');
  article.className = 'glass-card repo-card tilt-card';
  article.dataset.reveal = '';

  const top = document.createElement('div');
  top.className = 'repo-topline';
  const category = document.createElement('span');
  category.className = 'meta-chip';
  category.textContent = project.category;
  const updated = document.createElement('span');
  updated.className = 'meta-label';
  updated.textContent = project.updated;
  top.append(category, updated);

  const brand = document.createElement('div');
  brand.className = 'repo-brand';
  if (project.logo) {
    const logo = document.createElement('img');
    logo.className = 'repo-logo';
    logo.src = project.logo;
    logo.alt = project.logoAlt || `${project.name} logo`;
    logo.loading = 'lazy';
    brand.appendChild(logo);
  }

  const brandCopy = document.createElement('div');
  brandCopy.className = 'repo-brand-copy';
  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = project.name;
  const headline = document.createElement('p');
  headline.className = 'repo-headline';
  headline.textContent = project.headline;
  brandCopy.append(title, headline);
  brand.appendChild(brandCopy);

  const summary = document.createElement('p');
  summary.className = 'card-body';
  summary.textContent = project.cardSummary;

  const tags = document.createElement('div');
  tags.className = 'tag-list';
  renderTagList(tags, [project.language, project.license, project.status]);

  const actions = document.createElement('div');
  actions.className = 'button-row';
  actions.append(
    makeLinkButton({ label: 'Repository', href: project.repoUrl, kind: 'secondary' }),
    makeLinkButton({ label: 'Wiki page', href: `wiki-entry.html?repo=${project.slug}`, kind: 'primary', external: false })
  );
  if (project.docsUrl && project.docsUrl !== project.repoUrl) {
    actions.appendChild(makeLinkButton({ label: 'Docs', href: project.docsUrl, kind: 'ghost' }));
  }

  article.append(top, brand, summary, tags, actions);
  return article;
}

export function renderSoftwareMap(container, projects, graph) {
  if (!container) return;
  container.innerHTML = '';
  const lookup = new Map(projects.map((project) => [project.id, project]));

  const shell = document.createElement('div');
  shell.className = 'software-map';

  const lanes = [
    ['pair-style-swas', 'gnm'],
    ['pilots'],
    ['impact', 'vela', 'channel']
  ];

  lanes.forEach((lane) => {
    const laneNode = document.createElement('div');
    laneNode.className = 'software-map-lane';
    lane.forEach((id) => {
      const project = lookup.get(id);
      if (!project) return;
      const node = document.createElement('a');
      node.className = 'software-node';
      node.href = `wiki-entry.html?repo=${project.slug}`;
      const logo = project.logo ? `<img class="software-node-logo" src="${project.logo}" alt="${project.logoAlt || project.name}" />` : '<span class="software-node-dot"></span>';
      node.innerHTML = `${logo}<span class="software-node-copy"><strong>${project.name}</strong><span>${project.category}</span></span>`;
      laneNode.appendChild(node);
    });
    shell.appendChild(laneNode);
  });

  const notes = document.createElement('div');
  notes.className = 'software-map-notes';
  graph.forEach((edge) => {
    const row = document.createElement('div');
    row.className = 'software-edge';
    const from = lookup.get(edge.from)?.name ?? edge.from;
    const to = lookup.get(edge.to)?.name ?? edge.to;
    row.innerHTML = `<span>${from}</span><em>${edge.label}</em><span>${to}</span>`;
    notes.appendChild(row);
  });

  container.append(shell, notes);
}

export function renderStats(container, stats) {
  if (!container) return;
  container.innerHTML = '';
  stats.forEach((stat) => {
    const item = document.createElement('div');
    item.className = 'stat-card glass-card';
    item.innerHTML = `<span class="stat-label">${stat.label}</span><strong class="stat-value">${stat.value}</strong>`;
    container.appendChild(item);
  });
}

export function renderCodeList(container, lines, baseId) {
  if (!container) return;
  container.innerHTML = '';
  lines.forEach((line, index) => {
    const block = document.createElement('div');
    block.className = 'code-block';
    const codeId = `${baseId}-${index}`;
    block.innerHTML = `
      <div class="code-block-top">
        <span>Command</span>
        <button type="button" class="copy-button" data-copy="#${codeId}">Copy</button>
      </div>
      <pre id="${codeId}"><code>${line}</code></pre>
    `;
    container.appendChild(block);
  });
}
