import { experienceTimeline, pageMeta, profile } from './site-data.js';
import { activateNav, initReveal, renderLinkRow, renderTagList, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

function tryLoadPortrait(img, candidates) {
  const queue = [...candidates];
  const next = () => {
    if (!queue.length) return;
    const src = queue.shift();
    const probe = new Image();
    probe.onload = () => {
      img.src = src;
      img.alt = `${profile.name} portrait`;
    };
    probe.onerror = next;
    probe.src = src;
  };
  next();
}

function renderHero() {
  document.getElementById('hero-kicker').textContent = profile.heroKicker;
  document.getElementById('hero-name').textContent = profile.name;
  document.getElementById('hero-title').textContent = `${profile.shortTitle} · ${profile.affiliation}`;
  document.getElementById('hero-summary').textContent = profile.heroSummary;
  renderTagList(document.getElementById('focus-tags'), profile.focusAreas.slice(0, 4));
  renderLinkRow(document.getElementById('hero-links'), profile.links.slice(0, 5), 'ghost');
}

function renderExperience() {
  const panel = document.getElementById('experience-panel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="experience-panel-head">
      <span class="meta-chip">Experience</span>
      <p class="experience-panel-copy">Training, advising, and current affiliation in one compact block.</p>
    </div>
    <div class="experience-list"></div>
    <div class="experience-link-row"></div>
  `;

  const list = panel.querySelector('.experience-list');
  experienceTimeline.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'experience-item';
    row.innerHTML = `
      <div class="experience-period">${item.period}</div>
      <div class="experience-body">
        <strong>${item.title}</strong>
        <span>${item.detail}</span>
        <p>${item.body}</p>
      </div>
    `;
    list.appendChild(row);
  });

  renderLinkRow(
    panel.querySelector('.experience-link-row'),
    profile.links.filter((link) => ['ORCID', 'Google Scholar', 'Whitmer Group'].includes(link.label)),
    'secondary'
  );
}

function initExperienceToggle() {
  const button = document.getElementById('experience-toggle');
  const panel = document.getElementById('experience-panel');
  if (!button || !panel) return;

  const setOpen = (open) => {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.classList.toggle('is-open', open);
    panel.classList.toggle('open', open);
    if (open) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', '');
    }
  };

  setOpen(false);
  button.addEventListener('click', () => {
    const next = panel.hasAttribute('hidden');
    setOpen(next);
    if (next) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function initPortrait() {
  const portrait = document.getElementById('hero-portrait');
  if (!portrait) return;
  const candidates = profile.portraitCandidates?.length ? profile.portraitCandidates : [profile.portrait];
  tryLoadPortrait(portrait, candidates);
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.index);
  activateNav('home');
  smoothScrollForHashes();
  initPortrait();
  renderHero();
  renderExperience();
  initExperienceToggle();
  initReveal();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'hero', density: 1.08 });
});
