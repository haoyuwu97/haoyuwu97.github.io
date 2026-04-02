import { softwareProjects, softwareGraph, pageMeta } from './site-data.js';
import {
  activateNav,
  initFooterYear,
  initReveal,
  initTilt,
  paginate,
  renderPagination,
  setMeta,
  unique,
  createTagButton,
  smoothScrollForHashes
} from './utils.js';
import { projectCard, renderSoftwareMap } from './renderers.js';
import { initMolecularField } from './background.js';

const state = {
  query: '',
  category: 'All',
  page: 1,
  pageSize: 3
};

function categories() {
  return ['All', ...unique(softwareProjects.map((project) => project.category)).sort((a, b) => a.localeCompare(b))];
}

function filterProjects() {
  const query = state.query.trim().toLowerCase();
  return softwareProjects
    .filter((project) => {
      const searchable = `${project.name} ${project.category} ${project.headline} ${project.cardSummary} ${project.language} ${project.license}`.toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesCategory = state.category === 'All' || project.category === state.category;
      return matchesQuery && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderCategoryFilters() {
  const container = document.getElementById('category-filters');
  container.innerHTML = '';
  categories().forEach((category) => {
    const button = createTagButton(category, category === state.category);
    button.addEventListener('click', () => {
      state.category = category;
      state.page = 1;
      render();
    });
    container.appendChild(button);
  });
}

function render() {
  const filtered = filterProjects();
  const { items, page, totalPages } = paginate(filtered, state.page, state.pageSize);
  state.page = page;

  document.getElementById('repo-total').textContent = `${softwareProjects.length}`;
  document.getElementById('category-total').textContent = `${categories().length - 1}`;
  document.getElementById('repo-results').textContent = `${filtered.length}`;

  const container = document.getElementById('repo-list');
  container.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'glass-card empty-state';
    empty.innerHTML = `
      <h3 class="card-title">No repository matched the current filter.</h3>
      <p class="card-body">Try a shorter keyword or reset the category filter to <strong>All</strong>.</p>
    `;
    container.appendChild(empty);
  } else {
    items.forEach((project) => container.appendChild(projectCard(project)));
  }

  renderCategoryFilters();
  renderPagination(document.getElementById('repo-pagination'), page, totalPages, (nextPage) => {
    state.page = nextPage;
    render();
    document.getElementById('repo-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  initReveal();
  initTilt();
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.wiki);
  activateNav('wiki');
  initFooterYear();
  smoothScrollForHashes();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'page', density: 0.75 });
  renderSoftwareMap(document.getElementById('software-map-container'), softwareProjects, softwareGraph);

  document.getElementById('repo-search').addEventListener('input', (event) => {
    state.query = event.target.value;
    state.page = 1;
    render();
  });

  render();
});
