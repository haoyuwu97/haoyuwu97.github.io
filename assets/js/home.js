import { profile, researchPillars, publications, softwareProjects, pageMeta } from './site-data.js';
import { activateNav, initReveal, renderTagList, smoothScrollForHashes, setMeta } from './utils.js';
import { initMolecularField } from './background.js';
import { renderStats } from './renderers.js';

function renderHero() {
  document.getElementById('hero-kicker').textContent = profile.heroKicker;
  document.getElementById('hero-name').textContent = profile.name;
  document.getElementById('hero-title').textContent = `${profile.shortTitle} · ${profile.affiliation}`;
  document.getElementById('hero-summary').textContent = profile.heroSummary;
  renderTagList(document.getElementById('focus-tags'), profile.focusAreas);

  const facts = [
    profile.quickFacts[0],
    profile.quickFacts[1],
    { label: 'Papers indexed', value: `${publications.length}` },
    { label: 'Packages documented', value: `${softwareProjects.length}` }
  ];
  renderStats(document.getElementById('hero-facts'), facts);
}

function renderSnapshot() {
  const container = document.getElementById('pillar-grid');
  container.innerHTML = '';
  researchPillars.forEach((pillar) => {
    const article = document.createElement('article');
    article.className = 'glass-card pillar-card';
    article.dataset.reveal = '';
    article.innerHTML = `
      <span class="meta-chip">${pillar.id.replaceAll('-', ' ')}</span>
      <h2 class="card-title">${pillar.title}</h2>
      <p class="card-body">${pillar.body}</p>
    `;
    container.appendChild(article);
  });
}

function initPortrait() {
  const portrait = document.getElementById('hero-portrait');
  portrait.src = profile.portrait;
  portrait.alt = `${profile.name} portrait`;
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.index);
  activateNav('home');
  smoothScrollForHashes();
  initPortrait();
  renderHero();
  renderSnapshot();
  initReveal();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'hero', density: 0.88 });
});
