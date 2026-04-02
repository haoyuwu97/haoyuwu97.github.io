export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
export const byId = (id) => document.getElementById(id);
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const choice = (items) => items[Math.floor(Math.random() * items.length)];
export const unique = (items) => [...new Set(items)];
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function formatDOI(doi) {
  return doi.startsWith('http') ? doi : `https://doi.org/${doi}`;
}

export function setMeta({ title, description }) {
  if (title) document.title = title;
  if (description) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', description);
  }
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && title) ogTitle.setAttribute('content', title);
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle && title) twTitle.setAttribute('content', title);
}

export function activateNav(page) {
  qsa('[data-nav]').forEach((link) => {
    const active = link.dataset.nav === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

export function initFooterYear() {
  qsa('[data-year]').forEach((node) => {
    node.textContent = `${new Date().getFullYear()}`;
  });
}

export function makeLinkButton({ label, href, kind = 'secondary', external = true }) {
  const a = document.createElement('a');
  a.className = `btn ${kind}`;
  a.href = href;
  a.textContent = label;
  if (external) {
    a.target = '_blank';
    a.rel = 'noreferrer noopener';
  }
  return a;
}

export function renderLinkRow(container, links, kind = 'secondary') {
  if (!container) return;
  container.innerHTML = '';
  links.forEach((link) => container.appendChild(makeLinkButton({ ...link, kind })));
}

export function renderTagList(container, tags = [], extraClass = '') {
  if (!container) return;
  container.innerHTML = '';
  tags.forEach((tag) => {
    const span = document.createElement('span');
    span.className = `tag ${extraClass}`.trim();
    span.textContent = tag;
    container.appendChild(span);
  });
}

export function createTagButton(label, active = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `chip-button${active ? ' active' : ''}`;
  button.textContent = label;
  return button;
}

export function initReveal() {
  const items = qsa('[data-reveal]');
  if (!items.length || prefersReducedMotion()) {
    items.forEach((item) => item.classList.add('revealed'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  items.forEach((item) => observer.observe(item));
}

export function initTilt(selector = '.tilt-card') {
  if (prefersReducedMotion()) return;
  qsa(selector).forEach((card) => {
    const maxTilt = Number(card.dataset.tilt || 8);
    let rafId = null;
    const update = (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * maxTilt;
      const ry = (px - 0.5) * maxTilt;
      const sx = lerp(1, 1.01, Math.abs(px - 0.5) * 2);
      const sy = lerp(1, 1.01, Math.abs(py - 0.5) * 2);
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        card.style.transform = `perspective(1200px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${Math.max(sx, sy).toFixed(3)})`;
      });
    };
    const reset = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)';
      });
    };
    card.addEventListener('mousemove', update);
    card.addEventListener('mouseleave', reset);
  });
}

export function initCopyButtons() {
  qsa('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = document.querySelector(button.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent.trim());
        const original = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => {
          button.textContent = original;
        }, 1200);
      } catch {
        button.textContent = 'Copy failed';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 1200);
      }
    });
  });
}

export function smoothScrollForHashes() {
  qsa('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
  });
}

export function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function paginate(items, page = 1, pageSize = 4) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = clamp(page, 1, totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    page: currentPage,
    totalPages,
    items: items.slice(start, start + pageSize)
  };
}

export function renderPagination(container, page, totalPages, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  if (totalPages <= 1) return;

  const prev = document.createElement('button');
  prev.className = 'page-button';
  prev.textContent = '← Prev';
  prev.disabled = page <= 1;
  prev.addEventListener('click', () => onSelect(page - 1));
  container.appendChild(prev);

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let value = start; value <= end; value += 1) {
    const button = document.createElement('button');
    button.className = `page-button${value === page ? ' active' : ''}`;
    button.textContent = `${value}`;
    button.addEventListener('click', () => onSelect(value));
    container.appendChild(button);
  }

  const next = document.createElement('button');
  next.className = 'page-button';
  next.textContent = 'Next →';
  next.disabled = page >= totalPages;
  next.addEventListener('click', () => onSelect(page + 1));
  container.appendChild(next);
}

export function appendChildren(node, children) {
  children.forEach((child) => node.appendChild(child));
}

export function niceList(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}
