import { pageMeta } from './site-data.js';
import { activateNav, initReveal, renderTagList, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const RESEARCH_PAGE = {
  intro:
    'The current research program combines polymer-network mechanics with mixed ionic/electronic transport, while earlier work built complementary expertise in polymer informatics, nanocomposite transport, and rheology.',
  currentProjects: [
    {
      kicker: 'Current project',
      title: 'Electrochemical hysteresis in organic mixed ionic–electronic conductors (OMIECs)',
      lead:
        'This project develops a multiscale simulation-and-theory framework for OMIECs, with particular emphasis on the microscopic origin of electrochemical hysteresis and its translation into continuum and device metrics.',
      paragraphs: [
        'The central question is how ionic motion, electronic motion, microstructural evolution, and electrostatic boundary conditions jointly generate history dependence during charging and discharging. The work therefore combines molecularly resolved models with electrochemically faithful boundary treatments so that simulated state variables remain physically interpretable rather than merely descriptive.',
        'A second objective is methodological: to identify reduced observables and free-energy representations that can be transferred from molecular simulation to mesoscale and device-scale descriptions. The intended outcome is a predictive framework for comparing OMIEC chemistries, hydration states, morphologies, and operating protocols on the same thermodynamically consistent footing.'
      ],
      tags: ['OMIEC', 'electrochemical hysteresis', 'mixed transport', 'multiscale modeling'],
      figure: {
        src: 'assets/img/research/omiec-transport.svg',
        alt: 'Schematic for mixed ionic-electronic transport in OMIECs',
        caption: 'Current project: coupled ionic/electronic transport, electrochemical history dependence, and multiscale closure in OMIECs.'
      }
    },
    {
      kicker: 'Current project',
      title: 'Topological reorganization, viscoelasticity, and damage recovery in vitrimers',
      lead:
        'A second active direction examines how bond-exchange chemistry and network topology reorganize load-bearing pathways, viscoelastic relaxation, fracture processes, and post-damage recovery in vitrimer systems.',
      paragraphs: [
        'The emphasis is mechanistic: which exchange events alter connectivity in a mechanically meaningful way, which topological motifs stabilize or weaken the response, and how interface-mediated exchange changes crack initiation, crack deflection, and healing trajectories.',
        'By combining network-level descriptors with molecular simulation, the project aims to distinguish reversible topological reorganization from simple softening and to connect microscopic rearrangements with viscoelastic signatures that can support constitutive interpretation.'
      ],
      tags: ['vitrimers', 'dynamic networks', 'viscoelasticity', 'fracture'],
      figure: {
        src: 'assets/img/publications/vitrimer-topological-transition-2024.png',
        alt: 'Vitrimer mechanics and exchangeable-interface schematic',
        caption: 'Current project: topological transition, viscoelastic response, fracture, and self-healing in vitrimer composites.'
      }
    }
  ],
  oldProjects: [
    {
      kicker: 'Earlier research theme',
      title: 'Machine-learning prediction of polymer structure–property relations',
      lead:
        'One earlier branch of the work explored how chemically and physically meaningful descriptors can be used to predict polymer properties with interpretable machine-learning models.',
      paragraphs: [
        'The objective was not to treat machine learning as a black-box substitute for physics. Instead, the focus was on descriptor design, dataset curation, and identifying which chemistry- and structure-level variables carry predictive signal for target properties such as glass-transition temperature.',
        'That effort now informs current work on reduced-order modeling and surrogate construction, especially when multiscale problems require a compact but physically defensible mapping from high-dimensional simulation outputs to experimentally relevant observables.'
      ],
      tags: ['polymer informatics', 'structure–property mapping', 'glass transition', 'interpretable ML'],
      figure: {
        src: 'assets/img/publications/ml-tg-sbr-2026.png',
        alt: 'Machine-learning summary for polymer property prediction',
        caption: 'Earlier research theme: descriptor-based prediction of polymer properties with an emphasis on interpretability.'
      }
    },
    {
      kicker: 'Earlier research theme',
      title: 'Electrical percolation and thermal conduction in polymer nanocomposites',
      lead:
        'A substantial earlier program examined how filler morphology, polydispersity, mixed-filler organization, and interfacial quality control transport in polymer nanocomposites.',
      paragraphs: [
        'The electrical-transport side focused on conductive percolation, including rod-like filler networks and the way non-conductive additives or mixed-filler populations reorganize connectivity. The thermal-transport side examined how surface defects and interfaces modify effective heat-conduction pathways in filled polymers.',
        'Across both cases, the recurring conclusion was that transport is governed by network structure and interfacial physics rather than filler loading alone. The work therefore emphasized morphology-resolved interpretation instead of empirical trend fitting.'
      ],
      tags: ['percolation', 'electrical transport', 'thermal conduction', 'nanocomposites'],
      figure: {
        src: 'assets/img/publications/percolation-polydisperse-nanorods-2020.jpg',
        alt: 'Percolation and nanocomposite transport schematic',
        caption: 'Earlier research theme: morphology-controlled electrical and thermal transport in polymer nanocomposites.'
      }
    },
    {
      kicker: 'Earlier research theme',
      title: 'Rheology and viscoelasticity of polymer nanocomposites',
      lead:
        'A parallel research line investigated how filler size, shape, and local organization reshape chain relaxation and the rheological response of filled polymer systems.',
      paragraphs: [
        'These studies linked macroscopic viscoelastic signatures to microscopic constraints on chain motion, filler-induced heterogeneity, and the evolution of local polymer environments under deformation or thermal variation.',
        'The broader value of this work was methodological as well as scientific: it established a consistent habit of interpreting rheology through underlying structure and dynamics rather than treating constitutive curves as self-contained observables.'
      ],
      tags: ['rheology', 'viscoelasticity', 'chain dynamics', 'filled polymers'],
      figure: {
        src: 'assets/img/publications/rheological-mechanism-spherical-np-2021.jpg',
        alt: 'Rheology and viscoelastic reinforcement figure',
        caption: 'Earlier research theme: filler-controlled relaxation and viscoelastic reinforcement in polymer nanocomposites.'
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
