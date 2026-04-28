import { softwareProjects, pageMeta } from './site-data.js';
import { activateNav, initReveal, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const PROJECT_COPY = {
  pilots: {
    headline: 'Trajectory-analysis runner for large molecular-simulation data sets.',
    overview: 'PILOTS reads LAMMPS trajectories and evaluates registered measures in a reproducible, restartable workflow. It is designed for streaming analysis, topology-aware observables, and auditable output rather than isolated post-processing scripts.',
    whyItMatters: 'The package makes trajectory analysis a controlled computational step: selections, topology loading, periodic reconstruction, checkpoints, and output metadata are handled centrally so new observables can be added as modular measures.'
  },
  channel: {
    headline: 'One-dimensional continuum solver for charge, ion, and redox transport.',
    overview: 'CHANNEL links nanoscale transport or thermodynamic kernels to device-scale profiles. It is intended for Poisson/transport calculations, optional redox coupling, and OECT-style observables in a compact 1D setting.',
    whyItMatters: 'The code records the continuum closure used to turn molecular or profile-level information into higher-level electrochemical observables. Its role is model reduction and verification, not trajectory generation.'
  },
  impact: {
    headline: 'Crystallinity and cluster-analysis toolkit for coarse-grained polymer trajectories.',
    overview: 'IMPACT evaluates structural order in semi-crystalline polymer systems using SOP, DTT, volume-based crystallinity, cluster analysis, and polymer-conformation descriptors.',
    whyItMatters: 'The package keeps crystallization metrics explicit and comparable across trajectories, reducing the dependence on one-off scripts or undocumented structural thresholds.'
  },
  vela: {
    headline: 'Linear-response analyzer for stress correlations and viscoelastic spectra.',
    overview: 'VELA converts molecular-dynamics stress time series into time- and frequency-domain viscoelastic observables. It separates branch conventions, transform choices, and output metadata.',
    whyItMatters: 'Stress-correlation analysis is sensitive to numerical choices. VELA makes those choices visible so modulus estimates can be checked, reproduced, and compared across simulations.'
  },
  gnm: {
    headline: 'Compact MC/GCMC engine for Lennard-Jones particle systems.',
    overview: 'GNM is a small Monte Carlo and grand-canonical Monte Carlo code for simple short-range particle models. It is useful as a transparent simulation engine and as a teaching-oriented codebase.',
    whyItMatters: 'The package emphasizes a readable input-driven structure rather than maximal scope, making it suitable for testing particle-simulation ideas and explaining MC/GCMC organization.'
  },
  'pair-style-swas': {
    headline: 'LAMMPS pair-style extension for associative vitrimer bonding.',
    overview: 'pair_style-sw-as implements a modified Stillinger–Weber-style interaction for associative vitrimer bonding, combining two-body attraction with a three-body term that penalizes swap-like configurations.',
    whyItMatters: 'The repository encodes a specific molecular model for dynamic covalent network rearrangement. Its value is the force-field extension itself, which can support vitrimer simulation studies inside LAMMPS.'
  }
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function slugOf(project) {
  return (project.slug || project.id || project.name || '').toLowerCase();
}

function hasPublicDocs(project) {
  return slugOf(project) === 'pilots' && Boolean(project.docsUrl);
}

function projectCopy(project) {
  const override = PROJECT_COPY[slugOf(project)] || {};
  return { ...project, ...override };
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
    <p>Packages are grouped by methodological role. The grouping is a classification only; it does not imply dependency, execution order, or data flow.</p>
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

function infobox(rawProject) {
  const project = projectCopy(rawProject);
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
        ${hasPublicDocs(project) ? `<a class="meta-chip" href="${escapeHtml(project.docsUrl)}" target="_blank" rel="noopener">Docs</a>` : ''}
        <a class="meta-chip" href="${projectUrl(project)}">Entry</a>
      </div>
    </aside>
  `;
}

function entry(rawProject) {
  const project = projectCopy(rawProject);
  return `
    <section id="${escapeHtml(project.slug || project.id)}" class="wiki-entry">
      <div>
        <h2>${escapeHtml(project.name)}</h2>
        <p><strong>${escapeHtml(project.headline || project.cardSummary || '')}</strong></p>
        <p>${escapeHtml(project.overview || project.cardSummary || '')}</p>
        <h3>Scientific role</h3>
        <p>${escapeHtml(project.whyItMatters || 'This entry records the repository scope, interface, and methodological role in the simulation-analysis stack.')}</p>
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
