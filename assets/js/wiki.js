import { softwareProjects, pageMeta } from './site-data.js';
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

function projectUrl(project) {
  return `wiki-entry.html?project=${encodeURIComponent(project.slug || project.id)}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function renderContents() {
  const nav = document.getElementById('wiki-contents');
  if (!nav) return;
  nav.innerHTML = softwareProjects
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((project) => `<a href="#${escapeHtml(project.slug || project.id)}">${escapeHtml(project.name)}</a>`)
    .join('');
}

function renderIndex() {
  const container = document.getElementById('wiki-index');
  if (!container) return;
  const categories = unique(softwareProjects.map((project) => project.category));
  container.innerHTML = `
    <h2>Taxonomy</h2>
    <p>This index groups repositories by methodological role only. It deliberately avoids inferred dependency arrows or workflow claims unless those relations are explicitly documented in a repository.</p>
    <div class="wiki-index-grid">
      ${categories.map((category) => {
        const entries = softwareProjects.filter((project) => project.category === category);
        return `<div class="wiki-index-card">
          <h3>${escapeHtml(category)}</h3>
          <p>${entries.map((entry) => escapeHtml(entry.name)).join(' · ')}</p>
        </div>`;
      }).join('')}
    </div>
  `;
}

function infobox(project) {
  return `
    <aside class="wiki-infobox">
      <dl>
        <div><dt>Status</dt><dd>${escapeHtml(project.status)}</dd></div>
        <div><dt>Category</dt><dd>${escapeHtml(project.category)}</dd></div>
        <div><dt>Language</dt><dd>${escapeHtml(project.language)}</dd></div>
        <div><dt>License</dt><dd>${escapeHtml(project.license)}</dd></div>
        <div><dt>Updated</dt><dd>${escapeHtml(project.updated)}</dd></div>
      </dl>
      <div class="wiki-link-row">
        ${project.repoUrl ? `<a class="meta-chip" href="${escapeHtml(project.repoUrl)}" target="_blank" rel="noopener">Repository</a>` : ''}
        ${project.docsUrl ? `<a class="meta-chip" href="${escapeHtml(project.docsUrl)}" target="_blank" rel="noopener">Docs</a>` : ''}
        <a class="meta-chip" href="${projectUrl(project)}">Entry</a>
      </div>
    </aside>
  `;
}

function entry(project) {
  return `
    <section id="${escapeHtml(project.slug || project.id)}" class="wiki-entry">
      <div>
        <h2>${escapeHtml(project.name)}</h2>
        <p><strong>${escapeHtml(project.headline || project.cardSummary || '')}</strong></p>
        <p>${escapeHtml(project.overview || project.cardSummary || '')}</p>
        <h3>Role</h3>
        <p>${escapeHtml(project.whyItMatters || 'This entry documents the scientific role, interface, and usage context of the repository.')}</p>
        <h3>Selected features</h3>
        <ul>${(project.features || []).slice(0, 4).map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul>
      </div>
      ${infobox(project)}
    </section>
  `;
}

function renderEntries() {
  const container = document.getElementById('wiki-entries');
  if (!container) return;
  container.innerHTML = softwareProjects
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(entry)
    .join('');
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.wiki);
  activateNav('wiki');
  smoothScrollForHashes();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'page', density: 0.55 });

  const categories = unique(softwareProjects.map((project) => project.category));
  document.getElementById('repo-total').textContent = `${softwareProjects.length}`;
  document.getElementById('category-total').textContent = `${categories.length}`;

  renderContents();
  renderIndex();
  renderEntries();
  initReveal();
});
