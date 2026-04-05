import { pageMeta, researchDirections } from './site-data.js';
import { activateNav, initReveal, renderTagList, setMeta, smoothScrollForHashes } from './utils.js';
import { initMolecularField } from './background.js';

function renderResearchPage() {
  const intro = document.getElementById('research-intro');
  const count = document.getElementById('research-count');
  const container = document.getElementById('research-directions');
  if (!container) return;

  intro.textContent =
    'The work is organized around three connected scales: polymer-network mechanics, transport and connectivity in filled soft matter, and the software layer that turns trajectories into reproducible observables and model inputs.';
  count.textContent = `${researchDirections.length}`;

  container.innerHTML = '';
  researchDirections.forEach((direction, index) => {
    const article = document.createElement('article');
    article.className = 'glass-card research-direction-card';
    article.dataset.reveal = '';

    const shell = document.createElement('div');
    shell.className = `section-split research-direction-shell${index % 2 ? ' reverse' : ''}`;

    const copy = document.createElement('div');
    copy.className = 'research-direction-copy';
    const paragraphHtml = direction.paragraphs.map((text) => `<p>${text}</p>`).join('');
    const questionHtml = direction.questions.map((question) => `<li>${question}</li>`).join('');
    copy.innerHTML = `
      <span class="kicker">${direction.kicker}</span>
      <h2 class="section-title research-direction-title">${direction.title}</h2>
      <p class="research-direction-lead">${direction.lead}</p>
      <div class="research-prose">${paragraphHtml}</div>
      <div class="chip-wrap research-chip-wrap"></div>
      <div class="research-question-card panel-card">
        <span class="meta-chip">Representative questions</span>
        <ul class="section-list research-question-list">${questionHtml}</ul>
      </div>
    `;
    renderTagList(copy.querySelector('.research-chip-wrap'), direction.keywords);

    const figure = document.createElement('figure');
    figure.className = 'research-figure-panel';
    figure.innerHTML = `
      <div class="research-figure-media">
        <img class="research-figure-image" src="${direction.figure.src}" alt="${direction.figure.alt}" loading="lazy" decoding="async" />
      </div>
      <figcaption class="research-figure-caption">${direction.figure.caption}</figcaption>
    `;

    shell.append(copy, figure);
    article.appendChild(shell);
    container.appendChild(article);
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
