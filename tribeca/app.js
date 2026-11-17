const root = document.documentElement;
const hero = document.querySelector('.hero-scroll');
const lightLabel = document.getElementById('light-label');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const colors = {
  bg: [[243, 239, 231], [17, 30, 47]],
  fg: [[23, 43, 62], [241, 239, 231]],
  muted: [[99, 111, 119], [174, 184, 194]],
  accent: [[149, 111, 61], [199, 171, 117]],
  panel: [[232, 228, 220], [34, 49, 67]]
};
let currentProgress = 0;
let frame = 0;
let pageHeight = 1;
let heroTravel = 1;
function measure() {
  pageHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  heroTravel = Math.max(1, hero.offsetHeight - window.innerHeight);
}
function mix(start, end, progress) {
  return start.map((value, index) => Math.round(value + (end[index] - value) * progress));
}
function luminance(rgb) {
  const linear = rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function paint() {
  const target = Math.min(1, Math.max(0, window.scrollY / pageHeight));
  currentProgress = reducedMotion.matches ? target : currentProgress + (target - currentProgress) * 0.11;
  for (const [name, [start, end]] of Object.entries(colors)) {
    const rgb = mix(start, end, currentProgress);
    root.style.setProperty(`--${name}`, `rgb(${rgb.join(',')})`);
  }
  const header = mix(colors.bg[0], colors.bg[1], currentProgress);
  // Keep copy readable during the middle tones of the day-to-night transition.
  const darkSurface = luminance(header) < 0.185;
  const ink = darkSurface ? [250, 248, 242] : [12, 20, 28];
  const muted = darkSurface ? [225, 230, 235] : [27, 37, 47];
  const accent = darkSurface ? [224, 195, 137] : [103, 66, 20];
  root.style.setProperty('--fg', `rgb(${ink.join(',')})`);
  root.style.setProperty('--muted', `rgb(${muted.join(',')})`);
  root.style.setProperty('--accent', `rgb(${accent.join(',')})`);
  root.style.setProperty('--header-bg', `rgba(${header.join(',')},.93)`);
  root.style.setProperty('--line', `rgba(${ink.join(',')},.20)`);
  root.style.setProperty('--progress', currentProgress.toFixed(4));
  // Both renders use the same viewpoint. Scrolling blends their actual lighting.
  const heroProgress = Math.min(1, Math.max(0, window.scrollY / heroTravel));
  const nightProgress = heroProgress * heroProgress * (3 - 2 * heroProgress);
  root.style.setProperty('--hero-night', nightProgress.toFixed(4));
  const phase = heroProgress < 0.32 ? 'Luz de día' : heroProgress < 0.72 ? 'Hora dorada' : 'Luz de noche';
  if (lightLabel.textContent !== phase) lightLabel.textContent = phase;
  frame = 0;
  if (Math.abs(target - currentProgress) > 0.0004) requestPaint();
}
function requestPaint() {
  if (!frame) frame = requestAnimationFrame(paint);
}
window.addEventListener('scroll', requestPaint, { passive: true });
window.addEventListener('resize', () => { measure(); requestPaint(); });
window.addEventListener('pageshow', () => { measure(); requestPaint(); });
window.addEventListener('load', () => { measure(); requestPaint(); });
if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); requestPaint(); }).observe(document.body);
measure();
requestPaint();

const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menú');
  mobileMenu.hidden = true;
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  mobileMenu.hidden = !open;
});
mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
window.matchMedia('(min-width:701px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const floors = [
  { name: 'Planta baja', items: ['Sala y comedor', 'Cocina', 'Baño social', 'Área exterior'] },
  { name: 'Primera planta alta', items: ['Dos dormitorios', 'Baño', 'Circulación y escalera'] },
  { name: 'Segunda planta alta', items: ['Un dormitorio', 'Baño', 'Circulación y escalera'] }
];
const tabs = [...document.querySelectorAll('[data-floor]')];
const floorImage = document.getElementById('floor-image');
const floorPanel = document.getElementById('floor-panel');
const floorDetails = document.getElementById('floor-details');
const planZoom = document.getElementById('plan-zoom');
function selectFloor(index, focus = false) {
  tabs.forEach((tab, tabIndex) => {
    tab.setAttribute('aria-selected', String(tabIndex === index));
    tab.tabIndex = tabIndex === index ? 0 : -1;
  });
  const floor = floors[index];
  floorImage.src = `assets/plan${index}.webp`;
  floorImage.alt = `Distribución de ${floor.name.toLowerCase()}`;
  floorPanel.setAttribute('aria-labelledby', `tab-${index}`);
  floorDetails.replaceChildren(...floor.items.map(item => {
    const listItem = document.createElement('li');
    listItem.textContent = item;
    return listItem;
  }));
  planZoom.dataset.full = floorImage.getAttribute('src');
  planZoom.dataset.caption = `${floor.name} · Sin escala`;
  planZoom.setAttribute('aria-label', `Ampliar plano de ${floor.name.toLowerCase()}`);
  if (focus) tabs[index].focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectFloor(index));
  tab.addEventListener('keydown', event => {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectFloor(next, true);
  });
});

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxCaption = document.getElementById('lightbox-caption');
document.querySelectorAll('[data-full]').forEach(button => {
  button.addEventListener('click', () => {
    lightboxImage.src = button.dataset.full;
    lightboxImage.alt = button.dataset.caption;
    lightboxCaption.textContent = button.dataset.caption;
    lightbox.showModal();
  });
});
document.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
lightbox.addEventListener('close', () => { lightboxImage.removeAttribute('src'); });
