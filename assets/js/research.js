import { pageMeta } from './site-data.js';
import { activateNav, initReveal, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const RESEARCH_PAGE = {
  intro:
    'My research is organized around three current directions: multiscale simulation of electrochemical hysteresis in OMIEC/OECT systems, theoretical molecular simulation of vitrimers and polymer physics, and scientific computing algorithms that turn trajectories into interpretable descriptors, kernels, and reusable models.',
  directions: [
    {
      kicker: 'Primary direction · OMIEC / OECT',
      title: 'Multiscale simulation of electrochemical hysteresis in OMIECs and OECTs',
      lead:
        'The central project is to explain how organic mixed ionic–electronic conductors store electrochemical history. Rather than treating hysteresis as a curve-fitting artifact, I treat it as a mechanistic consequence of coupled ion insertion, electronic doping, polymer morphology, solvent/plasticization, and slow structural relaxation.',
      figure: 'assets/img/research/omiec-oect-hysteresis-toc.svg',
      alt: 'TOC-style schematic showing ion insertion, mixed ionic-electronic transport, morphology relaxation, and a hysteresis loop in an OMIEC/OECT system.',
      caption: 'A molecular-to-device view of electrochemical memory in OMIEC/OECT systems.',
      notes: [
        {
          label: 'Mechanistic target',
          body: 'Identify the microscopic state variables that carry electrochemical memory: ion coordination, morphology-dependent mobility, redox-state packing, and relaxation modes.'
        },
        {
          label: 'Modeling route',
          body: 'Use atomistic/coarse-grained simulation to extract descriptors and transport kernels, then test them in history-dependent electrochemical closure models.'
        },
        {
          label: 'Desired output',
          body: 'Interpretable OECT-scale observables that separate ion trapping, reversible charging, morphology relaxation, and electronic transport response.'
        }
      ],
      tags: ['OMIEC/OECT', 'electrochemical hysteresis', 'mixed transport', 'state variables', 'multiscale closure']
    },
    {
      kicker: 'Secondary direction · vitrimer / polymer physics',
      title: 'Theoretical simulation of vitrimers and dynamic polymer networks',
      lead:
        'A second direction studies how exchangeable bonds and evolving network topology control stress relaxation, self-healing, fracture resistance, and long-time polymer-network mechanics. The emphasis is on polymer-physics interpretation rather than phenomenological fitting alone.',
      figure: 'assets/img/research/vitrimer-polymer-physics-toc.svg',
      alt: 'TOC-style schematic of a dynamic covalent polymer network with bond exchange, stress-bearing paths, and topology descriptors.',
      caption: 'Dynamic covalent topology as a route from molecular exchange events to macroscopic polymer mechanics.',
      notes: [
        {
          label: 'Mechanistic target',
          body: 'Distinguish bond exchanges that repair mechanically relevant connectivity from local exchanges that do not alter load-bearing topology.'
        },
        {
          label: 'Modeling route',
          body: 'Combine dynamic-bond molecular simulation, topology-aware graph descriptors, stress-path analysis, and polymer-network theory.'
        },
        {
          label: 'Desired output',
          body: 'Rules connecting exchange chemistry, network topology, relaxation spectra, healing, and fracture/failure pathways.'
        }
      ],
      tags: ['vitrimer', 'dynamic bonds', 'polymer physics', 'network topology', 'relaxation / fracture']
    },
    {
      kicker: 'Method direction · scientific computing',
      title: 'Scientific computing software and algorithms for simulation-to-model workflows',
      lead:
        'The software direction develops the analysis infrastructure needed for reliable molecular simulation research: reproducible trajectory processing, descriptor extraction, transport/rheology kernels, uncertainty-aware observables, and clean interfaces between molecular data and continuum models.',
      figure: 'assets/img/research/scientific-computing-toc.svg',
      alt: 'TOC-style schematic showing a trajectory-to-descriptor-to-kernel-to-model software workflow with provenance and validation layers.',
      caption: 'A compact computational stack for translating simulation trajectories into model-ready physical objects.',
      notes: [
        {
          label: 'Mechanistic target',
          body: 'Make the computational object explicit: descriptor, kernel, graph metric, observable, uncertainty, provenance, or model boundary condition.'
        },
        {
          label: 'Algorithmic route',
          body: 'Build lightweight, reusable tools for trajectory analysis, observable registries, graph/network metrics, and kernel extraction.'
        },
        {
          label: 'Desired output',
          body: 'Portable simulation-to-model workflows that are auditable, extensible, and useful beyond a single project-specific script.'
        }
      ],
      tags: ['trajectory analysis', 'descriptor registry', 'kernel extraction', 'provenance', 'reusable algorithms']
    }
  ],
  archive: [
    {
      title: 'Conductive percolation',
      body: 'Nanorod polydispersity, mixed fillers, and nonconductive additives as controls on system-spanning conductive pathways.'
    },
    {
      title: 'Rheology of filled polymers',
      body: 'How filler size, shape, loading, and interaction strength reorganize reinforcement and shear response.'
    },
    {
      title: 'Viscoelastic response',
      body: 'Molecular origins of relaxation, modulus evolution, and time-dependent mechanical response in polymer systems.'
    },
    {
      title: 'Thermal transport',
      body: 'How interfacial defects and local polymer organization regulate heat transfer in polymer nanocomposites.'
    },
    {
      title: 'Glass-transition dynamics',
      body: 'Pressure- and history-dependent structural relaxation during vitrification and polymer glass formation.'
    },
    {
      title: 'Fracture in networks',
      body: 'Microscopic failure, crack deflection, and toughness mechanisms in cross-linked and interpenetrating polymer networks.'
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
  if (!intro || !directions || !archive) return;

  intro.textContent = RESEARCH_PAGE.intro;

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
