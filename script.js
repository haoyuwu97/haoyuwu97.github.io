const root = document.documentElement;
const toggle = document.getElementById('theme-toggle');
const year = document.getElementById('year');

function applyTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  toggle.textContent = theme === 'dark' ? 'Light' : 'Dark';
}

const savedTheme = localStorage.getItem('theme');
const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme || (preferredDark ? 'dark' : 'light'));

toggle.addEventListener('click', () => {
  applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
});

year.textContent = new Date().getFullYear();
