import { pageMeta, profile } from './site-data.js';
import { activateNav, initReveal, renderLinkRow, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

const PROFILE = {
  ...profile,
  shortTitle: 'Ph.D. Student · Chemical & Biomolecular Engineering',
  affiliation: 'University of Notre Dame',
  heroSummary:
    'I am a chemical engineering Ph.D. student at the University of Notre Dame working at the intersection of molecular simulation, polymer physics, and scientific computing. My primary research is multiscale simulation of OMIEC/OECT systems, with emphasis on electrochemical hysteresis, ionic–electronic coupling, morphology-dependent transport, and physically interpretable state variables. In parallel, I study vitrimer and polymer-physics problems through theoretical molecular simulation and develop reusable algorithms that connect trajectories to mechanics, transport, and device-level models.',
  links: [
    { label: 'Google Scholar', href: 'https://scholar.google.com/citations?hl=en&user=NSpr644AAAAJ' },
    { label: 'ORCID', href: 'https://orcid.org/0000-0002-2805-4911' },
    { label: 'GitHub', href: 'https://github.com/haoyuwu97' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/haoyu-wu-439bba323' },
    { label: 'Whitmer Group', href: 'https://whitmergroup.github.io/people.html' },
    { label: 'Paulsen Website', href: 'https://engineering.nd.edu/faculty/rev-bryan-d-paulsen-s-j/' }
  ]
};

const EXPERIENCE = [
  {
    period: 'Sep. 2024 – Present',
    title: 'Ph.D. Student · University of Notre Dame',
    detail: 'Chemical & Biomolecular Engineering · Advisers: Jonathan K. Whitmer and Rev. Bryan D. Paulsen, S.J.',
    body:
      'Primary project: multiscale simulation of OMIEC/OECT systems and electrochemical hysteresis. Secondary project: theoretical and molecular simulation of vitrimers and broader polymer-physics problems.'
  },
  {
    period: 'Jun. 2023 – Jun. 2024',
    title: 'Research Assistant · Beijing University of Chemical Technology',
    detail: 'Beijing Engineering Research Center of Advanced Elastomers · Supervisor: Xiuying Zhao',
    body:
      'Worked on machine-learning prediction of polyurethane structure–property relationships, connecting polymer composition, molecular descriptors, and mechanical-performance targets.'
  },
  {
    period: 'Sep. 2020 – Jun. 2023',
    title: 'M.S. in Materials Science and Engineering · Beijing University of Chemical Technology',
    detail: 'Adviser: Academician Liqun Zhang · Collaborating adviser: Yangyang Gao',
    body:
      'Master’s research focused on molecular-dynamics simulation of polymer nanocomposites, including conductive percolation, rheology, viscoelasticity, thermal transport, and morphology–property relations.'
  },
  {
    period: 'Sep. 2016 – Jun. 2020',
    title: 'B.E. · Beijing University of Chemical Technology',
    detail: 'Polymer Materials and Engineering',
    body: ''
  }
];

function tryLoadPortrait(img, candidates) {
  const queue = [...candidates];
  const next = () => {
    if (!queue.length) return;
    const src = queue.shift();
    const probe = new Image();
    probe.onload = () => {
      img.src = src;
      img.alt = `${PROFILE.name} portrait`;
    };
    probe.onerror = next;
    probe.src = src;
  };
  next();
}

function renderHero() {
  document.getElementById('hero-name').textContent = PROFILE.name;
  document.getElementById('hero-title').textContent = `${PROFILE.shortTitle} · ${PROFILE.affiliation}`;
  document.getElementById('hero-summary').textContent = PROFILE.heroSummary;
  renderLinkRow(document.getElementById('hero-links'), PROFILE.links, 'ghost');
}

function buildExperiencePanel(panel) {
  if (!panel || panel.dataset.built === 'true') return;
  panel.innerHTML = `
    <div class="experience-panel-head">
      <span class="meta-chip">Academic path</span>
      <p class="experience-panel-copy">Research appointments and education.</p>
    </div>
    <div class="experience-list"></div>
  `;
  const list = panel.querySelector('.experience-list');
  EXPERIENCE.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'experience-item';
    row.innerHTML = `
      <div class="experience-period">${item.period}</div>
      <div class="experience-body">
        <strong>${item.title}</strong>
        <span>${item.detail}</span>
        ${item.body ? `<p>${item.body}</p>` : ''}
      </div>
    `;
    list.appendChild(row);
  });
  panel.dataset.built = 'true';
}

function initExperienceToggle() {
  const button = document.getElementById('experience-toggle');
  const panel = document.getElementById('experience-panel');
  if (!button || !panel) return;

  const setOpen = (open) => {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.classList.toggle('is-open', open);
    panel.classList.toggle('open', open);
    panel.toggleAttribute('hidden', !open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  };

  setOpen(false);
  button.addEventListener('click', () => {
    const next = panel.hasAttribute('hidden');
    if (next) buildExperiencePanel(panel);
    setOpen(next);
    if (next) {
      window.requestAnimationFrame(() => {
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  });
}

function initPortrait() {
  const portrait = document.getElementById('hero-portrait');
  if (!portrait) return;
  const candidates = PROFILE.portraitCandidates?.length ? PROFILE.portraitCandidates : [PROFILE.portrait];
  tryLoadPortrait(portrait, candidates);
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.index);
  activateNav('home');
  smoothScrollForHashes();
  initPortrait();
  renderHero();
  initExperienceToggle();
  initReveal();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'hero', density: 0.96 });
});
