const root = document.documentElement;
const themeButtons = document.querySelectorAll('[data-theme-toggle]');
const themeKey = 'app-theme';

window.lucide?.createIcons();

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(preference) {
  const theme = preference === 'system' ? systemTheme() : preference;
  root.dataset.theme = theme;
  themeButtons.forEach((button) => {
    button.setAttribute('aria-label', `Use ${theme === 'dark' ? 'light' : 'dark'} theme`);
    button.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`;
    button.innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" aria-hidden="true"></i>`;
  });
  window.lucide?.createIcons();
}

let themePreference;
try {
  themePreference = localStorage.getItem(themeKey) || 'light';
} catch {
  themePreference = 'system';
}
applyTheme(themePreference);

themeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    themePreference = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(themePreference);
    try {
      localStorage.setItem(themeKey, themePreference);
    } catch {
      // Theme still works for this page when storage is unavailable.
    }
  });
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (themePreference === 'system') applyTheme('system');
});

const menuButton = document.querySelector('[data-menu-toggle]');
const mobileNavigation = document.querySelector('[data-mobile-navigation]');

menuButton?.addEventListener('click', () => {
  const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isExpanded));
  menuButton.setAttribute('aria-label', isExpanded ? 'Open navigation' : 'Close navigation');
  menuButton.innerHTML = `<i data-lucide="${isExpanded ? 'menu' : 'x'}" aria-hidden="true"></i>`;
  window.lucide?.createIcons();
  mobileNavigation.hidden = isExpanded;
});

mobileNavigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    if (link.hash) {
      mobileNavigation.hidden = true;
      menuButton?.setAttribute('aria-expanded', 'false');
      menuButton?.setAttribute('aria-label', 'Open navigation');
      if (menuButton) menuButton.innerHTML = '<i data-lucide="menu" aria-hidden="true"></i>';
      window.lucide?.createIcons();
    }
  });
});

const carousel = document.querySelector('[data-carousel]');
if (carousel) {
  const slides = [...carousel.querySelectorAll('.hero-slide')];
  const count = carousel.querySelector('[data-carousel-count]');
  const caption = carousel.querySelector('[data-carousel-caption]');
  const captions = ['Wild places, open horizons', 'A closer look at the wild', 'Follow the coast'];
  let activeIndex = 0;
  let timer;

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle('is-active', slideIndex === activeIndex && !slide.classList.contains('is-unavailable'));
    });
    if (count) count.innerHTML = `${String(activeIndex + 1).padStart(2, '0')} <b>/</b> ${String(slides.length).padStart(2, '0')}`;
    if (caption) caption.textContent = captions[activeIndex] || '';
  }

  function stopRotation() {
    window.clearInterval(timer);
  }

  function startRotation() {
    stopRotation();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      timer = window.setInterval(() => showSlide(activeIndex + 1), 6500);
    }
  }

  carousel.querySelector('[data-carousel-prev]')?.addEventListener('click', () => {
    showSlide(activeIndex - 1);
    startRotation();
  });
  carousel.querySelector('[data-carousel-next]')?.addEventListener('click', () => {
    showSlide(activeIndex + 1);
    startRotation();
  });
  carousel.addEventListener('mouseenter', stopRotation);
  carousel.addEventListener('mouseleave', startRotation);
  carousel.addEventListener('focusin', stopRotation);
  carousel.addEventListener('focusout', (event) => {
    if (!carousel.contains(event.relatedTarget)) startRotation();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopRotation();
    else startRotation();
  });
  showSlide(0);
  startRotation();
}

document.querySelectorAll('img').forEach((image) => {
  image.addEventListener('error', () => {
    image.classList.add('is-unavailable');
    if (image.matches('[data-hotel-image]')) {
      const fallback = document.querySelector('[data-hotel-fallback]');
      if (fallback) fallback.hidden = false;
      window.lucide?.createIcons();
    }
    if (image.classList.contains('hero-slide')) {
      image.closest('[data-carousel]')?.querySelector('[data-carousel-next]')?.click();
    }
  }, { once: true });
});

const year = document.querySelector('[data-current-year]');
if (year) year.textContent = String(new Date().getFullYear());