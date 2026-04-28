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


function venueQuality(paper) {
  const venue = String(paper.venue || '').toLowerCase();
  if (!venue) return 0;
  if (/nature|science|cell/.test(venue)) return 4;
  if (/advanced|angew|jacs|chemical society|acs nano|nano letters|energy environmental|materials horizons/.test(venue)) return 3.4;
  if (/macromolecules|polymer|soft matter|journal of chemical physics|physical review|chemistry of materials|biomacromolecules/.test(venue)) return 2.4;
  if (/conference|proceedings|preprint|arxiv/.test(venue)) return 0.8;
  return 1.4;
}

function citationLabel(value) {
  const citations = Number(value || 0);
  if (!citations) return '0c';
  if (citations >= 1000) return `${Math.round(citations / 100) / 10}k c`;
  return `${citations}c`;
}

function nodeRadius(paper, maxCitations = 1) {
  const citations = Math.max(0, Number(paper.citations || 0));
  const normalizedCitation = Math.sqrt(citations / Math.max(1, maxCitations));
  const venue = venueQuality(paper);
  const lens = Math.min(1, (paper.lensScore || 0) / 10);
  return clamp(17 + normalizedCitation * 10 + venue * 1.8 + lens * 2.4, 17, 34);
}

function edgeWeightBetween(sourceId, targetId) {
  const edge = STATE.edges.find((item) =>
    (item.source === sourceId && item.target === targetId) || (item.source === targetId && item.target === sourceId)
  );
  return edge?.weight || 0;
}

