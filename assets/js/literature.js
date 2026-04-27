import { activateNav, initReveal, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const STATE = {
  papers: [],
  nodes: [],
  edges: [],
  activeId: null,
  lastErrors: []
};

const META = {
  title: 'Literature Network | Haoyu Wu',
  description: 'A lightweight browser-based literature network search engine using OpenAlex, Crossref, and Semantic Scholar metadata.'
};

const SOURCE_LABELS = {
  openalex: 'OpenAlex',
  semantic: 'Semantic Scholar',
  crossref: 'Crossref'
};

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'over', 'under', 'using', 'use', 'uses', 'used',
  'study', 'studies', 'analysis', 'approach', 'toward', 'towards', 'molecular', 'simulation',
  'simulations', 'polymer', 'polymers', 'material', 'materials', 'model', 'models', 'dynamic',
  'dynamics', 'effect', 'effects', 'based', 'via', 'new', 'novel', 'this', 'that', 'were', 'are'
]);

const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function html(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeSpace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function stripMarkup(value = '') {
  return normalizeSpace(String(value).replace(/<[^>]*>/g, ' '));
}

function cleanDoi(value = '') {
  return normalizeSpace(value)
    .replace(/^https?:\/\/doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .replace(/[\s.]+$/g, '');
}

function looksLikeDoi(value = '') {
  return /^10\.\d{4,9}\/.+/i.test(cleanDoi(value));
}

function doiUrl(doi) {
  const clean = cleanDoi(doi);
  return clean ? `https://doi.org/${clean}` : '';
}

function asYear(value) {
  if (!value) return null;
  const match = String(value).match(/(19|20|21)\d{2}/);
  return match ? Number(match[0]) : null;
}

function yearFromCrossrefDate(dateParts) {
  const first = dateParts?.['date-parts']?.[0]?.[0];
  return first ? Number(first) : null;
}

function abstractFromInvertedIndex(index) {
  if (!index || typeof index !== 'object') return '';
  const words = [];
  Object.entries(index).forEach(([word, positions]) => {
    if (!Array.isArray(positions)) return;
    positions.forEach((position) => {
      words[position] = word;
    });
  });
  return normalizeSpace(words.filter(Boolean).join(' '));
}

function tokenize(text = '') {
  return normalizeSpace(text.toLowerCase())
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3 && !STOPWORDS.has(token))
    .slice(0, 24);
}

function initials(name = '') {
  return normalizeSpace(name)
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 3) || 'P';
}

