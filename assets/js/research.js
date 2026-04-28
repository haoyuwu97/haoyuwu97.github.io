import { pageMeta } from './site-data.js';
import { activateNav, initReveal, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const RESEARCH_PAGE = {
  intro: '',
  directions: [
    {
      kicker: 'Current project · OMIEC / OECT',
      title: 'Multiscale simulation of electrochemical hysteresis in OMIECs and OECTs',
      lead:
        'This project studies history-dependent electrochemical response in organic mixed ionic–electronic conductors. The central question is how ion insertion, redox-state redistribution, polymer/solvent relaxation, and morphology-dependent transport combine to produce OECT hysteresis.',
      figure: 'assets/img/research/omiec-oect-hysteresis-toc.svg',
      alt: 'TOC-style schematic showing ion insertion, mixed ionic-electronic transport, morphology relaxation, and a hysteresis loop in an OMIEC/OECT system.',
      caption: 'Molecular state variables, transport kernels, and history-dependent OECT response in a single multiscale picture.',
      notes: [
        {
          label: 'Mechanism',
          body: 'Separate reversible charging from ion trapping, slow morphology relaxation, and redox-state-dependent electronic transport.'
        },
        {
          label: 'Simulation route',
          body: 'Extract coordination, packing, mobility, and relaxation descriptors from atomistic/coarse-grained trajectories.'
        },
        {
          label: 'Model output',
          body: 'Map microscopic descriptors into device-scale observables that retain electrochemical memory and protocol dependence.'
        }
      ],
      tags: ['OMIEC/OECT', 'electrochemical hysteresis', 'ion–electron coupling', 'transport kernels', 'multiscale modeling']
    },
    {
      kicker: 'Current project · vitrimer / polymer physics',
      title: 'Theoretical simulation of vitrimers and dynamic polymer networks',
      lead:
        'This project treats vitrimers as polymer-physics systems in which dynamic covalent exchange changes topology, relaxation spectra, and failure pathways. The goal is to distinguish chemical exchange events from mechanically active network rearrangements.',
      figure: 'assets/img/research/vitrimer-polymer-physics-toc.svg',
      alt: 'TOC-style schematic of a dynamic covalent polymer network with bond exchange, stress-bearing paths, and topology descriptors.',
      caption: 'Dynamic network topology as the link between bond exchange, relaxation, healing, and fracture.',
      notes: [
        {
          label: 'Mechanism',
          body: 'Identify which bond exchanges modify load-bearing connectivity and which remain local, topologically neutral events.'
        },
        {
          label: 'Simulation route',
          body: 'Combine dynamic-bond molecular simulation with graph descriptors, stress-path analysis, and polymer-network theory.'
        },
        {
          label: 'Model output',
          body: 'Relate exchange chemistry and network topology to relaxation, self-healing, toughness, and failure modes.'
        }
      ],
      tags: ['vitrimer', 'dynamic covalent bonds', 'polymer-network theory', 'topology', 'relaxation / fracture']
    },
    {
      kicker: 'Current project · scientific computing',
      title: 'Scientific computing software and algorithms for simulation-to-model workflows',
      lead:
        'This project develops compact software for molecular-simulation analysis: trajectory processing, descriptor extraction, graph/network metrics, transport and rheology kernels, and reproducible interfaces between molecular data and continuum models.',
      figure: 'assets/img/research/scientific-computing-toc.svg',
      alt: 'TOC-style schematic showing a trajectory-to-descriptor-to-kernel-to-model software workflow with provenance and validation layers.',
      caption: 'A trajectory-to-model workflow in which descriptors, kernels, provenance, and validation are explicit objects.',
      notes: [
        {
          label: 'Object',
          body: 'Define each computational product explicitly: descriptor, kernel, observable, uncertainty, provenance record, or boundary condition.'
        },
        {
          label: 'Algorithmic route',
          body: 'Build reusable modules for analysis registries, graph metrics, kernel extraction, and simulation-data reduction.'
        },
        {
          label: 'Model output',
          body: 'Produce auditable workflows that are portable across projects instead of being single-use analysis scripts.'
        }
      ],
      tags: ['scientific software', 'trajectory analysis', 'descriptor extraction', 'kernel methods', 'reproducible workflows']
    }
  ],
  archive: [
    {
      title: 'Conductive percolation',
      body: 'Nanorod polydispersity, mixed fillers, and insulating additives as variables controlling system-spanning conductive paths.'
    },
    {
      title: 'Rheology of filled polymers',
      body: 'Filler geometry, loading, and interfacial interaction as microscopic controls on reinforcement and shear response.'
    },
    {
      title: 'Viscoelastic response',
      body: 'Molecular relaxation, modulus evolution, and time-dependent mechanical response in polymer and filled-polymer systems.'
    },
    {
      title: 'Thermal transport',
      body: 'Interfacial defects and local polymer organization as regulators of heat transfer in polymer nanocomposites.'
    },
    {
      title: 'Glass-transition dynamics',
      body: 'Pressure- and history-dependent structural relaxation during vitrification and polymer glass formation.'
    },
    {
      title: 'Fracture in networks',
      body: 'Microscopic failure, crack deflection, and toughness in cross-linked and interpenetrating polymer networks.'
    }
  ]
};

function createNotes(notes) {
  const grid = document.createElement('div');
  grid.className = 'research-note-grid-v4';
  notes.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'research-note-v4';
    const label = document.createElement('strong');
    label.textContent = item.label;
    const body = document.createElement('span');
    body.textContent = item.body;
    card.append(label, body);
    grid.appendChild(card);
  });
  return grid;
}

