import { publications, pageMeta } from './site-data.js';
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
import { publicationCard } from './renderers.js';
import { initMolecularField } from './background.js';

const state = {
  query: '',
  tag: 'All',
  year: 'All',
  page: 1,
  pageSize: 6
};

function getTagOptions() {
  return ['All', ...unique(publications.flatMap((item) => item.tags)).sort((a, b) => a.localeCompare(b))];
}

function getYearOptions() {
  return ['All', ...unique(publications.map((item) => `${item.year}`)).sort((a, b) => Number(b) - Number(a))];
}

function filterPublications() {
  const query = state.query.trim().toLowerCase();
  return [...publications]
    .filter((item) => {
      const searchable = `${item.title} ${item.authors} ${item.venue} ${item.tags.join(' ')} ${item.blurb}`.toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesTag = state.tag === 'All' || item.tags.includes(state.tag);
      const matchesYear = state.year === 'All' || `${item.year}` === state.year;
      return matchesQuery && matchesTag && matchesYear;
    })
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}

function renderTagFilters() {
  const container = document.getElementById('tag-filters');
  container.innerHTML = '';
  getTagOptions().forEach((tag) => {
    const button = createTagButton(tag, tag === state.tag);
    button.addEventListener('click', () => {
      state.tag = tag;
      state.page = 1;
      render();
    });
    container.appendChild(button);
  });
}

function renderYearFilters() {
  const select = document.getElementById('year-filter');
  select.innerHTML = '';
  getYearOptions().forEach((year) => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year === 'All' ? 'All years' : year;
    if (year === state.year) option.selected = true;
    select.appendChild(option);
  });
}

function render() {
  const filtered = filterPublications();
  const { items, page, totalPages } = paginate(filtered, state.page, state.pageSize);
  state.page = page;

  document.getElementById('result-count').textContent = `${filtered.length}`;
  document.getElementById('year-span').textContent = `${Math.min(...publications.map((p) => p.year))}–${Math.max(...publications.map((p) => p.year))}`;
  document.getElementById('publication-total').textContent = `${publications.length}`;

  const container = document.getElementById('publication-list');
  container.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'glass-card empty-state';
    empty.innerHTML = `
      <h3 class="card-title">No publication matched the current filter.</h3>
      <p class="card-body">Try a broader keyword or switch the topic / year filter back to <strong>All</strong>.</p>
    `;
    container.appendChild(empty);
  } else {
    items.forEach((item) => container.appendChild(publicationCard(item)));
  }

  renderTagFilters();
  renderYearFilters();
  renderPagination(document.getElementById('publication-pagination'), page, totalPages, (nextPage) => {
    state.page = nextPage;
    render();
    document.getElementById('publication-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  initReveal();
  initTilt();
}

window.addEventListener('DOMContentLoaded', () => {
  setMeta(pageMeta.publications);
  activateNav('publications');
  initFooterYear();
  smoothScrollForHashes();
  initMolecularField(document.getElementById('bg-canvas'), { variant: 'page', density: 0.8 });

  document.getElementById('search-input').addEventListener('input', (event) => {
    state.query = event.target.value;
    state.page = 1;
    render();
  });

  document.getElementById('year-filter').addEventListener('change', (event) => {
    state.year = event.target.value;
    state.page = 1;
    render();
  });

  render();
});