function paperId(paper) {
  if (paper.doi) return `doi:${paper.doi.toLowerCase()}`;
  if (paper.sourceId) return `${paper.source}:${paper.sourceId}`;
  return `${paper.title}-${paper.year}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function normalizePaper(paper) {
  const normalized = {
    source: paper.source || 'metadata',
    sourceId: paper.sourceId || '',
    title: normalizeSpace(paper.title) || 'Untitled record',
    year: paper.year || null,
    venue: normalizeSpace(paper.venue) || '',
    authors: (paper.authors || []).map(normalizeSpace).filter(Boolean),
    doi: cleanDoi(paper.doi || ''),
    url: paper.url || doiUrl(paper.doi) || '',
    citations: Number.isFinite(Number(paper.citations)) ? Number(paper.citations) : null,
    references: Number.isFinite(Number(paper.references)) ? Number(paper.references) : null,
    abstract: stripMarkup(paper.abstract || ''),
    concepts: (paper.concepts || []).map(normalizeSpace).filter(Boolean),
    openAccessUrl: paper.openAccessUrl || '',
    raw: paper.raw || null
  };
  normalized.id = paperId(normalized);
  normalized.keywords = Array.from(new Set([
    ...tokenize(normalized.title),
    ...tokenize(normalized.abstract),
    ...normalized.concepts.map((concept) => concept.toLowerCase())
  ])).slice(0, 32);
  return normalized;
}

function normalizeOpenAlex(item) {
  const authors = (item.authorships || [])
    .map((entry) => entry?.author?.display_name)
    .filter(Boolean);
  const concepts = [
    ...(item.concepts || []).slice(0, 8).map((concept) => concept.display_name),
    ...(item.topics || []).slice(0, 4).map((topic) => topic.display_name)
  ].filter(Boolean);
  return normalizePaper({
    source: 'openalex',
    sourceId: item.id || item.openalex || '',
    title: item.display_name || item.title || '',
    year: item.publication_year || asYear(item.publication_date),
    venue: item.primary_location?.source?.display_name || item.host_venue?.display_name || '',
    authors,
    doi: item.doi || '',
    url: item.primary_location?.landing_page_url || item.doi || item.id || '',
    citations: item.cited_by_count,
    references: Array.isArray(item.referenced_works) ? item.referenced_works.length : null,
    abstract: abstractFromInvertedIndex(item.abstract_inverted_index),
    concepts,
    openAccessUrl: item.open_access?.oa_url || item.primary_location?.pdf_url || '',
    raw: item
  });
}

function normalizeSemantic(item) {
  return normalizePaper({
    source: 'semantic',
    sourceId: item.paperId || '',
    title: item.title || '',
    year: item.year || null,
    venue: item.venue || item.publicationVenue?.name || '',
    authors: (item.authors || []).map((author) => author.name).filter(Boolean),
    doi: item.externalIds?.DOI || '',
    url: item.url || item.openAccessPdf?.url || '',
    citations: item.citationCount,
    references: item.referenceCount,
    abstract: item.abstract || '',
    concepts: item.fieldsOfStudy || item.s2FieldsOfStudy?.map((field) => field.category) || [],
    openAccessUrl: item.openAccessPdf?.url || '',
    raw: item
  });
}

function normalizeCrossref(item) {
  const issued = yearFromCrossrefDate(item.issued)
    || yearFromCrossrefDate(item.published)
    || yearFromCrossrefDate(item['published-print'])
    || yearFromCrossrefDate(item['published-online']);
  const authors = (item.author || [])
    .map((author) => normalizeSpace(`${author.given || ''} ${author.family || ''}`))
    .filter(Boolean);
  return normalizePaper({
    source: 'crossref',
    sourceId: item.DOI || item.URL || '',
    title: item.title?.[0] || '',
    year: issued,
    venue: item['container-title']?.[0] || item.publisher || '',
    authors,
    doi: item.DOI || '',
    url: item.URL || doiUrl(item.DOI),
    citations: item['is-referenced-by-count'],
    references: item.reference?.length || item['reference-count'] || null,
    abstract: item.abstract || '',
    concepts: [item.subject].flat().filter(Boolean).slice(0, 8),
    openAccessUrl: '',
    raw: item
  });
}

async function fetchJson(url, label) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  return response.json();
}

function buildOpenAlexUrl(query, options) {
  const doi = cleanDoi(query);
  if (looksLikeDoi(doi)) return `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`;

  const url = new URL('https://api.openalex.org/works');
  url.searchParams.set('search', query);
  url.searchParams.set('per-page', '24');
  url.searchParams.set('sort', options.sort || 'relevance_score:desc');
  const filters = [];
  if (options.fromYear) filters.push(`from_publication_date:${options.fromYear}-01-01`);
  if (options.toYear) filters.push(`to_publication_date:${options.toYear}-12-31`);
  if (filters.length) url.searchParams.set('filter', filters.join(','));
  return url.toString();
}

async function searchOpenAlex(query, options) {
  const data = await fetchJson(buildOpenAlexUrl(query, options), 'OpenAlex');
  const items = Array.isArray(data.results) ? data.results : [data];
  return items.filter(Boolean).map(normalizeOpenAlex);
}

function buildSemanticUrl(query, options) {
  const fields = 'paperId,title,authors,year,venue,publicationVenue,externalIds,url,citationCount,referenceCount,abstract,isOpenAccess,openAccessPdf,fieldsOfStudy,s2FieldsOfStudy';
  const doi = cleanDoi(query);
  if (looksLikeDoi(doi)) {
    return `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=${encodeURIComponent(fields)}`;
  }
  const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
  url.searchParams.set('query', query);
  url.searchParams.set('limit', '24');
  url.searchParams.set('fields', fields);
  if (options.fromYear || options.toYear) {
    const start = options.fromYear || '';
    const end = options.toYear || '';
    url.searchParams.set('year', `${start}-${end}`);
  }
  return url.toString();
}

async function searchSemantic(query, options) {
  const data = await fetchJson(buildSemanticUrl(query, options), 'Semantic Scholar');
  const items = Array.isArray(data.data) ? data.data : [data];
  return items.filter(Boolean).map(normalizeSemantic);
}

function buildCrossrefUrl(query, options) {
  const doi = cleanDoi(query);
  if (looksLikeDoi(doi)) return `https://api.crossref.org/works/${encodeURIComponent(doi)}`;

  const url = new URL('https://api.crossref.org/works');
  url.searchParams.set('query.bibliographic', query);
  url.searchParams.set('rows', '24');
  url.searchParams.set('sort', options.sort === 'publication_year:desc' ? 'published' : 'score');
  url.searchParams.set('order', 'desc');
  const filters = [];
  if (options.fromYear) filters.push(`from-pub-date:${options.fromYear}-01-01`);
  if (options.toYear) filters.push(`until-pub-date:${options.toYear}-12-31`);
  if (filters.length) url.searchParams.set('filter', filters.join(','));
  return url.toString();
}

