import { softwareProjects, pageMeta } from './site-data.js';
import {
  activateNav,
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

  renderTagList(document.getElementById('entry-tags'), [project.language, project.license, project.status, project.updated]);

  const featureList = document.getElementById('feature-list');
  featureList.innerHTML = '';
  [...project.features, ...project.outputs.map((item) => `Produces: ${item}`)].forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    featureList.appendChild(li);
  });

  const workflowList = document.getElementById('workflow-list');
  workflowList.innerHTML = '';
  [...project.architecture, ...project.connections.map((item) => `Connects to: ${item}`)].forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    workflowList.appendChild(li);
  });

  renderCodeList(document.getElementById('build-commands'), project.build, 'build-command');
  renderCodeList(document.getElementById('run-commands'), project.run, 'run-command');
}

window.addEventListener('DOMContentLoaded', () => {
  const project = getProject();
  setMeta({
    title: `${project.name} | Research Wiki | Haoyu Wu`,
    description: project.cardSummary
  });
  activateNav('wiki');
  smoothScrollForHashes();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'page', density: 0.6 });
  renderProject(project);
  initReveal();
  initTilt();
  initCopyButtons();
});