function compactEdgeSet(edges, nodeIds) {
  const byNode = new Map(nodeIds.map((id) => [id, 0]));
  const sorted = [...edges].sort((a, b) => b.weight - a.weight);
  const kept = [];
  sorted.forEach((edge) => {
    const aDegree = byNode.get(edge.source) || 0;
    const bDegree = byNode.get(edge.target) || 0;
    const strong = edge.weight >= 3.2;
    if (kept.length < 20 && (strong || (aDegree < 3 && bDegree < 3))) {
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
  const selected = papers.slice(0, 16);
  const maxCitations = Math.max(1, ...selected.map((paper) => Number(paper.citations || 0)));

  const nodes = selected.map((paper, index) => {
    const r = nodeRadius(paper, maxCitations);
    return {
      id: paper.id,
      paper,
      index: index + 1,
      x: -999,
      y: -999,
      vx: 0,
      vy: 0,
      visible: false,
      role: 'bubble',
      r,
      baseR: r,
      venueSignal: venueQuality(paper)
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
  const height = canvas.clientHeight || 520;
  const nodeMap = new Map(STATE.nodes.map((node) => [node.id, node]));
  const activeId = activeNodeId();
  const active = nodeMap.get(activeId) || STATE.nodes[0];

  const pad = width < 620 ? 22 : 32;
  const footer = 32;
  const usableW = Math.max(240, width - pad * 2);
  const usableH = Math.max(280, height - pad * 2 - footer);
  const minDim = Math.min(usableW, usableH);

  STATE.nodes.forEach((node) => {
    node.visible = true;
    node.role = node.id === active?.id ? 'active' : 'bubble';
    node.hitbox = null;
  });

  if (!STATE.nodes.length) {
    STATE.layoutEdges = [];
    STATE.graphCards = null;
    return;
  }

  const ordered = [...STATE.nodes].sort((a, b) => {
    if (a.id === active?.id) return -1;
    if (b.id === active?.id) return 1;
    return edgeWeightBetween(active?.id, b.id) - edgeWeightBetween(active?.id, a.id)
      || (b.paper.citations || 0) - (a.paper.citations || 0)
      || (b.venueSignal || 0) - (a.venueSignal || 0)
      || a.index - b.index;
  });

  // Organic, v6-style bubble map: deterministic anchors + conservative collision resolution.
  // It avoids text labels inside the graph and keeps result order + citation count inside each bubble.
  const maxR = clamp(Math.floor(minDim / (STATE.nodes.length > 12 ? 9.6 : 8.5)), 19, 34);
  const rawArea = STATE.nodes.reduce((sum, node) => sum + Math.PI * Math.pow(node.baseR + (node.id === active?.id ? 4 : 0), 2), 0);
  const areaScale = clamp(Math.sqrt((usableW * usableH * 0.24) / Math.max(rawArea, 1)), 0.72, 1);

  ordered.forEach((node) => {
    const desired = node.baseR * areaScale + (node.id === active?.id ? 5 : 0);
    node.r = clamp(desired, node.id === active?.id ? 21 : 15, maxR);
  });

  const cx = pad + usableW * (width < 620 ? 0.5 : 0.43);
  const cy = pad + usableH * 0.52;
  const activeNode = ordered[0];
  activeNode.x = cx;
  activeNode.y = cy;
  activeNode.ax = cx;
  activeNode.ay = cy;

  const golden = Math.PI * (3 - Math.sqrt(5));
  const start = -Math.PI / 2.2;
  ordered.slice(1).forEach((node, orderIndex) => {
    const relation = edgeWeightBetween(active?.id, node.id);
    const relationNorm = clamp(relation / 5.5, 0, 1);
    const shell = orderIndex < 7 || relation > 0 ? 0 : 1;
    const angleSeed = (hashString(`${active?.id || 'root'}-${node.id}`) % 900) / 900;
    const angle = start + orderIndex * golden + angleSeed * 0.42;
    const radius = minDim * (0.24 + (1 - relationNorm) * 0.12 + shell * 0.18);
    const anisotropyX = clamp(usableW / minDim, 1, 1.58);
    const anisotropyY = clamp(usableH / minDim, 0.86, 1.22);

    node.ax = cx + Math.cos(angle) * radius * anisotropyX;
    node.ay = cy + Math.sin(angle) * radius * anisotropyY;
    node.x = clamp(node.ax, pad + node.r, width - pad - node.r);
    node.y = clamp(node.ay, pad + node.r, height - pad - footer - node.r);
  });

  const placed = ordered;
  const clampNode = (node) => {
    node.x = clamp(node.x, pad + node.r, width - pad - node.r);
    node.y = clamp(node.y, pad + node.r, height - pad - footer - node.r);
  };

  for (let iter = 0; iter < 180; iter += 1) {
    placed.forEach((node) => {
      if (node.id === active?.id) return;
      node.x += (node.ax - node.x) * 0.035;
      node.y += (node.ay - node.y) * 0.035;
    });

    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i];
        const b = placed[j];
        const gap = width < 620 ? 8 : 12;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const minDist = a.r + b.r + gap;
        if (dist >= minDist) continue;

        const ux = dx / dist;
        const uy = dy / dist;
        const push = (minDist - dist) * 0.58;
        if (a.id === active?.id) {
          b.x += ux * push;
          b.y += uy * push;
        } else if (b.id === active?.id) {
          a.x -= ux * push;
          a.y -= uy * push;
        } else {
          a.x -= ux * push * 0.5;
          a.y -= uy * push * 0.5;
          b.x += ux * push * 0.5;
          b.y += uy * push * 0.5;
        }
      }
    }

    activeNode.x = cx;
    activeNode.y = cy;
    placed.forEach(clampNode);
  }

  // Final strict pass: no attraction, only separation and boundary clamp.
  for (let iter = 0; iter < 50; iter += 1) {
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i];
        const b = placed[j];
        const gap = width < 620 ? 8 : 12;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const minDist = a.r + b.r + gap;
        if (dist >= minDist) continue;

        const ux = dx / dist;
        const uy = dy / dist;
        const push = (minDist - dist) * 0.64;
        if (a.id === active?.id) {
          b.x += ux * push;
          b.y += uy * push;
        } else if (b.id === active?.id) {
          a.x -= ux * push;
          a.y -= uy * push;
        } else {
          a.x -= ux * push * 0.5;
          a.y -= uy * push * 0.5;
          b.x += ux * push * 0.5;
          b.y += uy * push * 0.5;
        }
      }
    }
    activeNode.x = cx;
    activeNode.y = cy;
    placed.forEach(clampNode);
  }

  placed.forEach((node) => {
    node.hitbox = { x: node.x - node.r, y: node.y - node.r, w: node.r * 2, h: node.r * 2 };
  });

  const visibleIds = new Set(placed.map((node) => node.id));
  const activeEdges = STATE.edges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target) && (edge.source === active?.id || edge.target === active?.id))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 9);

  const otherEdges = STATE.edges
    .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target) && edge.source !== active?.id && edge.target !== active?.id)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);

  const edgeKeys = new Set();
  STATE.layoutEdges = [...activeEdges, ...otherEdges].filter((edge) => {
    const key = [edge.source, edge.target].sort().join('::');
    if (edgeKeys.has(key)) return false;
    edgeKeys.add(key);
    return true;
  });

  STATE.graphCards = { footerY: height - 13, activeId: active?.id };
}
function runLayout() {
  layoutNetworkForActive();
  drawNetwork();
}

