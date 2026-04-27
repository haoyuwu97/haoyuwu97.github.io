import { activateNav, initReveal, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const STATE = {
  papers: [],
  nodes: [],
  edges: [],
  activeId: null,
  lastErrors: [],
  lensTerms: [],
  saved: []
};

const STORAGE_KEY = 'haoyu-literature-graph-library-v1';

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

function hashString(value = '') {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function truncate(value = '', max = 58) {
  const text = normalizeSpace(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function loadSavedLibrary() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    STATE.saved = Array.isArray(data) ? data : [];
  } catch {
    STATE.saved = [];
  }
}

function saveLibrary() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE.saved.slice(0, 80)));
  } catch {}
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

function parseLensTerms(value = '') {
  return Array.from(new Set(
    String(value)
      .split(/[,;|]/)
      .map((term) => normalizeSpace(term.toLowerCase()))
      .filter((term) => term.length > 2)
  )).slice(0, 16);
}

function lensScore(paper, terms = STATE.lensTerms) {
  if (!terms.length) return { score: 0, hits: [] };
  const title = ` ${paper.title.toLowerCase()} `;
  const abstract = ` ${paper.abstract.toLowerCase()} `;
  const concepts = ` ${paper.concepts.join(' ').toLowerCase()} `;
  const keywords = new Set(paper.keywords || []);
  const hits = [];
  let score = 0;
  terms.forEach((term) => {
    const simple = term.replace(/[^a-z0-9]+/g, ' ').trim();
    if (!simple) return;
    let local = 0;
    if (title.includes(simple)) local += 3.2;
    if (concepts.includes(simple)) local += 2.2;
    if (abstract.includes(simple)) local += 1.2;
    simple.split(/\s+/).forEach((part) => {
      if (part.length > 3 && keywords.has(part)) local += 0.55;
    });
    if (local > 0) {
      score += local;
      hits.push(term);
    }
  });
  return { score: Math.round(score * 10) / 10, hits: hits.slice(0, 5) };
}

function annotateLens(papers, terms = STATE.lensTerms) {
  papers.forEach((paper) => {
    const result = lensScore(paper, terms);
    paper.lensScore = result.score;
    paper.lensHits = result.hits;
  });
}

function triageScore(paper, mode = 'balanced') {
  const currentYear = new Date().getFullYear();
  const citation = Math.log10((paper.citations || 0) + 1) * 2.4;
  const age = paper.year ? Math.max(0, currentYear - paper.year) : 12;
  const freshness = paper.year ? Math.max(0, 8 - age) * 0.55 : 0;
  const lens = paper.lensScore || 0;
  const metadata = (paper.doi ? 0.8 : 0) + (paper.abstract ? 0.5 : 0) + (paper.authors.length ? 0.25 : 0);
  if (mode === 'canonical') return citation * 2.2 + lens * 0.8 + metadata;
  if (mode === 'recent') return freshness * 2.1 + lens * 1.2 + citation * 0.35 + metadata;
  if (mode === 'mechanism') return lens * 2.25 + citation * 0.65 + metadata;
  return lens * 1.25 + citation + freshness * 0.75 + metadata;
}

