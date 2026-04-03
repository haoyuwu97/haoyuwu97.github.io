import { softwareProjects, pageMeta } from './site-data.js';
import {
  activateNav,
  initFooterYear,
  initReveal,
  initTilt,
  initCopyButtons,
  renderTagList,
  setMeta,
  smoothScrollForHashes
} from './utils.js';
import { renderCodeList } from './renderers.js';
import { initMolecularField } from './background.js';

function getProject() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('repo');
  return softwareProjects.find((project) => project.slug === slug) || softwareProjects[0];
}

function renderProject(project) {
  const brand = document.getElementById('entry-brand');
  const kickerFallback = document.getElementById('entry-kicker-fallback');
  const logo = document.getElementById('entry-logo');
  if (project.logo) {
    brand.hidden = false;
    logo.src = project.logo;
    logo.alt = project.logoAlt || `${project.name} logo`;
    brand.querySelector('.kicker').textContent = project.category;
    kickerFallback.hidden = true;
  } else {
    brand.hidden = true;
    kickerFallback.textContent = project.category;
    kickerFallback.hidden = false;
  }

  document.getElementById('entry-title').textContent = project.name;
  document.getElementById('entry-headline').textContent = project.headline;
  document.getElementById('entry-summary').textContent = project.overview;
  document.getElementById('entry-why').textContent = project.whyItMatters;

  const tagContainer = document.getElementById('entry-tags');
  renderTagList(tagContainer, [project.language, project.license, project.status, project.updated]);

  const stats = document.getElementById('entry-stats');
  stats.innerHTML = `
    <div class="stat-card glass-card">
      <span class="stat-label">Category</span>
      <strong class="stat-value">${project.category}</strong>
    </div>
    <div class="stat-card glass-card">
      <span class="stat-label">Language</span>
      <strong class="stat-value">${project.language}</strong>
    </div>
    <div class="stat-card glass-card">
      <span class="stat-label">License</span>
      <strong class="stat-value">${project.license}</strong>
    </div>
    <div class="stat-card glass-card">
      <span class="stat-label">Updated</span>
      <strong class="stat-value">${project.updated}</strong>
    </div>
  `;

  const featureList = document.getElementById('feature-list');
  featureList.innerHTML = '';
  project.features.forEach((feature) => {
    const li = document.createElement('li');
    li.textContent = feature;
    featureList.appendChild(li);
  });

  const architectureList = document.getElementById('architecture-list');
  architectureList.innerHTML = '';
  project.architecture.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    architectureList.appendChild(li);
  });

  const outputList = document.getElementById('output-list');
  outputList.innerHTML = '';
  project.outputs.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    outputList.appendChild(li);
  });

  const connectionList = document.getElementById('connection-list');
  connectionList.innerHTML = '';
  project.connections.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    connectionList.appendChild(li);
  });

  renderCodeList(document.getElementById('build-commands'), project.build, 'build-command');
  renderCodeList(document.getElementById('run-commands'), project.run, 'run-command');

  const quickLinks = document.getElementById('quick-links');
  quickLinks.innerHTML = '';
  project.quickLinks.forEach((link) => {
    const a = document.createElement('a');
    a.className = 'btn secondary';
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noreferrer noopener';
    a.textContent = link.label;
    quickLinks.appendChild(a);
  });

  const index = softwareProjects.findIndex((item) => item.id === project.id);
  const prev = softwareProjects[(index - 1 + softwareProjects.length) % softwareProjects.length];
  const next = softwareProjects[(index + 1) % softwareProjects.length];
  const pager = document.getElementById('entry-pager');
  pager.innerHTML = `
    <a class="pager-link" href="wiki-entry.html?repo=${prev.slug}">
      <span>← Previous</span>
      <strong>${prev.name}</strong>
    </a>
    <a class="pager-link" href="wiki-entry.html?repo=${next.slug}">
      <span>Next →</span>
      <strong>${next.name}</strong>
    </a>
  `;
}

window.addEventListener('DOMContentLoaded', () => {
  const project = getProject();
  setMeta({
    title: `${project.name} | Research Wiki | Haoyu Wu`,
    description: project.cardSummary
  });
  activateNav('wiki');
  initFooterYear();
  smoothScrollForHashes();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'page', density: 0.62 });
  renderProject(project);
  initReveal();
  initTilt();
  initCopyButtons();
});