function graphPalette() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue('--academic-accent').trim() || '#8b6f3d';
  if (isDark) {
    return {
      isDark,
      bg0: '#101621',
      bg1: '#121a27',
      bg2: '#172231',
      card: 'rgba(22, 28, 39, 0.94)',
      cardSoft: 'rgba(18, 24, 34, 0.92)',
      stroke: 'rgba(214, 199, 165, 0.28)',
      strokeSoft: 'rgba(214, 199, 165, 0.16)',
      ink: 'rgba(246, 248, 251, 0.95)',
      muted: 'rgba(211, 218, 228, 0.72)',
      faint: 'rgba(211, 218, 228, 0.23)',
      accent: '#c5a462',
      accentSoft: 'rgba(197, 164, 98, 0.18)',
      nodeFill: '#1e2938',
      nodeText: 'rgba(245, 248, 252, 0.94)',
      node0: '#2a3546',
      node1: '#151d2a',
      activeNode0: '#d0b16b',
      activeNode1: '#8f713d',
      nodeActiveText: '#fffdf8',
      nodeActiveTextSoft: 'rgba(255,253,248,0.9)',
      venueStroke: '#d0b16b',
      nodeShadow: 'rgba(0, 0, 0, 0.34)'
    };
  }
  return {
    isDark,
    bg0: '#fffdf8',
    bg1: '#f7f9fb',
    bg2: '#eef3f8',
    card: 'rgba(255, 253, 248, 0.94)',
    cardSoft: 'rgba(248, 250, 252, 0.88)',
    stroke: 'rgba(101, 86, 61, 0.22)',
    strokeSoft: 'rgba(101, 86, 61, 0.12)',
    ink: '#17202a',
    muted: '#5e6875',
    faint: 'rgba(94, 104, 117, 0.26)',
    accent,
    accentSoft: 'rgba(139, 111, 61, 0.12)',
    nodeFill: '#ffffff',
    nodeText: '#17202a',
    node0: '#ffffff',
    node1: '#e7f0f7',
    activeNode0: '#bd9b50',
    activeNode1: '#8b6f3d',
    nodeActiveText: '#fffdf8',
    nodeActiveTextSoft: 'rgba(255,253,248,0.92)',
    venueStroke: '#b9974e',
    nodeShadow: 'rgba(31, 41, 55, 0.14)'
  };
}