async function searchCrossref(query, options) {
  const data = await fetchJson(buildCrossrefUrl(query, options), 'Crossref');
  const items = Array.isArray(data.message?.items) ? data.message.items : [data.message].filter(Boolean);
  return items.map(normalizeCrossref);
}

function dedupePapers(papers) {
  const seen = new Map();
  papers.forEach((paper) => {
    const key = paper.doi ? `doi:${paper.doi.toLowerCase()}` : paper.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 96);
    const current = seen.get(key);
    if (!current) {
      seen.set(key, paper);
      return;
    }
    const merged = {
      ...current,
      ...paper,
      authors: current.authors.length >= paper.authors.length ? current.authors : paper.authors,
      abstract: current.abstract.length >= paper.abstract.length ? current.abstract : paper.abstract,
      concepts: Array.from(new Set([...current.concepts, ...paper.concepts])).slice(0, 12),
      keywords: Array.from(new Set([...current.keywords, ...paper.keywords])).slice(0, 32),
      citations: Math.max(current.citations || 0, paper.citations || 0) || current.citations || paper.citations,
      references: Math.max(current.references || 0, paper.references || 0) || current.references || paper.references,
      source: `${current.source}+${paper.source}`
    };
    merged.id = paperId(merged);
    seen.set(key, merged);
  });
  return [...seen.values()]
    .filter((paper) => paper.title && paper.title !== 'Untitled record')
    .slice(0, 36);
}

function scorePair(a, b) {
  const reasons = [];
  let score = 0;
  const aAuthors = new Set(a.authors.map((author) => author.toLowerCase()));
  const sharedAuthors = b.authors.filter((author) => aAuthors.has(author.toLowerCase()));
  if (sharedAuthors.length) {
    score += 3 + Math.min(sharedAuthors.length, 3);
    reasons.push(`shared author: ${sharedAuthors.slice(0, 2).join(', ')}`);
  }
  if (a.venue && b.venue && a.venue.toLowerCase() === b.venue.toLowerCase()) {
    score += 1.4;
    reasons.push(`same venue: ${a.venue}`);
  }
  const aKeys = new Set(a.keywords);
  const sharedKeywords = b.keywords.filter((key) => aKeys.has(key));
  if (sharedKeywords.length) {
    score += Math.min(sharedKeywords.length * 0.45, 2.8);
    reasons.push(`shared terms: ${sharedKeywords.slice(0, 4).join(', ')}`);
  }
  if (a.year && b.year && Math.abs(a.year - b.year) <= 1 && sharedKeywords.length >= 2) {
    score += 0.7;
    reasons.push('nearby publication years');
  }
  return { score, reasons };
}

function buildNetwork(papers) {
  const canvas = $('lit-network');
  const width = canvas?.clientWidth || 760;
  const height = canvas?.clientHeight || 360;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(90, Math.min(width, height) * 0.36);
  const selected = papers.slice(0, 22);
  const nodes = selected.map((paper, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(selected.length, 1);
    const citationScale = Math.log10((paper.citations || 0) + 1);
    return {
      id: paper.id,
      paper,
      x: cx + Math.cos(angle) * radius * (0.78 + (index % 3) * 0.11),
      y: cy + Math.sin(angle) * radius * (0.78 + ((index + 1) % 3) * 0.11),
      vx: 0,
      vy: 0,
      r: clamp(7 + citationScale * 2.4, 7, 18)
    };
  });

  const edges = [];
  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) {
      const result = scorePair(selected[i], selected[j]);
      if (result.score >= 1.35) {
        edges.push({ source: selected[i].id, target: selected[j].id, weight: result.score, reasons: result.reasons });
      }
    }
  }
  STATE.nodes = nodes;
  STATE.edges = edges.sort((a, b) => b.weight - a.weight).slice(0, 70);
  runLayout(70);
}

