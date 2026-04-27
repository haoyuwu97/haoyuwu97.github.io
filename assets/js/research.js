import { pageMeta } from './site-data.js';
import { activateNav, initReveal, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const RESEARCH_PAGE = {
  intro:
    'My research asks how microscopic organization in polymeric soft matter becomes macroscopic mechanics, transport, and electrochemical response. I combine coarse-grained molecular dynamics, physically interpretable descriptors, and multiscale closure so that simulation output becomes mechanistic explanation rather than only high-dimensional data.',
  directions: [
    {
      kicker: 'Current direction · OMIEC physics',
      title: 'Electrochemical hysteresis in organic mixed ionic–electronic conductors',
      lead:
        'OMIECs couple ion motion, electronic doping, morphology, solvent uptake, and slow structural relaxation. The central problem is not only to reproduce hysteresis, but to identify which microscopic variables remember the past state of the material.',
      paragraphs: [
        'The working strategy is to use molecular and mesoscale observables as state variables: local ion coordination, polymer segmental mobility, electrostatic screening, chain packing, and spatially heterogeneous redox environments. These observables can then be translated into continuum-side kernels that preserve a physical interpretation.',
        'A useful model should separate reversible transport from genuine memory: capacitive charging, ion trapping, morphology-dependent mobility, and redox-state-dependent free energy all leave different signatures in transient experiments.'
      ],
      questions: [
        'Which molecular observables are sufficient state variables for OMIEC memory?',
        'Can simulation-derived kernels distinguish ion trapping from morphology-driven slow relaxation?',
        'How should molecular hysteresis be passed into continuum device models without losing thermodynamic meaning?'
      ],
      image: {
        src: 'assets/img/research/omiec-transport.svg',
        alt: 'Schematic of transport and memory processes in organic mixed ionic-electronic conductors',
        caption: 'The OMIEC direction emphasizes transport, memory, morphology, and simulation-derived closure variables.'
      }
    },
    {
      kicker: 'Current direction · dynamic networks',
      title: 'Vitrimers, exchangeable interfaces, and topology-aware mechanics',
      lead:
        'Dynamic polymer networks can heal, rearrange, and redistribute stress. The key question is which parts of the network actually control integrity: bridge bonds, exchange pathways, filler interfaces, or local damage motifs.',
      paragraphs: [
        'For vitrimer-like systems, topology matters as much as chemistry. Bond exchange can relax stress, but it can also redirect damage if the rearrangement pathway is poorly connected. Simulation is therefore used to identify the structural motifs that mediate fracture, healing, and topological transition.',
        'This direction connects molecular deformation trajectories with graph-based descriptors such as giant-cluster stability, bridge-bond statistics, local coordination, and stress-bearing paths.'
      ],
      questions: [
        'Which exchange events repair mechanically important connectivity rather than merely increasing the number of bonds?',
        'How do filler interfaces reshape crack initiation and crack deflection?',
        'When does topology preservation dominate over local bond strength?'
      ],
      image: {
        src: 'assets/img/publications/vitrimer-topological-transition-2024.png',
        alt: 'Topological transition and healing schematic for vitrimer composites',
        caption: 'Representative visual space for exchangeable interfaces, network topology, fracture, and self-healing.'
      }
    },
    {
      kicker: 'Foundation · connectivity and transport',
      title: 'Percolation, nanofiller morphology, and transport in polymer nanocomposites',
      lead:
        'Transport in filled polymers is controlled by connectivity, excluded volume, interfacial physics, and distributional heterogeneity. A single loading fraction rarely explains the emergent response.',
      paragraphs: [
        'Earlier work established how nanorod polydispersity, mixed fillers, non-conductive additives, and surface defects reorganize system-spanning transport paths. These systems form a natural bridge between statistical mechanics and materials design.',
        'The continuing value of this foundation is methodological: percolation is treated as a measurable object that can be perturbed, visualized, and connected to rheology, conductivity, or thermal response.'
      ],
      questions: [
        'How does filler-size or rod-length distribution shift the onset of percolation?',
        'Which apparent reinforcement trends are geometric, and which are dynamical?',
        'How do defects and interfaces alter transport beyond simple volume-fraction arguments?'
      ],
      image: {
        src: 'assets/img/publications/percolation-polydisperse-nanorods-2020.jpg',
        alt: 'Graphical abstract for percolation of polydisperse nanorods',
        caption: 'Percolation remains a central conceptual tool for connecting morphology to macroscopic response.'
      }
    },
    {
      kicker: 'Method direction · scientific software',
      title: 'Reusable simulation infrastructure for observables and model linkage',
      lead:
        'A simulation result becomes scientific only when the assumptions, transformations, and provenance remain recoverable. I therefore treat software architecture as part of the research method.',
      paragraphs: [
        'The software layer converts trajectories into audited observables, stores the metadata needed for reproducibility, and allows kernels to be passed into higher-level models. This reduces the distance between molecular simulation, statistical inference, and continuum interpretation.',
        'Current tools emphasize modular observables, command-line reproducibility, and clean interfaces between molecular data and transport or rheology models.'
      ],
      questions: [
        'Which abstractions make new observables easy to add while preserving provenance?',
        'How can molecular data be transformed into continuum kernels without becoming a black box?',
        'What is the minimal software architecture needed for reproducible multiscale simulation?'
      ],
      image: {
        src: 'assets/img/logos/pilots.svg',
        alt: 'PILOTS software logo',
        caption: 'The code stack is presented as a research instrument: analysis, closure, and reproducibility are co-designed.'
      }
    }
  ],
  archive: [
    {
      title: 'Glass transition and pressure-dependent dynamics',
      body: 'Molecular dynamics studies of pressure-dependent structure and dynamics in polyisoprene during vitrification.'
    },
    {
      title: 'Viscoelasticity of filled polymers',
      body: 'Simulation analysis of how filler shape, size, and local organization govern reinforcement and rheological response.'
    },
    {
      title: 'Fracture in cross-linked networks',
      body: 'Mechanistic studies of double/interpenetrated networks and nanoparticle-assisted cross-linking for toughness.'
    },
    {
      title: 'Thermal transport at defective interfaces',
      body: 'Molecular interpretation of how surface defects alter interfacial structure and thermal conductivity.'
    }
  ]
};

function textList(items, className) {
  const ul = document.createElement('ul');
  ul.className = className;
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
  return ul;
}

function createDirection(direction) {
  const article = document.createElement('article');
  article.className = 'glass-card academic-card research-direction';
  article.setAttribute('data-reveal', '');

  const copy = document.createElement('div');
  copy.className = 'research-direction-copy';

  const kicker = document.createElement('span');
  kicker.className = 'meta-chip';
  kicker.textContent = direction.kicker;

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = direction.title;

  const lead = document.createElement('p');
  lead.className = 'lead';
  lead.textContent = direction.lead;

  copy.append(kicker, title, lead);
  direction.paragraphs.forEach((paragraph) => {
    const p = document.createElement('p');
    p.className = 'section-text';
    p.textContent = paragraph;
    copy.appendChild(p);
  });

  const qTitle = document.createElement('h3');
  qTitle.className = 'archive-title';
  qTitle.textContent = 'Key questions';
  copy.appendChild(qTitle);
  copy.appendChild(textList(direction.questions, 'research-question-list'));

  const figure = document.createElement('figure');
  figure.className = 'research-figure';
  const img = document.createElement('img');
  img.src = direction.image.src;
  img.alt = direction.image.alt;
  img.loading = 'lazy';
  const caption = document.createElement('figcaption');
  caption.textContent = direction.image.caption;
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
  RESEARCH_PAGE.directions.forEach((direction) => directions.appendChild(createDirection(direction)));

  archive.innerHTML = '';
  RESEARCH_PAGE.archive.forEach((item) => {
    const block = document.createElement('article');
    block.className = 'archive-item';
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
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'subtle', density: 0.72 });
});
