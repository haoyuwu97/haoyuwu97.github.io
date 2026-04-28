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
      title: 'Molecular Dynamics Simulation and Theoretical Research on Viscoelasticity and Topology of Vitrimers',
      lead:
        'This project studies vitrimer networks by molecular dynamics and theoretical polymer physics. The emphasis is on viscoelastic relaxation, topology exchange, stress-bearing connectivity, and the distinction between local bond exchange and network-level rearrangement.',
      figure: 'assets/img/research/vitrimer-polymer-physics-toc.svg',
      alt: 'TOC-style schematic of a dynamic covalent polymer network with bond exchange, stress-bearing paths, and topology descriptors.',
      caption: 'Dynamic network topology as the link between bond exchange, relaxation, healing, and fracture.',
      notes: [
        {
          label: 'Mechanism',
          body: 'Identify which exchange events change load-bearing paths, relaxation spectra, and long-range network topology.'
        },
        {
          label: 'Simulation route',
          body: 'Combine dynamic-bond molecular simulation, topology descriptors, stress-correlation analysis, and polymer-network theory.'
        },
        {
          label: 'Model output',
          body: 'Relate exchange kinetics and topology evolution to viscoelasticity, self-healing, toughness, and fracture modes.'
        }
      ],
      tags: ['vitrimer', 'dynamic covalent bonds', 'polymer-network theory', 'topology', 'relaxation / fracture']
    },
    {
      kicker: 'Current project · scientific computing',
      title: 'Scientific computing software and algorithms',
      lead:
        'This project develops scientific software for simulation data reduction, trajectory analysis, descriptor extraction, graph metrics, transport kernels, viscoelastic analysis, and reproducible coupling between molecular observables and higher-level models.',
      figure: 'assets/img/research/scientific-computing-toc.svg',
      alt: 'TOC-style schematic showing a trajectory-to-descriptor-to-kernel-to-model software workflow with provenance and validation layers.',
      caption: 'A trajectory-to-model workflow in which descriptors, kernels, provenance, and validation are explicit objects.',
      notes: [
        {
          label: 'Object',
          body: 'Define computational products explicitly: descriptors, kernels, observables, uncertainty estimates, provenance records, and boundary-condition inputs.'
        },
        {
          label: 'Algorithmic route',
          body: 'Build reusable modules for trajectory readers, analysis registries, graph metrics, kernel extraction, and simulation-data reduction.'
        },
        {
          label: 'Model output',
          body: 'Produce auditable analysis workflows that remain portable across projects rather than becoming one-off post-processing scripts.'
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
      body: 'Time-dependent modulus, relaxation spectra, and stress correlation analysis in polymer and filled-polymer systems.'
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
      body: 'Microscopic damage, crack deflection, and fracture-energy pathways in cross-linked and interpenetrating polymer networks.'
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