function applyTriage(papers, options) {
  const mode = options.mode || 'balanced';
  papers.forEach((paper) => { paper.triageScore = triageScore(paper, mode); });
  if (mode !== 'balanced' || STATE.lensTerms.length) {
    papers.sort((a, b) => (b.triageScore || 0) - (a.triageScore || 0) || (b.citations || 0) - (a.citations || 0));
  }
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

function relationType(edge) {
  const reason = edge.reasons.join(' ').toLowerCase();
  if (reason.includes('shared author')) return 'author';
  if (reason.includes('venue')) return 'venue';
  return 'semantic';
}

function compactEdgeSet(edges, nodeIds) {
  const byNode = new Map(nodeIds.map((id) => [id, 0]));
  const sorted = [...edges].sort((a, b) => b.weight - a.weight);
  const kept = [];
  sorted.forEach((edge) => {
    const aDegree = byNode.get(edge.source) || 0;
    const bDegree = byNode.get(edge.target) || 0;
    const strong = edge.weight >= 3.2;
    if (kept.length < 24 && (strong || (aDegree < 4 && bDegree < 4))) {
      kept.push(edge);
      byNode.set(edge.source, aDegree + 1);
      byNode.set(edge.target, bDegree + 1);
    }
  });
  return kept;
}

function activeNodeId() {
  return STATE.activeId || STATE.nodes[0]?.id || null;
}

function edgeOther(edge, id) {
  return edge.source === id ? edge.target : edge.source;
}

function activeRelations(limit = 8) {
  const id = activeNodeId();
  if (!id) return [];
  return STATE.edges
    .filter((edge) => edge.source === id || edge.target === id)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

function buildNetwork(papers) {
  const selected = papers.slice(0, 18);
  const maxLens = Math.max(1, ...selected.map((paper) => paper.lensScore || 0));

  const nodes = selected.map((paper, index) => {
    const citationScale = Math.log10((paper.citations || 0) + 1);
    const lensBoost = (paper.lensScore || 0) / maxLens;
    return {
      id: paper.id,
      paper,
      index: index + 1,
      x: -999,
      y: -999,
      vx: 0,
      vy: 0,
      visible: false,
      role: 'hidden',
      r: clamp(9 + citationScale * 1.3 + lensBoost * 1.8, 9, 15)
    };
  });

  const candidateEdges = [];
  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) {
      const result = scorePair(selected[i], selected[j]);
      const lensOverlap = (selected[i].lensHits || []).filter((hit) => (selected[j].lensHits || []).includes(hit));
      if (lensOverlap.length) {
        result.score += Math.min(lensOverlap.length * 0.9, 2.4);
        result.reasons.push(`same lens: ${lensOverlap.slice(0, 3).join(', ')}`);
      }
      if (result.score >= 1.8) {
        candidateEdges.push({ source: selected[i].id, target: selected[j].id, weight: result.score, reasons: result.reasons });
      }
    }
  }

  STATE.nodes = nodes;
  STATE.edges = compactEdgeSet(candidateEdges, nodes.map((node) => node.id));
  if (!STATE.activeId && nodes.length) STATE.activeId = nodes[0].id;
  layoutNetworkForActive();
  drawNetwork();
}

function layoutNetworkForActive() {
  const canvas = $('lit-network');
  if (!canvas) return;
  const width = canvas.clientWidth || 760;
  const height = canvas.clientHeight || 430;
  const nodeMap = new Map(STATE.nodes.map((node) => [node.id, node]));
  const id = activeNodeId();

  STATE.nodes.forEach((node) => {
    node.visible = false;
    node.role = 'hidden';
    node.x = -999;
    node.y = -999;
  });

  if (!id) {
    STATE.layoutEdges = [];
    return;
  }

  const active = nodeMap.get(id);
  if (!active) {
    STATE.layoutEdges = [];
    return;
  }

  const relations = activeRelations(width < 560 ? 6 : 8);
  const relatedIds = relations.map((edge) => edgeOther(edge, id));
  let relatedNodes = relatedIds.map((otherId) => nodeMap.get(otherId)).filter(Boolean);
  let layoutEdges = relations;

  if (!relatedNodes.length) {
    relatedNodes = STATE.nodes.filter((node) => node.id !== id).slice(0, width < 560 ? 5 : 7);
    layoutEdges = relatedNodes.map((node) => ({
      source: id,
      target: node.id,
      weight: 0,
      reasons: ['shortlist neighbor; no strong metadata edge inferred']
    }));
  }

  const top = 68;
  const bottom = 38;
  const usable = Math.max(120, height - top - bottom);
  const activeX = clamp(width * 0.22, 76, 132);
  const relatedX = clamp(width * 0.67, 245, width - 130);

  active.visible = true;
  active.role = 'active';
  active.x = activeX;
  active.y = clamp(height * 0.52, top + 30, height - bottom - 30);
  active.r = Math.max(active.r, 15);

  relatedNodes.forEach((node, index) => {
    const count = relatedNodes.length;
    const y = top + ((index + 0.5) / Math.max(count, 1)) * usable;
    node.visible = true;
    node.role = layoutEdges[index]?.weight ? 'related' : 'fallback';
    node.x = relatedX;
    node.y = clamp(y, top + node.r, height - bottom - node.r);
  });

  STATE.layoutEdges = layoutEdges;
}