function runLayout(iterations = 60) {
  const canvas = $('lit-network');
  if (!canvas) return;
  const width = canvas.clientWidth || 760;
  const height = canvas.clientHeight || 360;
  const nodeMap = new Map(STATE.nodes.map((node) => [node.id, node]));

  for (let step = 0; step < iterations; step += 1) {
    for (let i = 0; i < STATE.nodes.length; i += 1) {
      for (let j = i + 1; j < STATE.nodes.length; j += 1) {
        const a = STATE.nodes[i];
        const b = STATE.nodes[j];
        const dx = a.x - b.x || 0.01;
        const dy = a.y - b.y || 0.01;
        const dist2 = dx * dx + dy * dy;
        const force = Math.min(1400 / dist2, 0.32);
        a.vx += dx * force;
        a.vy += dy * force;
        b.vx -= dx * force;
        b.vy -= dy * force;
      }
    }
    STATE.edges.forEach((edge) => {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const target = 92 + Math.max(0, 5 - edge.weight) * 18;
      const force = (dist - target) * 0.004 * clamp(edge.weight, 1, 5);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    });
    STATE.nodes.forEach((node) => {
      node.vx += (width / 2 - node.x) * 0.004;
      node.vy += (height / 2 - node.y) * 0.004;
      node.x = clamp(node.x + node.vx, 24, width - 24);
      node.y = clamp(node.y + node.vy, 24, height - 24);
      node.vx *= 0.72;
      node.vy *= 0.72;
    });
  }
  drawNetwork();
}

function drawNetwork() {
  const canvas = $('lit-network');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const styles = getComputedStyle(document.documentElement);
  const muted = styles.getPropertyValue('--academic-muted').trim() || '#6d7480';
  const accent = styles.getPropertyValue('--academic-accent').trim() || '#8b6f3d';
  const ink = styles.getPropertyValue('--academic-ink').trim() || '#17202a';
  const nodeMap = new Map(STATE.nodes.map((node) => [node.id, node]));

  ctx.save();
  ctx.lineCap = 'round';
  STATE.edges.forEach((edge) => {
    const a = nodeMap.get(edge.source);
    const b = nodeMap.get(edge.target);
    if (!a || !b) return;
    const active = STATE.activeId && (STATE.activeId === a.id || STATE.activeId === b.id);
    ctx.globalAlpha = active ? 0.58 : 0.18;
    ctx.strokeStyle = active ? accent : muted;
    ctx.lineWidth = active ? 1.8 : clamp(edge.weight * 0.35, 0.6, 1.5);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });
  ctx.restore();

  STATE.nodes.forEach((node) => {
    const active = node.id === STATE.activeId;
    const connected = STATE.activeId && STATE.edges.some((edge) =>
      (edge.source === STATE.activeId && edge.target === node.id) ||
      (edge.target === STATE.activeId && edge.source === node.id)
    );
    ctx.save();
    ctx.globalAlpha = STATE.activeId && !active && !connected ? 0.45 : 1;
    ctx.beginPath();
    ctx.fillStyle = active ? accent : 'rgba(255, 253, 248, 0.92)';
    ctx.strokeStyle = active ? accent : muted;
    ctx.lineWidth = active ? 2.2 : 1.1;
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? '#ffffff' : ink;
    ctx.font = '10px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(node.paper.authors[0] || node.paper.title), node.x, node.y + 0.5);
    ctx.restore();
  });

  if (STATE.nodes.length) {
    ctx.save();
    ctx.fillStyle = muted;
    ctx.font = '12px "Times New Roman", serif';
    ctx.textAlign = 'left';
    const label = STATE.activeId
      ? 'Edges indicate shared authors, venues, or semantic terms.'
      : 'Select a node to inspect metadata and local relations.';
    ctx.fillText(label, 14, rect.height - 14);
    ctx.restore();
  }
}

function sourceBadge(source) {
  return source.split('+').map((value) => SOURCE_LABELS[value] || value).join(' + ');
}

function shortAuthors(paper) {
  if (!paper.authors.length) return 'Authors unavailable';
  if (paper.authors.length <= 3) return paper.authors.join(', ');
  return `${paper.authors.slice(0, 3).join(', ')} et al.`;
}

