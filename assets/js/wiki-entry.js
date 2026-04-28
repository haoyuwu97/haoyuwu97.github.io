import { softwareProjects, pageMeta } from './site-data.js';
import { activateNav, initReveal, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const PROJECT_COPY = {
  pilots: {
    headline: 'Trajectory-analysis runner for large molecular-simulation data sets.',
    overview: 'PILOTS reads LAMMPS trajectories and evaluates registered measures in a reproducible, restartable workflow. It is designed for streaming analysis, topology-aware observables, and auditable output rather than isolated post-processing scripts.',
    whyItMatters: 'PILOTS makes trajectory analysis a controlled computational step. Selections, topology loading, periodic reconstruction, checkpoints, and output metadata are handled centrally so new observables can be added as modular measures.',
    architecture: [
      'Trajectory input → topology and selection handling → registered measure evaluation → audited datasets',
      'Designed for streaming or restartable trajectory analysis rather than ad hoc post-processing',
      'Useful when multiple observables must be evaluated consistently on the same molecular data'
    ]
  },
  channel: {
    headline: 'One-dimensional continuum solver for charge, ion, and redox transport.',
    overview: 'CHANNEL links nanoscale transport or thermodynamic kernels to device-scale profiles. It is intended for Poisson/transport calculations, optional redox coupling, and OECT-style observables in a compact 1D setting.',
    whyItMatters: 'The code records the continuum closure used to turn molecular or profile-level information into higher-level electrochemical observables. Its role is model reduction and verification, not trajectory generation.',
    architecture: [
      'Profile or kernel input → closure selection → stationary or dynamic solve → diagnostic datasets',
      'Supports electrostatic, transport, and optional redox terms within a compact continuum workflow',
      'Designed to keep assumptions visible when molecular information is passed to a higher-scale model'
    ]
  },
  impact: {
    headline: 'Crystallinity and cluster-analysis toolkit for coarse-grained polymer trajectories.',
    overview: 'IMPACT evaluates structural order in semi-crystalline polymer systems using SOP, DTT, volume-based crystallinity, cluster analysis, and polymer-conformation descriptors.',
    whyItMatters: 'The package keeps crystallization metrics explicit and comparable across trajectories, reducing the dependence on one-off scripts or undocumented structural thresholds.',
    architecture: [
      'Trajectory input → selected crystallinity criterion → optional cluster and conformation analysis → snapshot-level outputs',
      'Provides several structural definitions rather than forcing a single crystallinity metric',
      'Suitable for coarse-grained polymer trajectories where local order must be tracked over time'
    ]
  },
  vela: {
    headline: 'Linear-response analyzer for stress correlations and viscoelastic spectra.',
    overview: 'VELA converts molecular-dynamics stress time series into time- and frequency-domain viscoelastic observables. It separates branch conventions, transform choices, and output metadata.',
    whyItMatters: 'Stress-correlation analysis is sensitive to numerical choices. VELA makes those choices visible so modulus estimates can be checked, reproduced, and compared across simulations.',
    architecture: [
      'Stress time series → centered autocorrelation → transform route → time- and frequency-domain moduli',
      'Separates reduced and absolute branches to avoid ambiguous modulus interpretation',
      'Records transform choices and output headers for reproducible viscoelastic analysis'
    ]
  },
  gnm: {
    headline: 'Compact MC/GCMC engine for Lennard-Jones particle systems.',
    overview: 'GNM is a small Monte Carlo and grand-canonical Monte Carlo code for simple short-range particle models. It is useful as a transparent simulation engine and as a teaching-oriented codebase.',
    whyItMatters: 'The package emphasizes a readable input-driven structure rather than maximal scope, making it suitable for testing particle-simulation ideas and explaining MC/GCMC organization.',
    architecture: [
      'Input file → MC or GCMC mode selection → particle moves and acceptance tests → energy/configuration output',
      'Focused on short-range Lennard-Jones particle systems under periodic boundary conditions',
      'Useful as a compact reference implementation rather than a large general-purpose simulator'
    ]
  },
  'pair-style-swas': {
    headline: 'LAMMPS pair-style extension for associative vitrimer bonding.',
    overview: 'pair_style-sw-as implements a modified Stillinger–Weber-style interaction for associative vitrimer bonding, combining two-body attraction with a three-body term that penalizes swap-like configurations.',
    whyItMatters: 'The repository encodes a specific molecular model for dynamic covalent network rearrangement. Its value is the force-field extension itself, which can support vitrimer simulation studies inside LAMMPS.',
    architecture: [
      'LAMMPS pair style → modified two-body attraction plus three-body repulsion → dynamic associative-bond model',
      'Intended as a force-field extension, not as a standalone simulation package',
      'Useful for vitrimer models where swap energetics must be controlled at the interaction level'
    ]
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

function getProject() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('project') || params.get('slug') || params.get('id') || '';
  const project = softwareProjects.find((item) => [item.slug, item.id, item.name].some((value) => value?.toLowerCase() === key.toLowerCase())) || softwareProjects[0];
  return projectCopy(project);
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
      ${hasPublicDocs(project) ? `<a class="meta-chip" href="${escapeHtml(project.docsUrl)}" target="_blank" rel="noopener">Docs</a>` : ''}
      <a class="meta-chip" href="wiki.html#${escapeHtml(project.slug || project.id)}">Wiki index</a>
    </div>
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
  list('workflow-list', project.architecture || []);
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
