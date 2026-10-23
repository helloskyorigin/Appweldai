'use strict';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileMenuButton = document.querySelector('.mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuButton && mobileMenu) {
  const closeMenu = () => {
    mobileMenuButton.setAttribute('aria-expanded', 'false');
    mobileMenuButton.setAttribute('aria-label', 'Open menu');
    mobileMenu.hidden = true;
    document.body.classList.remove('menu-open');
  };
  mobileMenuButton.addEventListener('click', () => {
    const opening = mobileMenuButton.getAttribute('aria-expanded') !== 'true';
    mobileMenuButton.setAttribute('aria-expanded', String(opening));
    mobileMenuButton.setAttribute('aria-label', opening ? 'Close menu' : 'Open menu');
    mobileMenu.hidden = !opening;
    document.body.classList.toggle('menu-open', opening);
  });
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
}

const normalizeWebsiteUrl = raw => {
  const input = raw.trim();
  if (!input) return null;
  try {
    const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (!parsed.hostname.includes('.') || parsed.username || parsed.password) return null;
    if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(parsed.hostname)) return null;
    return parsed.toString();
  } catch { return null; }
};

document.querySelectorAll('[data-url-form]').forEach(form => {
  const field = form.querySelector('[name="url"]');
  const error = form.querySelector('.field-error');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const value = normalizeWebsiteUrl(field.value);
    if (!value) {
      error.textContent = 'Enter a valid public website URL (example.com).';
      field.setAttribute('aria-invalid', 'true');
      field.focus();
      return;
    }
    error.textContent = '';
    field.removeAttribute('aria-invalid');
    window.location.assign(`/create/?url=${encodeURIComponent(value)}`);
  });
  field.addEventListener('input', () => { error.textContent = ''; field.removeAttribute('aria-invalid'); });
});

const revealElements = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !prefersReducedMotion.matches) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: .08 });
  revealElements.forEach(el => revealObserver.observe(el));
} else {
  revealElements.forEach(el => el.classList.add('visible'));
}

const scrollStory = document.getElementById('transform-scroll');
const movingBrowser = document.querySelector('.transform-browser');
const movingPhone = document.querySelector('.transform-phone');
const movingArrow = document.querySelector('.transform-arrow');
const progressLine = document.querySelector('.transform-progress span');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ease = value => 1 - Math.pow(1 - value, 3);
let scrollTicking = false;
function animateScrollStory() {
  if (!scrollStory || !movingBrowser || !movingPhone || !movingArrow || !progressLine) return;
  scrollTicking = false;
  if (prefersReducedMotion.matches) {
    movingBrowser.style.transform = 'translateX(-36%) scale(.73)';
    movingBrowser.style.opacity = '1';
    movingPhone.style.transform = 'translateX(100%) scale(1)';
    movingPhone.style.opacity = '1';
    movingArrow.style.opacity = '1';
    progressLine.style.width = '100%';
    return;
  }
  const rect = scrollStory.getBoundingClientRect();
  const max = Math.max(1, rect.height - window.innerHeight);
  const p = clamp(-rect.top / max, 0, 1);
  const isSmall = window.innerWidth < 800;
  const browserShift = isSmall ? -36 : -42;
  const phoneShift = isSmall ? 80 : 128;
  const browserSize = isSmall ? .55 : .68;
  movingBrowser.style.transform = `translateX(${(-8 + (browserShift + 8) * ease(p))}%) scale(${1 - (1 - browserSize) * ease(p)})`;
  movingBrowser.style.opacity = String(clamp(1 - (p - .83) * 1.3, .72, 1));
  movingPhone.style.transform = `translateX(${(140 - (140 - phoneShift) * ease(p))}%) scale(${.75 + .25 * ease(p)})`;
  movingPhone.style.opacity = String(clamp((p - .12) * 3.5, 0, 1));
  movingArrow.style.opacity = String(clamp((p - .25) * 4, 0, .7));
  movingArrow.style.transform = `translateX(${(p - .5) * 20}px)`;
  progressLine.style.width = `${Math.round(p * 100)}%`;
}
function queueScrollUpdate() { if (!scrollTicking) { scrollTicking = true; window.requestAnimationFrame(animateScrollStory); } }
if (scrollStory) { window.addEventListener('scroll', queueScrollUpdate, {passive:true});window.addEventListener('resize', queueScrollUpdate);prefersReducedMotion.addEventListener('change', queueScrollUpdate);queueScrollUpdate(); }

const liveName = document.getElementById('live-name');
const nameInput = document.getElementById('demo-name');
const liveIcon = document.getElementById('live-icon');
const screen = document.querySelector('.custom-screen');
if (nameInput && liveName) {
  nameInput.addEventListener('input', () => { liveName.textContent = nameInput.value.trim() || 'Your App'; });
}
document.querySelectorAll('.swatch').forEach(button => button.addEventListener('click', () => {
  if (screen) {
    screen.style.setProperty('--preview-color', button.dataset.color);
    screen.style.setProperty('--preview-ink', button.dataset.dark);
  }
  document.querySelectorAll('.swatch').forEach(item => {item.classList.toggle('is-selected', item === button);item.setAttribute('aria-pressed', String(item === button));});
}));
document.querySelectorAll('.icon-option').forEach(button => button.addEventListener('click', () => {
  if (liveIcon) liveIcon.textContent = button.textContent;
  document.querySelectorAll('.icon-option').forEach(item => {item.classList.toggle('active', item === button);item.setAttribute('aria-pressed', String(item === button));});
}));

// Never claim live payment or Android generation until the build pipeline is enabled.
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