function renderResults() {
  const container = $('lit-results');
  if (!container) return;
  if (!STATE.papers.length) {
    container.innerHTML = '<div class="lit-result"><h3>No papers loaded</h3><p>Run a search to build the bibliography and relation graph.</p></div>';
    return;
  }
  container.innerHTML = STATE.papers.map((paper, index) => `
    <article class="lit-result${paper.id === STATE.activeId ? ' is-active' : ''}" data-paper-id="${html(paper.id)}" tabindex="0">
      <h3>${index + 1}. ${html(paper.title)}</h3>
      <p>${html(shortAuthors(paper))}${paper.year ? ` · ${paper.year}` : ''}${paper.venue ? ` · <em>${html(paper.venue)}</em>` : ''}</p>
      ${paper.abstract ? `<p>${html(paper.abstract).slice(0, 420)}${paper.abstract.length > 420 ? '…' : ''}</p>` : ''}
      <div class="lit-score-row">
        <span>${html(sourceBadge(paper.source))}</span>
        ${paper.citations !== null ? `<span>${paper.citations} citations</span>` : ''}
        ${paper.references !== null ? `<span>${paper.references} references</span>` : ''}
        ${paper.doi ? `<a href="${html(doiUrl(paper.doi))}" target="_blank" rel="noreferrer noopener">DOI</a>` : ''}
        ${paper.openAccessUrl ? `<a href="${html(paper.openAccessUrl)}" target="_blank" rel="noreferrer noopener">open access</a>` : ''}
        ${paper.url && !paper.doi ? `<a href="${html(paper.url)}" target="_blank" rel="noreferrer noopener">record</a>` : ''}
      </div>
    </article>
  `).join('');
  container.querySelectorAll('.lit-result[data-paper-id]').forEach((card) => {
    const select = () => selectPaper(card.dataset.paperId);
    card.addEventListener('click', select);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  });
}

function renderDetail(paper) {
  const container = $('lit-paper-detail');
  if (!container) return;
  if (!paper) {
    container.textContent = 'Select a paper node or result to inspect metadata.';
    return;
  }
  const related = STATE.edges
    .filter((edge) => edge.source === paper.id || edge.target === paper.id)
    .slice(0, 5)
    .map((edge) => {
      const otherId = edge.source === paper.id ? edge.target : edge.source;
      const other = STATE.nodes.find((node) => node.id === otherId)?.paper;
      if (!other) return '';
      return `<li><strong>${html(other.title)}</strong><br><span>${html(edge.reasons.join('; '))}</span></li>`;
    })
    .filter(Boolean);

  container.innerHTML = `
    <h3>${html(paper.title)}</h3>
    <p>${html(shortAuthors(paper))}${paper.year ? ` · ${paper.year}` : ''}${paper.venue ? ` · ${html(paper.venue)}` : ''}</p>
    <p>${paper.citations !== null ? `${paper.citations} citations` : 'Citation count unavailable'}${paper.references !== null ? ` · ${paper.references} references` : ''} · ${html(sourceBadge(paper.source))}</p>
    ${paper.concepts.length ? `<p><strong>Concepts:</strong> ${html(paper.concepts.slice(0, 8).join(', '))}</p>` : ''}
    ${paper.abstract ? `<p>${html(paper.abstract).slice(0, 650)}${paper.abstract.length > 650 ? '…' : ''}</p>` : ''}
    ${related.length ? `<p><strong>Local relations</strong></p><ul>${related.join('')}</ul>` : '<p>No strong local relation edge was inferred among the displayed papers.</p>'}
  `;
}

function selectPaper(id) {
  STATE.activeId = id;
  const paper = STATE.papers.find((item) => item.id === id);
  renderResults();
  renderDetail(paper);
  drawNetwork();
}

function clickNetwork(event) {
  const canvas = $('lit-network');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  let best = null;
  let bestDistance = Infinity;
  STATE.nodes.forEach((node) => {
    const distance = Math.hypot(node.x - x, node.y - y);
    if (distance < bestDistance && distance <= node.r + 8) {
      best = node;
      bestDistance = distance;
    }
  });
  if (best) selectPaper(best.id);
}

function getOptions() {
  return {
    source: $('lit-source')?.value || 'openalex',
    sort: $('lit-sort')?.value || 'relevance_score:desc',
    fromYear: $('lit-from')?.value ? Number($('lit-from').value) : null,
    toYear: $('lit-to')?.value ? Number($('lit-to').value) : null
  };
}

