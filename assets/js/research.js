import { pageMeta } from './site-data.js';
import { activateNav, initReveal, renderTagList, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const RESEARCH_PAGE = {
  intro:
    'The present agenda is organized around two current projects, while earlier project lines are grouped into three mechanistic themes that still shape how I think about polymer structure–property relations.',
  currentProjects: [
    {
      kicker: 'Current project 01',
      title: 'Vitrimer mechanics, damage localization, and topological reorganization',
      lead:
        'This project asks how exchangeable interfaces and network topology redistribute stress, delay or accelerate fracture, and reopen a route to healing once damage has already localized.',
      paragraphs: [
        'The emphasis is not only on whether a vitrimer heals, but on which microscopic rearrangements preserve load-bearing pathways and which merely reshuffle damage. That requires following bond exchange, interface-mediated stress transfer, and the topology of the evolving network at the same time.',
        'The goal is a mechanistic picture of how dynamic exchange changes fracture trajectories, post-damage recovery, and the structural signatures that distinguish reversible topological repair from simple softening.'
      ],
      tags: ['vitrimers', 'fracture', 'self-healing', 'dynamic exchange'],
      figure: {
        src: 'assets/img/publications/vitrimer-topological-transition-2024.png',
        alt: 'Vitrimer mechanics and exchangeable-interface schematic',
        caption: 'Current project line: exchangeable interfaces, fracture pathways, and self-healing in vitrimer composites.'
      }
    },
    {
      kicker: 'Current project 02',
      title: 'OMIEC transport, electrochemical hysteresis, and multiscale closure',
      lead:
        'A second active line studies organic mixed ionic-electronic conductors, with the aim of linking molecular observables to mesoscopic transport response and hysteretic device behavior.',
      paragraphs: [
        'The immediate challenge is that ionic motion, electronic motion, morphology, and nonequilibrium charging are strongly coupled. Useful models therefore need both physically interpretable state variables and a clean bridge from microscopic simulation to continuum-scale transport descriptions.',
        'The work focuses on building that bridge: extracting the right observables, understanding which microscopic bottlenecks control mixed transport, and turning those kernels into device-relevant models rather than isolated simulation snapshots.'
      ],
      tags: ['OMIEC', 'mixed transport', 'electrochemistry', 'hysteresis'],
      figure: {
        src: 'assets/img/research/omiec-transport.svg',
        alt: 'Schematic for mixed ionic-electronic transport in OMIECs',
        caption: 'Current project line: coupled ionic and electronic pathways, charging fronts, and transport closure in OMIECs.'
      }
    }
  ],
  oldProjects: [
    {
      kicker: 'Earlier line 01',
      title: 'Machine-learning prediction of polymer structure–property relations',
      lead:
        'One earlier branch explored how polymer descriptors and curated simulation-informed data can be used to predict properties such as glass-transition temperature with interpretable machine-learning models.',
      paragraphs: [
        'The point was not to replace physics with black-box fitting. Instead, the aim was to test which descriptors carry enough mechanistic signal to support useful prediction, screening, and comparison across polymer families.',
        'That work now feeds directly into current interests in transport and device modeling, where data reduction and model selection matter just as much as simulation fidelity.'
      ],
      tags: ['machine learning', 'structure–property', 'glass transition', 'prediction'],
      figure: {
        src: 'assets/img/publications/ml-tg-sbr-2026.png',
        alt: 'Machine-learning summary for polymer property prediction',
        caption: 'Earlier project line: descriptor-based prediction of polymer properties.'
      }
    },
    {
      kicker: 'Earlier line 02',
      title: 'Transport in polymer nanocomposites: electrical percolation and thermal conduction',
      lead:
        'Another earlier branch focused on transport in polymer nanocomposites, especially how filler geometry, polydispersity, connectivity, and interfacial defects generate or suppress system-spanning pathways.',
      paragraphs: [
        'This included conductive-percolation questions for rod-like fillers and mixed networks, together with thermal-transport questions in systems where interfacial defects and filler dispersion determine the effective response.',
        'Across both conduction and thermal transport, the recurring theme was that morphology is not a decorative detail. It is the transport problem itself, because the useful pathways are created or destroyed by structure.'
      ],
      tags: ['percolation', 'thermal transport', 'nanocomposites', 'connectivity'],
      figure: {
        src: 'assets/img/publications/percolation-polydisperse-nanorods-2020.jpg',
        alt: 'Percolation and nanocomposite transport schematic',
        caption: 'Earlier project line: connectivity-driven transport in polymer nanocomposites.'
      }
    },
    {
      kicker: 'Earlier line 03',
      title: 'Rheology and viscoelastic reinforcement in polymer nanocomposites',
      lead:
        'A third earlier branch asked how filler shape, size, and local organization reshape the rheological and viscoelastic response of polymer matrices.',
      paragraphs: [
        'These studies linked emergent viscoelastic signatures to microscopic rearrangement, particle-induced constraints on chain motion, and the evolving structure of filled-polymer microenvironments.',
        'That line of work built the habit of reading mechanical response mechanistically rather than phenomenologically: the constitutive curve only becomes meaningful when its structural origin is identified.'
      ],
      tags: ['rheology', 'viscoelasticity', 'nanofillers', 'mechanism'],
      figure: {
        src: 'assets/img/publications/rheological-mechanism-spherical-np-2021.jpg',
        alt: 'Rheology and viscoelastic reinforcement figure',
        caption: 'Earlier project line: rheological and viscoelastic consequences of nanofiller-induced microstructure.'
      }
    }
  ]
};

function createFigure(figure, extraClass = '') {
  const wrapper = document.createElement('figure');
  wrapper.className = `research-project-figure ${extraClass}`.trim();
  wrapper.innerHTML = `
    <div class="research-figure-media research-project-media">
      <img class="research-figure-image" src="${figure.src}" alt="${figure.alt}" loading="lazy" decoding="async" />
    </div>
    <figcaption class="research-figure-caption">${figure.caption}</figcaption>
  `;
  return wrapper;
}

function createCurrentCard(project, reverse = false) {
  const article = document.createElement('article');
  article.className = 'research-current-card';
  article.dataset.reveal = '';

  const shell = document.createElement('div');
  shell.className = `research-current-shell${reverse ? ' reverse' : ''}`;

  const copy = document.createElement('div');
  copy.className = 'research-project-copy';
  copy.innerHTML = `
    <span class="kicker">${project.kicker}</span>
    <h3 class="section-title research-project-title">${project.title}</h3>
    <p class="research-direction-lead research-project-lead">${project.lead}</p>
    <div class="research-prose">${project.paragraphs.map((text) => `<p>${text}</p>`).join('')}</div>
    <div class="chip-wrap research-chip-wrap"></div>
  `;
  renderTagList(copy.querySelector('.research-chip-wrap'), project.tags);

  shell.append(copy, createFigure(project.figure));
  article.appendChild(shell);
  return article;
}

function createOldCard(project) {
  const article = document.createElement('article');
  article.className = 'research-archive-card';
  article.dataset.reveal = '';
  article.appendChild(createFigure(project.figure));

  const copy = document.createElement('div');
  copy.className = 'research-project-copy';
  copy.innerHTML = `
    <span class="kicker">${project.kicker}</span>
    <h3 class="section-title research-project-title archive-title">${project.title}</h3>
    <p class="research-direction-lead research-project-lead archive-lead">${project.lead}</p>
    <div class="research-prose archive-prose">${project.paragraphs.map((text) => `<p>${text}</p>`).join('')}</div>
    <div class="chip-wrap research-chip-wrap"></div>
  `;
  renderTagList(copy.querySelector('.research-chip-wrap'), project.tags);
  article.appendChild(copy);
  return article;
}

function renderResearchPage() {
  document.getElementById('research-intro').textContent = RESEARCH_PAGE.intro;

  const current = document.getElementById('current-projects');
  const old = document.getElementById('old-projects');
  current.innerHTML = '';
  old.innerHTML = '';

  RESEARCH_PAGE.currentProjects.forEach((project, index) => {
    current.appendChild(createCurrentCard(project, index % 2 === 1));
  });

  RESEARCH_PAGE.oldProjects.forEach((project) => {
    old.appendChild(createOldCard(project));
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.research);
  activateNav('research');
  smoothScrollForHashes();
  renderResearchPage();
  initReveal();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'subtle', density: 0.92 });
});