function createTags(tags) {
  const row = document.createElement('div');
  row.className = 'research-tag-row-v4';
  tags.forEach((tag) => {
    const span = document.createElement('span');
    span.textContent = tag;
    row.appendChild(span);
  });
  return row;
}

function createDirection(direction, index) {
  const article = document.createElement('article');
  article.className = `glass-card academic-card research-core-card-v4 research-core-${index + 1}`;
  article.setAttribute('data-reveal', '');

  const copy = document.createElement('div');
  copy.className = 'research-core-copy-v4';

  const kicker = document.createElement('span');
  kicker.className = 'meta-chip research-core-kicker-v4';
  kicker.textContent = direction.kicker;

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = direction.title;

  const lead = document.createElement('p');
  lead.className = 'lead research-core-lead-v4';
  lead.textContent = direction.lead;

  copy.append(kicker, title, lead, createNotes(direction.notes), createTags(direction.tags));

  const figure = document.createElement('figure');
  figure.className = 'research-toc-figure-v4';
  const img = document.createElement('img');
  img.src = direction.figure;
  img.alt = direction.alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  const caption = document.createElement('figcaption');
  caption.textContent = direction.caption;
  figure.append(img, caption);

  article.append(copy, figure);
  return article;
}

function renderResearchPage() {
  const intro = document.getElementById('research-intro');
  const directions = document.getElementById('research-directions');
  const archive = document.getElementById('research-archive-list');
  if (!directions || !archive) return;

  if (intro) intro.textContent = RESEARCH_PAGE.intro;

  directions.innerHTML = '';
  RESEARCH_PAGE.directions.forEach((direction, index) => {
    directions.appendChild(createDirection(direction, index));
  });

  archive.innerHTML = '';
  RESEARCH_PAGE.archive.forEach((item) => {
    const block = document.createElement('article');
    block.className = 'research-foundation-item-v4';
    const h = document.createElement('h3');
    h.textContent = item.title;
    const p = document.createElement('p');
    p.textContent = item.body;
    block.append(h, p);
    archive.appendChild(block);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.research);
  activateNav('research');
  smoothScrollForHashes();
  renderResearchPage();
  initReveal();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'subtle', density: 0.64 });
});