function setStatus(message, errors = []) {
  const node = $('lit-status');
  if (!node) return;
  const suffix = errors.length ? ` Source notes: ${errors.join(' · ')}` : '';
  node.textContent = `${message}${suffix}`;
}

async function runSearch(event) {
  event?.preventDefault();
  const query = normalizeSpace($('lit-query')?.value || '');
  if (!query) {
    setStatus('Enter a topic, DOI, author, or phrase before searching.');
    return;
  }
  const options = getOptions();
  const sourceOrder = options.source === 'all' ? ['openalex', 'crossref', 'semantic'] : [options.source];
  STATE.lastErrors = [];
  STATE.activeId = null;
  setStatus(`Searching ${sourceOrder.map((source) => SOURCE_LABELS[source]).join(', ')} for “${query}”…`);

  const collected = [];
  for (const source of sourceOrder) {
    try {
      if (source === 'openalex') collected.push(...await searchOpenAlex(query, options));
      if (source === 'semantic') collected.push(...await searchSemantic(query, options));
      if (source === 'crossref') collected.push(...await searchCrossref(query, options));
    } catch (error) {
      STATE.lastErrors.push(`${SOURCE_LABELS[source]}: ${error.message}`);
    }
  }

  STATE.papers = dedupePapers(collected);
  if (!STATE.papers.length) {
    renderResults();
    buildNetwork([]);
    renderDetail(null);
    setStatus('No usable records were returned.', STATE.lastErrors);
    return;
  }

  const sort = options.sort;
  if (sort === 'publication_year:desc') {
    STATE.papers.sort((a, b) => (b.year || 0) - (a.year || 0));
  } else if (sort === 'cited_by_count:desc') {
    STATE.papers.sort((a, b) => (b.citations || 0) - (a.citations || 0));
  }

  buildNetwork(STATE.papers);
  renderResults();
  selectPaper(STATE.papers[0].id);
  setStatus(`Loaded ${STATE.papers.length} deduplicated records and ${STATE.edges.length} inferred relation edges.`, STATE.lastErrors);
}

function exportList() {
  if (!STATE.papers.length) {
    setStatus('Nothing to copy yet. Run a search first.');
    return;
  }
  const text = STATE.papers.map((paper, index) => {
    const keyAuthor = (paper.authors[0] || 'paper').split(/\s+/).at(-1)?.replace(/[^A-Za-z0-9]/g, '') || 'paper';
    const key = `${keyAuthor}${paper.year || 'nd'}_${index + 1}`;
    return `@article{${key},\n  title = {${paper.title}},\n  author = {${paper.authors.join(' and ')}},\n  year = {${paper.year || ''}},\n  journal = {${paper.venue || ''}},\n  doi = {${paper.doi || ''}},\n  url = {${paper.url || doiUrl(paper.doi) || ''}},\n  note = {Metadata source: ${sourceBadge(paper.source)}}\n}`;
  }).join('\n\n');

  navigator.clipboard?.writeText(text)
    .then(() => setStatus(`Copied ${STATE.papers.length} BibTeX-like records to clipboard.`, STATE.lastErrors))
    .catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      setStatus(`Copied ${STATE.papers.length} BibTeX-like records to clipboard.`, STATE.lastErrors);
    });
}

function initExamples() {
  document.querySelectorAll('[data-example]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = $('lit-query');
      if (!input) return;
      input.value = button.dataset.example || '';
      runSearch();
    });
  });
}

function initLiteraturePage() {
  setMeta(META);
  activateNav('leisure');
  smoothScrollForHashes();
  initReveal();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'subtle', density: 0.58 });

  $('lit-form')?.addEventListener('submit', runSearch);
  $('lit-export')?.addEventListener('click', exportList);
  $('lit-fit')?.addEventListener('click', () => {
    runLayout(90);
    setStatus(`Re-laid out ${STATE.nodes.length} paper nodes and ${STATE.edges.length} edges.`, STATE.lastErrors);
  });
  $('lit-network')?.addEventListener('click', clickNetwork);
  window.addEventListener('resize', () => {
    if (STATE.papers.length) buildNetwork(STATE.papers);
  });
  initExamples();
  renderResults();
  drawNetwork();
}

document.addEventListener('DOMContentLoaded', initLiteraturePage);