function roundRectPath(ctx, x, y, w, h, r = 12) {
  const radius = Math.min(r, w / 2, h / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
}

function fillStrokeRoundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function fitText(ctx, text = '', maxWidth = 120) {
  const value = normalizeSpace(text);
  if (ctx.measureText(value).width <= maxWidth) return value;
  let lo = 0;
  let hi = value.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${value.slice(0, mid)}…`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return `${value.slice(0, Math.max(0, lo - 1))}…`;
}

function wrapCanvasLines(ctx, text = '', maxWidth = 180, maxLines = 2) {
  const words = normalizeSpace(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth) {
      line = trial;
      return;
    }
    if (line) lines.push(line);
    line = word;
  });
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fitText(ctx, kept[maxLines - 1], maxWidth);
    return kept;
  }
  return lines;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines, options = {}) {
  ctx.save();
  ctx.font = options.font || '12px "Times New Roman", serif';
  ctx.fillStyle = options.color || '#17202a';
  ctx.textAlign = options.align || 'left';
  ctx.textBaseline = 'top';
  const lines = wrapCanvasLines(ctx, text, maxWidth, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  ctx.restore();
  return y + lines.length * lineHeight;
}

function drawText(ctx, text, x, y, maxChars, options = {}) {
  const value = truncate(text, maxChars);
  ctx.save();
  ctx.font = options.font || '12px "Times New Roman", serif';
  ctx.fillStyle = options.color || '#17202a';
  ctx.textAlign = options.align || 'left';
  ctx.textBaseline = options.baseline || 'top';
  ctx.fillText(value, x, y);
  ctx.restore();
}

function drawPill(ctx, text, x, y, options = {}) {
  const palette = graphPalette();
  const value = normalizeSpace(text);
  ctx.save();
  ctx.font = options.font || '11px "Times New Roman", serif';
  const maxWidth = options.maxWidth || 190;
  const display = fitText(ctx, value, Math.max(24, maxWidth - 14));
  const w = Math.min(maxWidth, ctx.measureText(display).width + 14);
  const h = options.height || 19;
  fillStrokeRoundRect(ctx, x, y, w, h, h / 2, options.fill || palette.card, options.stroke || palette.strokeSoft, 1);
  ctx.fillStyle = options.color || palette.muted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(display, x + 7, y + h / 2 + 0.4);
  ctx.restore();
  return w;
}

function drawNodeBadge(ctx, node, x, y, active, palette) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = active ? palette.accent : palette.nodeFill;
  ctx.strokeStyle = active ? palette.accent : palette.stroke;
  ctx.lineWidth = active ? 1.8 : 1.2;
  ctx.arc(x, y, active ? 15 : 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = active ? '#ffffff' : palette.nodeText;
  ctx.font = active ? '700 12px "Times New Roman", serif' : '700 10.5px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(node.index), x, y + 0.4);
  ctx.restore();
}

function drawBubble(ctx, node, palette) {
  const active = node.role === 'active';
  const citation = citationLabel(node.paper.citations);
  const quality = node.venueSignal || 0;
  ctx.save();
  ctx.shadowColor = palette.nodeShadow || 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = active ? 14 : 7;
  ctx.shadowOffsetY = active ? 3 : 2;
  ctx.beginPath();
  const halo = ctx.createRadialGradient(node.x - node.r * 0.28, node.y - node.r * 0.34, node.r * 0.15, node.x, node.y, node.r * 1.08);
  if (active) {
    halo.addColorStop(0, palette.activeNode0);
    halo.addColorStop(1, palette.activeNode1);
  } else {
    halo.addColorStop(0, palette.node0);
    halo.addColorStop(1, palette.node1);
  }
  ctx.fillStyle = halo;
  ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = active ? palette.accent : quality >= 3 ? palette.venueStroke : palette.stroke;
  ctx.lineWidth = active ? 2.4 : clamp(1 + quality * 0.28, 1, 2.1);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = active ? palette.nodeActiveText : palette.nodeText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${clamp(node.r * 0.44, 10, 15)}px "Times New Roman", serif`;
  ctx.fillText(`#${node.index}`, node.x, node.y - node.r * 0.15);
  ctx.font = `${clamp(node.r * 0.28, 8.5, 11.5)}px "Times New Roman", serif`;
  ctx.fillStyle = active ? palette.nodeActiveTextSoft : palette.muted;
  ctx.fillText(citation, node.x, node.y + node.r * 0.34);
  ctx.restore();
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
  const palette = graphPalette();
  const nodeMap = new Map(STATE.nodes.map((node) => [node.id, node]));
  const active = nodeMap.get(activeNodeId());

  ctx.save();
  const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
  gradient.addColorStop(0, palette.bg0);
  gradient.addColorStop(0.55, palette.bg1);
  gradient.addColorStop(1, palette.bg2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.restore();

  if (!STATE.nodes.length) {
    drawWrappedText(ctx, 'Run a search to build a non-overlapping bubble map. Bubble area reflects citations, venue signal, and lens relevance; numbers match the result order.', 18, 20, rect.width - 36, 18, 4, {
      color: palette.muted,
      font: '13px "Times New Roman", serif'
    });
    return;
  }

  layoutNetworkForActive();
  const activeId = activeNodeId();
  const visibleNodes = STATE.nodes.filter((node) => node.visible);

  ctx.save();
  ctx.lineCap = 'round';
  (STATE.layoutEdges || []).forEach((edge) => {
    const a = nodeMap.get(edge.source);
    const b = nodeMap.get(edge.target);
    if (!a || !b || !a.visible || !b.visible) return;
    const activeEdge = edge.source === activeId || edge.target === activeId;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const curve = activeEdge ? 0.08 : 0.035;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    ctx.quadraticCurveTo(mx - dy * curve, my + dx * curve, b.x, b.y);
    ctx.strokeStyle = activeEdge ? palette.accent : palette.faint;
    ctx.globalAlpha = activeEdge ? 0.48 : 0.18;
    ctx.lineWidth = activeEdge ? clamp(edge.weight * 0.22, 1.1, 2.6) : 0.8;
    ctx.stroke();
  });
  ctx.restore();

  visibleNodes
    .slice()
    .sort((a, b) => a.r - b.r)
    .forEach((node) => drawBubble(ctx, node, palette));

  ctx.save();
  ctx.fillStyle = palette.muted;
  ctx.font = '11.5px "Times New Roman", serif';
  ctx.textAlign = 'left';
  const activePaper = active?.paper;
  const activeText = activePaper ? `selected #${active.index}: ${truncate(activePaper.title, 70)}` : 'click a bubble or result to inspect the paper';
  ctx.fillText(fitText(ctx, activeText, rect.width - 28), 14, rect.height - 14);
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
    container.textContent = 'Select a paper bubble or result to inspect metadata.';
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
    if (distance <= node.r + 8 && distance < bestDistance) {
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
