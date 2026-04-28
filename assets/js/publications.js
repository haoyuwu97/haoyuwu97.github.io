import { publications, pageMeta } from './site-data.js';
import { activateNav, initReveal, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';


const supplementalPublications = [
  {
    id: 'multichannel-flexible-pulse-array-2023',
    year: 2023,
    title: 'Multichannel Flexible Pulse Perception Array for Intelligent Disease Diagnosis System',
    authors: 'Tiezhu Liu, Guang-yang Gou, Fupeng Gao, Pan Yao, Haoyu Wu, Yusen Guo, Minghui Yin, Jie Yang, Tiancai Wen, Ming Zhao, Tong Li, Gang Chen, Jianhai Sun, Tianjun Ma, Jianqun Cheng, Zhimei Qi, Jiamin Chen, Junbo Wang, Mengdi Han, Zhen Fang, Yangyang Gao, Chunxiu Liu, Ning Xue',
    venue: 'ACS Nano',
    citation: '17(6), 5673–5685',
    doi: '10.1021/acsnano.2c11897',
    url: 'https://doi.org/10.1021/acsnano.2c11897',
    tags: ['Flexible electronics', 'Nanocomposites', 'Molecular modeling', 'Machine learning'],
    blurb: 'Reports a multichannel PI/MWCNT–PDMS flexible pressure-sensor array, with molecular-level modeling and machine-learning analysis for pulse perception.'
  }
];

function publicationKey(item) {
  return (item.doi || item.id || item.title || '').toLowerCase().replace(/\s+/g, '');
}

function mergedPublications() {
  const merged = new Map();
  [...publications, ...supplementalPublications].forEach((item) => {
    const key = publicationKey(item);
    if (!key || merged.has(key)) return;
    merged.set(key, item);
  });
  return [...merged.values()];
}


function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function emphasizeHaoyu(authors = '') {
  return escapeHtml(authors).replaceAll('Haoyu Wu', '<strong>Haoyu Wu</strong>');
}

function groupByYear(items) {
  return items.reduce((groups, item) => {
    const year = `${item.year || 'Unyearred'}`;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(item);
    return groups;
  }, new Map());
}

function paperLinks(item) {
  const links = [];
  if (item.url) links.push(`<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Publisher</a>`);
  if (item.doi) links.push(`<a href="https://doi.org/${escapeHtml(item.doi)}" target="_blank" rel="noopener">DOI: ${escapeHtml(item.doi)}</a>`);
  if (item.tags?.length) links.push(`<span>${escapeHtml(item.tags.slice(0, 3).join(' · '))}</span>`);
  return links.join('');
}

function publicationEntry(item, index) {
  const article = document.createElement('article');
  article.className = 'pub-entry';
  article.setAttribute('data-reveal', '');

  const venue = [item.venue, item.citation].filter(Boolean).join(', ');
  article.innerHTML = `
    <h3 class="pub-entry-title"><span>${index}.</span> ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</h3>
    <p class="pub-authors">${emphasizeHaoyu(item.authors)}</p>
    <p class="pub-venue"><em>${escapeHtml(venue)}</em>${item.year ? ` (${escapeHtml(item.year)})` : ''}</p>
    ${item.blurb ? `<p class="pub-note">${escapeHtml(item.blurb)}</p>` : ''}
    <div class="pub-links">${paperLinks(item)}</div>
  `;
  return article;
}

function renderPublications() {
  const container = document.getElementById('publication-list');
  if (!container) return;

  const sorted = mergedPublications().sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title));
  const groups = groupByYear(sorted);
  const years = sorted.map((item) => item.year).filter(Boolean);

  const totalNode = document.getElementById('publication-total');
  const yearSpanNode = document.getElementById('year-span');
  const firstAuthorNode = document.getElementById('first-author-count');
  if (totalNode) totalNode.textContent = `${sorted.length}`;
  if (yearSpanNode) yearSpanNode.textContent = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—';
  if (firstAuthorNode) firstAuthorNode.textContent = `${sorted.filter((item) => item.authors?.trim().startsWith('Haoyu Wu')).length}`;

  container.innerHTML = '';
  let globalIndex = 1;
  [...groups.entries()].sort((a, b) => Number(b[0]) - Number(a[0])).forEach(([year, papers]) => {
    const block = document.createElement('section');
    block.className = 'pub-year-block';
    block.innerHTML = `<div class="pub-year-label">${escapeHtml(year)}</div><div class="pub-year-list"></div>`;
    const list = block.querySelector('.pub-year-list');
    papers.forEach((paper) => list.appendChild(publicationEntry(paper, globalIndex++)));
    container.appendChild(block);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.publications);
  activateNav('publications');
  smoothScrollForHashes();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'page', density: 0.62 });
  renderPublications();
  initReveal();
});
