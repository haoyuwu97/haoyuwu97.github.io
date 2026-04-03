import { profile, researchPillars, publications, softwareProjects, softwareGraph, pageMeta } from './site-data.js';
import { activateNav, initFooterYear, initReveal, initTilt, renderLinkRow, renderTagList, smoothScrollForHashes, setMeta } from './utils.js';
import { initMolecularField } from './background.js';
import { publicationCard, projectCard, renderSoftwareMap, renderStats } from './renderers.js';

function renderHero() {
  document.getElementById('hero-kicker').textContent = profile.heroKicker;
  document.getElementById('hero-name').textContent = profile.name;
  document.getElementById('hero-title').textContent = `${profile.shortTitle} · ${profile.affiliation}`;
  document.getElementById('hero-summary').textContent = profile.heroSummary;
  renderLinkRow(document.getElementById('hero-links'), [
    { label: 'Publications', href: 'publications.html', kind: 'primary', external: false },
    { label: 'Research Wiki', href: 'wiki.html', kind: 'secondary', external: false },
    { label: 'Rest Mode', href: 'leisure.html', kind: 'ghost', external: false }
  ]);
  renderTagList(document.getElementById('focus-tags'), profile.focusAreas);
  renderStats(document.getElementById('hero-facts'), profile.quickFacts);
}

function renderSnapshot() {
  const container = document.getElementById('pillar-grid');
  container.innerHTML = '';
  researchPillars.forEach((pillar) => {
    const article = document.createElement('article');
    article.className = 'glass-card pillar-card tilt-card';
    article.dataset.reveal = '';
    article.innerHTML = `
      <span class="meta-chip">Research layer</span>
      <h3 class="card-title">${pillar.title}</h3>
      <p class="card-body">${pillar.body}</p>
    `;
    container.appendChild(article);
  });
}

function renderPublicationPreview() {
  const container = document.getElementById('publication-preview');
  container.innerHTML = '';
  [...publications]
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title))
    .slice(0, 4)
    .forEach((item) => container.appendChild(publicationCard(item, true)));
}

function renderSoftwarePreview() {
  const container = document.getElementById('software-preview');
  container.innerHTML = '';
  softwareProjects.slice(0, 4).forEach((project) => container.appendChild(projectCard(project)));
  renderSoftwareMap(document.getElementById('software-map-container'), softwareProjects, softwareGraph);
}

function renderCounts() {
  document.getElementById('count-publications').textContent = `${publications.length}`;
  document.getElementById('count-projects').textContent = `${softwareProjects.length}`;
}

function initPortrait() {
  const portrait = document.getElementById('hero-portrait');
  portrait.src = profile.portrait;
  portrait.alt = `${profile.name} portrait`;
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.index);
  activateNav('home');
  initFooterYear();
  smoothScrollForHashes();
  initPortrait();
  renderHero();
  renderCounts();
  renderSnapshot();
  renderPublicationPreview();
  renderSoftwarePreview();
  initReveal();
  initTilt();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'hero', density: 0.92 });
});