function runLayout() {
  layoutNetworkForActive();
  drawNetwork();
}

function drawText(ctx, text, x, y, maxChars, options = {}) {
  const value = truncate(text, maxChars);
  ctx.save();
  ctx.font = options.font || '12px "Times New Roman", serif';
  ctx.fillStyle = options.color || '#17202a';
  ctx.textAlign = options.align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(value, x, y);
  ctx.restore();
}

function drawPill(ctx, text, x, y, options = {}) {
  const value = truncate(text, options.maxChars || 28);
  ctx.save();
  ctx.font = options.font || '11px "Times New Roman", serif';
  const w = Math.min(options.maxWidth || 210, ctx.measureText(value).width + 14);
  const h = 20;
  ctx.globalAlpha = options.alpha || 0.94;
  ctx.fillStyle = options.fill || 'rgba(255, 253, 248, 0.92)';
  ctx.strokeStyle = options.stroke || 'rgba(101, 86, 61, 0.22)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, 9);
  else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = options.color || '#5e6875';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x + 7, y + h / 2);
  ctx.restore();
  return w;
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
  const active = nodeMap.get(activeNodeId());

  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
  gradient.addColorStop(0, 'rgba(255,253,248,0.78)');
  gradient.addColorStop(1, 'rgba(237,242,247,0.48)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(101, 86, 61, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.max(168, rect.width * 0.36), 24);
  ctx.lineTo(Math.max(168, rect.width * 0.36), rect.height - 26);
  ctx.stroke();
  ctx.restore();

  if (!STATE.nodes.length) {
    drawText(ctx, 'Run a search to build an ego-centered relation map.', 18, 22, 72, {
      color: muted,
      font: '13px "Times New Roman", serif'
    });
    return;
  }

  const layoutEdges = STATE.layoutEdges || activeRelations(8);

  if (active) {
    drawPill(ctx, 'selected paper', 16, 16, { fill: 'rgba(255,253,248,0.95)', color: accent, maxWidth: 140 });
    drawText(ctx, `#${active.index} ${active.paper.title}`, 18, 42, rect.width < 560 ? 42 : 66, {
      color: ink,
      font: '700 12px "Times New Roman", serif'
    });
  }

  ctx.save();
  ctx.lineCap = 'round';
  layoutEdges.forEach((edge, edgeIndex) => {
    const a = nodeMap.get(edge.source);
    const b = nodeMap.get(edge.target);
    if (!a || !b || !a.visible || !b.visible) return;
    const source = a.id === active?.id ? a : b;
    const target = a.id === active?.id ? b : a;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.hypot(dx, dy) || 1;
    const curve = (edgeIndex % 2 ? 1 : -1) * Math.min(28, 220 / dist);
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const cx = midX - (dy / dist) * curve;
    const cy = midY + (dx / dist) * curve;
    const semantic = edge.weight > 0;
    ctx.globalAlpha = semantic ? 0.58 : 0.22;
    ctx.strokeStyle = semantic ? accent : muted;
    ctx.lineWidth = semantic ? clamp(edge.weight * 0.32, 1.1, 2.4) : 0.9;
    if (!semantic) ctx.setLineDash([4, 5]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.quadraticCurveTo(cx, cy, target.x, target.y);
    ctx.stroke();
  });
  ctx.restore();

  layoutEdges.forEach((edge, edgeIndex) => {
    const other = nodeMap.get(edgeOther(edge, active?.id));
    if (!other?.visible) return;
    const reason = edge.reasons?.[0] || 'metadata relation';
    const tag = edge.weight ? `${relationType(edge)} · ${reason}` : 'shortlist context';
    const y = other.y + other.r + 6;
    drawPill(ctx, tag, other.x + other.r + 8, y, {
      maxChars: rect.width < 560 ? 22 : 34,
      maxWidth: Math.max(96, rect.width - other.x - other.r - 20),
      fill: edge.weight ? 'rgba(255,253,248,0.9)' : 'rgba(246,248,250,0.72)',
      color: edge.weight ? accent : muted,
      alpha: 0.9
    });
  });

  STATE.nodes.filter((node) => node.visible).forEach((node) => {
    const activeNode = node.id === active?.id;
    const fallback = node.role === 'fallback';
    ctx.save();
    if (node.paper.lensScore && !activeNode) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(139,111,61,0.08)';
      ctx.arc(node.x, node.y, node.r + 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.fillStyle = activeNode ? accent : fallback ? 'rgba(247,248,250,0.98)' : 'rgba(255, 253, 248, 0.98)';
    ctx.strokeStyle = activeNode ? accent : 'rgba(94,104,117,0.68)';
    ctx.lineWidth = activeNode ? 2.1 : 1.05;
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = activeNode ? '#ffffff' : ink;
    ctx.font = activeNode ? '700 11.5px "Times New Roman", serif' : '700 10px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(node.index), node.x, node.y + 0.25);
    ctx.restore();

    if (!activeNode) {
      const labelX = node.x + node.r + 8;
      const max = rect.width < 560 ? 26 : 43;
      drawText(ctx, `#${node.index} ${node.paper.title}`, labelX, node.y - 15, max, {
        color: ink,
        font: '700 11.5px "Times New Roman", serif'
      });
      const meta = `${node.paper.year || 'n.d.'}${node.paper.venue ? ` · ${node.paper.venue}` : ''}`;
      drawText(ctx, meta, labelX, node.y - 1, rect.width < 560 ? 24 : 38, {
        color: muted,
        font: '11px "Times New Roman", serif'
      });
    }
  });

  ctx.save();
  ctx.fillStyle = muted;
  ctx.font = '11.5px "Times New Roman", serif';
  ctx.textAlign = 'left';
  const relationCount = (STATE.layoutEdges || []).filter((edge) => edge.weight > 0).length;
  const label = relationCount
    ? 'Ego map: edges explain the selected paper; click a result or node to recenter.'
    : 'No strong metadata edges for this paper; showing shortlist neighbors as context.';
  ctx.fillText(label, 14, rect.height - 14);
  ctx.restore();
}

function sourceBadge(source) {
  return source.split('+').map((value) => SOURCE_LABELS[value] || value).join(' + ');
}

function shortAuthors(paper) {
  if (!paper.authors.length) return 'Authors unavailable';
  if (paper.authors.length <= 3) return paper.authors.join(', ');
  return `${paper.authors.slice(0, 3).join(', ')} et al.`;
}

function paperById(id) {
  return STATE.papers.find((paper) => paper.id === id);
}

function relationDegree(paper) {
  return STATE.edges.filter((edge) => edge.source === paper.id || edge.target === paper.id).length;
}

function topLensTerms() {
  const counts = new Map();
  STATE.papers.forEach((paper) => {
    (paper.lensHits || []).forEach((hit) => counts.set(hit, (counts.get(hit) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function strongestBridgePaper() {
  if (!STATE.papers.length) return null;
  return [...STATE.papers]
    .sort((a, b) => relationDegree(b) - relationDegree(a) || (b.lensScore || 0) - (a.lensScore || 0))[0];
}

function freshestLensPaper() {
  return STATE.papers
    .filter((paper) => (paper.lensScore || 0) > 0 && paper.year)
    .sort((a, b) => b.year - a.year || (b.lensScore || 0) - (a.lensScore || 0))[0] || null;
}

function renderInsights() {
  const container = $('lit-insights');
  if (!container) return;
  if (!STATE.papers.length) {
    container.innerHTML = '<span>Run a search to generate a lens-aware shortlist, bridge-paper hint, and saved local library count.</span>';
    return;
  }
  const terms = topLensTerms();
  const bridge = strongestBridgePaper();
  const fresh = freshestLensPaper();
  container.innerHTML = `
    <span><strong>Lens hits:</strong> ${terms.length ? terms.map(([term, count]) => `${html(term)} ×${count}`).join(' · ') : 'none yet'}</span>
    ${bridge ? `<span><strong>Bridge:</strong> ${html(truncate(bridge.title, 54))} (${relationDegree(bridge)} edges)</span>` : ''}
    ${fresh ? `<span><strong>Fresh:</strong> ${html(truncate(fresh.title, 54))} (${fresh.year})</span>` : ''}
    <span><strong>Saved:</strong> ${STATE.saved.length} local records</span>
  `;
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
      <h3><span class="lit-node-index">${index + 1}</span> ${html(paper.title)}</h3>
      <p>${html(shortAuthors(paper))}${paper.year ? ` · ${paper.year}` : ''}${paper.venue ? ` · <em>${html(paper.venue)}</em>` : ''}</p>
      ${paper.abstract ? `<p>${html(paper.abstract).slice(0, 320)}${paper.abstract.length > 320 ? '…' : ''}</p>` : ''}
      <div class="lit-score-row">
        <span>${html(sourceBadge(paper.source))}</span>
        ${paper.lensScore ? `<span class="lens-chip">lens ${paper.lensScore}</span>` : ''}
        ${paper.lensHits?.length ? `<span>${html(paper.lensHits.slice(0, 3).join(' · '))}</span>` : ''}
        ${paper.citations !== null ? `<span>${paper.citations} citations</span>` : ''}
        ${paper.references !== null ? `<span>${paper.references} refs</span>` : ''}
        ${paper.doi ? `<a href="${html(doiUrl(paper.doi))}" target="_blank" rel="noreferrer noopener">DOI</a>` : ''}
        ${paper.openAccessUrl ? `<a href="${html(paper.openAccessUrl)}" target="_blank" rel="noreferrer noopener">OA</a>` : ''}
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
    <p>${paper.citations !== null ? `${paper.citations} citations` : 'Citation count unavailable'}${paper.references !== null ? ` · ${paper.references} references` : ''} · ${html(sourceBadge(paper.source))}${paper.lensScore ? ` · lens ${paper.lensScore}` : ''}</p>
    ${paper.lensHits?.length ? `<p><strong>Lens terms:</strong> ${html(paper.lensHits.join(', '))}</p>` : ''}
    ${paper.concepts.length ? `<p><strong>Concepts:</strong> ${html(paper.concepts.slice(0, 8).join(', '))}</p>` : ''}
    ${paper.abstract ? `<p>${html(paper.abstract).slice(0, 560)}${paper.abstract.length > 560 ? '…' : ''}</p>` : ''}
    ${related.length ? `<p><strong>Local relations</strong></p><ul>${related.join('')}</ul>` : '<p>No strong local relation edge was inferred among the displayed papers.</p>'}
  `;
}

function selectPaper(id) {
  STATE.activeId = id;
  const paper = STATE.papers.find((item) => item.id === id);
  renderResults();
  renderDetail(paper);
  layoutNetworkForActive();
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
    if (!node.visible) return;
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
    toYear: $('lit-to')?.value ? Number($('lit-to').value) : null,
    mode: $('lit-mode')?.value || 'balanced',
    lensTerms: parseLensTerms($('lit-lens')?.value || '')
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
  STATE.lensTerms = options.lensTerms;
  const sourceOrder = options.source === 'all' ? ['openalex', 'crossref', 'semantic'] : [options.source];
  STATE.lastErrors = [];
  STATE.activeId = null;
  setStatus(`Searching ${sourceOrder.map((source) => SOURCE_LABELS[source]).join(', ')} for “${query}” with ${options.mode} triage…`);

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
  annotateLens(STATE.papers, STATE.lensTerms);
  if (!STATE.papers.length) {
    renderResults();
    renderInsights();
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
  applyTriage(STATE.papers, options);

  buildNetwork(STATE.papers);
  renderResults();
  renderInsights();
  selectPaper(STATE.papers[0].id);
  setStatus(`Loaded ${STATE.papers.length} deduplicated records, ${STATE.edges.length} inferred metadata edges, and ${STATE.lensTerms.length} lens terms.`, STATE.lastErrors);
}

function saveSelectedPaper() {
  const paper = STATE.activeId ? paperById(STATE.activeId) : STATE.papers[0];
  if (!paper) {
    setStatus('No selected paper to save.');
    return;
  }
  const record = {
    id: paper.id,
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    venue: paper.venue,
    doi: paper.doi,
    url: paper.url || doiUrl(paper.doi),
    lensScore: paper.lensScore || 0,
    lensHits: paper.lensHits || [],
    savedAt: new Date().toISOString()
  };
  const existing = new Map(STATE.saved.map((item) => [item.id, item]));
  existing.set(record.id, record);
  STATE.saved = [...existing.values()].slice(-80).reverse();
  saveLibrary();
  renderInsights();
  setStatus(`Saved “${truncate(paper.title, 72)}” to the browser-local literature pocket.`, STATE.lastErrors);
}

function exportList() {
  if (!STATE.papers.length) {
    setStatus('Nothing to copy yet. Run a search first.');
    return;
  }
  const shortlist = STATE.papers.slice(0, 12);
  const text = [
    '# Literature Graph shortlist',
    `Generated: ${new Date().toLocaleString()}`,
    `Lens: ${STATE.lensTerms.join(', ') || 'none'}`,
    '',
    '| # | Paper | Why it is in the shortlist | DOI / URL |',
    '|---:|---|---|---|',
    ...shortlist.map((paper, index) => {
      const relationCount = relationDegree(paper);
      const why = [
        paper.lensScore ? `lens ${paper.lensScore}${paper.lensHits?.length ? ` (${paper.lensHits.slice(0, 3).join(', ')})` : ''}` : '',
        relationCount ? `${relationCount} graph links` : '',
        paper.citations !== null ? `${paper.citations} citations` : '',
        paper.year ? `${paper.year}` : ''
      ].filter(Boolean).join('; ');
      const citation = `${paper.title} — ${shortAuthors(paper)}${paper.venue ? `, ${paper.venue}` : ''}${paper.year ? ` (${paper.year})` : ''}`.replace(/\|/g, '/');
      const link = paper.doi ? doiUrl(paper.doi) : (paper.url || '');
      return `| ${index + 1} | ${citation} | ${why || 'metadata match'} | ${link} |`;
    }),
    '',
    '## Saved local records',
    ...(STATE.saved.length ? STATE.saved.slice(0, 20).map((paper, index) => `${index + 1}. ${paper.title}${paper.doi ? ` — https://doi.org/${paper.doi}` : paper.url ? ` — ${paper.url}` : ''}`) : ['None yet.'])
  ].join('\n');

  navigator.clipboard?.writeText(text)
    .then(() => setStatus(`Copied a ${shortlist.length}-paper review shortlist plus ${STATE.saved.length} saved local records.`, STATE.lastErrors))
    .catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      setStatus(`Copied a ${shortlist.length}-paper review shortlist plus ${STATE.saved.length} saved local records.`, STATE.lastErrors);
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
  loadSavedLibrary();
  STATE.lensTerms = parseLensTerms($('lit-lens')?.value || '');

  $('lit-form')?.addEventListener('submit', runSearch);
  $('lit-export')?.addEventListener('click', exportList);
  $('lit-save')?.addEventListener('click', saveSelectedPaper);
  $('lit-fit')?.addEventListener('click', () => {
    runLayout(120);
    setStatus(`Recentered the ego map for ${STATE.nodes.length} paper nodes and ${STATE.edges.length} inferred edges.`, STATE.lastErrors);
  });
  $('lit-network')?.addEventListener('click', clickNetwork);
  window.addEventListener('resize', () => {
    if (STATE.papers.length) buildNetwork(STATE.papers);
  });
  initExamples();
  renderResults();
  renderInsights();
  drawNetwork();
}

document.addEventListener('DOMContentLoaded', initLiteraturePage);
