import { profile, researchPillars, pageMeta } from './site-data.js';
import { activateNav, initReveal, renderTagList, renderLinkRow, smoothScrollForHashes, setMeta } from './utils.js';
import { initMolecularField } from './background.js';
import { renderStats } from './renderers.js';

function renderHero() {
  document.getElementById('hero-kicker').textContent = profile.heroKicker;
  document.getElementById('hero-name').textContent = profile.name;
  document.getElementById('hero-title').textContent = `${profile.shortTitle} · ${profile.affiliation}`;
  document.getElementById('hero-summary').textContent = profile.heroSummary;
  renderTagList(document.getElementById('focus-tags'), profile.focusAreas.slice(0, 6));
  renderStats(document.getElementById('hero-facts'), profile.quickFacts.slice(0, 3));
  renderLinkRow(document.getElementById('hero-links'), profile.links.slice(0, 4), 'ghost');
}

function renderSnapshot() {
  const container = document.getElementById('pillar-grid');
  container.innerHTML = '';
  researchPillars.forEach((pillar) => {
    const article = document.createElement('article');
    article.className = 'glass-card pillar-card compact-pillar';
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
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'hero', density: 1.04 });
});
