import { softwareProjects, softwareGraph, pageMeta } from './site-data.js';
import { activateNav, initReveal, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getProject() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('project') || params.get('slug') || params.get('id') || '';
  return softwareProjects.find((project) => [project.slug, project.id, project.name].some((value) => value?.toLowerCase() === key.toLowerCase())) || softwareProjects[0];
}

function list(containerId, items = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    container.appendChild(li);
  });
}

function commands(containerId, commands = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  commands.forEach((command) => {
    const code = document.createElement('code');
    code.textContent = command;
    container.appendChild(code);
  });
}

function renderInfobox(project) {
  const connected = softwareGraph.filter((edge) => edge.from === project.id || edge.to === project.id);
  const box = document.getElementById('entry-infobox');
  box.innerHTML = `
    <h2>${escapeHtml(project.name)}</h2>
    <dl>
      <div><dt>Status</dt><dd>${escapeHtml(project.status)}</dd></div>
      <div><dt>Category</dt><dd>${escapeHtml(project.category)}</dd></div>
      <div><dt>Language</dt><dd>${escapeHtml(project.language)}</dd></div>
      <div><dt>License</dt><dd>${escapeHtml(project.license)}</dd></div>
      <div><dt>Updated</dt><dd>${escapeHtml(project.updated)}</dd></div>
      <div><dt>Outputs</dt><dd>${escapeHtml((project.outputs || []).join('; '))}</dd></div>
    </dl>
    <div class="wiki-link-row">
      ${project.repoUrl ? `<a class="meta-chip" href="${escapeHtml(project.repoUrl)}" target="_blank" rel="noopener">Repository</a>` : ''}
      ${project.docsUrl ? `<a class="meta-chip" href="${escapeHtml(project.docsUrl)}" target="_blank" rel="noopener">Docs</a>` : ''}
      <a class="meta-chip" href="wiki.html#${escapeHtml(project.slug || project.id)}">Wiki index</a>
    </div>
    ${connected.length ? `<h3>Graph links</h3><ul class="wiki-edge-list">${connected.map((edge) => `<li>${escapeHtml(edge.from)} → ${escapeHtml(edge.to)} (${escapeHtml(edge.label)})</li>`).join('')}</ul>` : ''}
  `;
}

function renderProject(project) {
  document.title = `${project.name} | Research Wiki | Haoyu Wu`;
  setMeta({ ...pageMeta.wiki, title: `${project.name} | Research Wiki | Haoyu Wu`, description: project.cardSummary || pageMeta.wiki.description });

  document.getElementById('entry-kicker').textContent = project.category || 'Repository';
  document.getElementById('entry-title').textContent = project.name;
  document.getElementById('entry-headline').textContent = project.headline || '';
  document.getElementById('entry-summary').textContent = project.overview || project.cardSummary || '';
  document.getElementById('entry-why').textContent = project.whyItMatters || project.cardSummary || '';

  const tags = document.getElementById('entry-tags');
  tags.innerHTML = [project.status, project.language, project.license].filter(Boolean).map((tag) => `<span class="meta-chip">${escapeHtml(tag)}</span>`).join('');

  list('feature-list', project.features || []);
  list('workflow-list', project.architecture || project.connections || []);
  commands('build-commands', project.build || []);
  commands('run-commands', project.run || []);
  renderInfobox(project);
}

window.addEventListener('DOMContentLoaded', () => {
  activateNav('wiki');
  smoothScrollForHashes();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'page', density: 0.56 });
  renderProject(getProject());
  initReveal();
});
