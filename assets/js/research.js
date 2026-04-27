import { pageMeta } from './site-data.js';
import { activateNav, initReveal, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const RESEARCH_PAGE = {
  intro:
    'My research centers on molecular simulation and theory for polymeric systems whose macroscopic response is governed by slow internal variables: ion–electron coupling, network topology, segmental relaxation, and transport pathways. The aim is to convert trajectories into physically interpretable mechanisms and reusable multiscale models.',
  directions: [
    {
      kicker: 'Primary direction · OMIEC/OECT',
      title: 'Multiscale simulation of electrochemical hysteresis in OMIECs and OECTs',
      lead:
        'The main project asks how organic mixed ionic–electronic conductors remember electrochemical history. I focus on the coupled dynamics of ion insertion, electronic doping, polymer morphology, solvent/plasticization, and slow structural relaxation in OMIEC films and OECT-like device environments.',
      paragraphs: [
        'The scientific target is not merely to fit a hysteresis loop. It is to identify state variables that carry memory: local ion coordination, redox-state-dependent packing, morphology-dependent mobility, charge-compensation environments, and relaxation modes that persist after the driving voltage changes.',
        'The modeling strategy is multiscale. Molecular and coarse-grained simulations provide descriptors and kernels; continuum electrochemical models then test which microscopic mechanisms can reproduce transient, cyclic, and history-dependent observables without losing physical meaning.'
      ],
      methods: [
        'coarse-grained / atomistic MD',
        'simulation-derived transport kernels',
        'state-variable hysteresis models',
        'OECT-scale electrochemical closure'
      ],
      outputs: [
        'memory descriptors',
        'ion/electron coupling mechanisms',
        'interpretable device-level observables'
      ],
      questions: [
        'Which microscopic variables are sufficient to represent OMIEC electrochemical memory?',
        'How can ion trapping, morphology relaxation, and reversible charging be separated mechanistically?',
        'How should molecular information enter OECT-scale models without becoming a black-box fit?'
      ]
    },
    {
      kicker: 'Secondary direction · vitrimer and polymer physics',
      title: 'Theoretical simulation of vitrimers and dynamic polymer networks',
      lead:
        'A second research line studies how exchangeable bonds, topology, and local mechanical pathways control the response of vitrimer-like and other dynamic polymer networks.',
      paragraphs: [
        'For dynamic networks, the central object is connectivity under deformation. Bond exchange may relax stress, repair damage, or redirect fracture depending on whether the exchanged bonds belong to stress-bearing paths, bridge motifs, interfaces, or mechanically inactive local structures.',
        'I use topology-aware molecular simulation and graph descriptors to connect microscopic exchange events with macroscopic signatures such as healing, fracture resistance, relaxation, and network reorganization.'
      ],
      methods: [
        'dynamic-bond molecular simulation',
        'network and graph descriptors',
        'fracture / healing trajectory analysis',
        'polymer-physics theory'
      ],
      outputs: [
        'topological transition metrics',
        'stress-bearing pathway descriptors',
        'mechanistic rules for healing and failure'
      ],
      questions: [
        'Which bond-exchange events repair mechanically relevant connectivity?',
        'When does topology preservation matter more than local bond strength?',
        'How do interfaces and fillers reshape crack initiation, crack deflection, and recovery?'
      ]
    },
    {
      kicker: 'Method direction · scientific computing',
      title: 'Scientific computing software and algorithms for simulation-to-model workflows',
      lead:
        'The software layer is treated as part of the research method: it determines whether a simulation result remains reproducible, extensible, and useful beyond a single project-specific script.',
      paragraphs: [
        'I develop lightweight tools that transform trajectories into audited observables, physical descriptors, transport kernels, and model-ready datasets. The emphasis is on transparent assumptions, recoverable provenance, and reusable algorithms rather than decorative visualization.',
        'The long-term goal is a compact computational stack that lets molecular simulation, statistical-mechanical interpretation, and continuum modeling communicate through clean data structures and physically meaningful abstractions.'
      ],
      methods: [
        'trajectory-analysis engines',
        'observable registries',
        'kernel extraction algorithms',
        'reproducible command-line workflows'
      ],
      outputs: [
        'PILOTS-style analysis infrastructure',
        'rheology / transport analysis tools',
        'model-linkage utilities'
      ],
      questions: [
        'Which abstractions make new physical observables easy to add?',
        'How can trajectory-derived quantities preserve uncertainty and provenance?',
        'What is the minimal architecture needed for robust multiscale modeling?'
      ]
    }
  ],
  archive: [
    {
      title: 'Conductive percolation',
      body: 'Nanorod polydispersity, mixed fillers, and non-conductive additives as controls on system-spanning transport networks.'
    },
    {
      title: 'Rheology and viscoelasticity',
      body: 'Filler shape, size, loading, and interaction strength as molecular origins of reinforcement and shear response.'
    },
    {
      title: 'Thermal transport',
      body: 'Interfacial defects and local polymer organization as regulators of heat transfer in polymer nanocomposites.'
    },
    {
      title: 'Fracture and glass-transition dynamics',
      body: 'Cross-linked-network failure and pressure-dependent vitrification as earlier foundations for current polymer-physics work.'
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

function createTagPanel(title, items) {
  const section = document.createElement('section');
  section.className = 'research-tag-panel';
  const h = document.createElement('h3');
  h.textContent = title;
  const list = document.createElement('div');
  list.className = 'research-tag-list';
  items.forEach((item) => {
    const span = document.createElement('span');
    span.textContent = item;
    list.appendChild(span);
  });
  section.append(h, list);
  return section;
}

function createDirection(direction, index) {
  const article = document.createElement('article');
  article.className = 'glass-card academic-card research-direction research-direction-v3';
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

  const panel = document.createElement('aside');
  panel.className = 'research-method-panel';
  const ordinal = document.createElement('div');
  ordinal.className = 'research-ordinal';
  ordinal.textContent = String(index + 1).padStart(2, '0');
  const panelTitle = document.createElement('h3');
  panelTitle.textContent = 'Method lens';
  const panelText = document.createElement('p');
  panelText.textContent = 'Mechanism-first modeling: reduce simulation trajectories into descriptors, kernels, and testable observables.';
  panel.append(ordinal, panelTitle, panelText, createTagPanel('Methods', direction.methods), createTagPanel('Outputs', direction.outputs));

  article.append(copy, panel);
  return article;
}

function renderResearchPage() {
  const intro = document.getElementById('research-intro');
  const directions = document.getElementById('research-directions');
  const archive = document.getElementById('research-archive-list');
  if (!intro || !directions || !archive) return;

  intro.textContent = RESEARCH_PAGE.intro;
  directions.innerHTML = '';
  RESEARCH_PAGE.directions.forEach((direction, index) => directions.appendChild(createDirection(direction, index)));

  archive.innerHTML = '';
  RESEARCH_PAGE.archive.forEach((item) => {
    const block = document.createElement('article');
    block.className = 'archive-item archive-item-v3';
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
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'subtle', density: 0.68 });
});
