const root = document.documentElement;
const themeButtons = document.querySelectorAll('[data-theme-toggle]');
const themeKey = 'app-theme';

function navigateToSection(section) {
  const target = document.getElementById(section);
  if (!target) return false;
  target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  if (window.location.search) window.history.replaceState({}, '', window.location.pathname);
  return true;
}

const requestedSection = new URLSearchParams(window.location.search).get('section');
if (requestedSection) requestAnimationFrame(() => navigateToSection(requestedSection));

const valueDetails = {
  care: { title: 'Customer care', detail: 'We listen carefully and respond promptly.', icon: 'heart-handshake' },
  transparency: { title: 'Transparency', detail: 'We communicate prices, inclusions, exclusions, and conditions clearly.', icon: 'scan-eye' },
  reliability: { title: 'Reliability', detail: 'We confirm details with suppliers before taking or confirming bookings.', icon: 'badge-check' },
  value: { title: 'Value', detail: 'We help travellers make informed choices within their budgets.', icon: 'wallet-cards' },
  partnership: { title: 'Partnership', detail: 'We build respectful, mutually beneficial relationships with hotels and service providers.', icon: 'handshake' },
  professionalism: { title: 'Professionalism', detail: 'We handle customer information and payments responsibly.', icon: 'shield-check' },
};

const valueOptions = document.querySelectorAll('[data-value]');
const valueDetail = document.querySelector('[data-value-detail]');
valueOptions.forEach((option, index) => {
  option.addEventListener('click', () => {
    const value = valueDetails[option.dataset.value];
    if (!value || !valueDetail) return;
    valueOptions.forEach((item) => {
      const selected = item === option;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    valueDetail.querySelector('.value-index').textContent = `${String(index + 1).padStart(2, '0')} / ${String(valueOptions.length).padStart(2, '0')}`;
    const icon = document.createElement('i');
    icon.dataset.lucide = value.icon;
    icon.setAttribute('aria-hidden', 'true');
    valueDetail.querySelector('.value-icon').replaceChildren(icon);
    valueDetail.querySelector('h4').textContent = value.title;
    valueDetail.querySelector('p').textContent = value.detail;
    valueDetail.classList.remove('is-changing');
    requestAnimationFrame(() => valueDetail.classList.add('is-changing'));
    window.lucide?.createIcons();
  });
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion) {
  document.querySelectorAll('[data-tilt]').forEach((panel) => {
    panel.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const bounds = panel.getBoundingClientRect();
      const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
      const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
      panel.style.setProperty('--tilt-x', `${(vertical * -4).toFixed(2)}deg`);
      panel.style.setProperty('--tilt-y', `${(horizontal * 5).toFixed(2)}deg`);
    });
    panel.addEventListener('pointerleave', () => {
      panel.style.setProperty('--tilt-x', '0deg');
      panel.style.setProperty('--tilt-y', '0deg');
    });
  });

  const revealTargets = document.querySelectorAll('.travel-service-grid article, .purpose-card, .trip-idea-card, .why-choose-list li');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });
    revealTargets.forEach((target) => {
      target.classList.add('reveal-on-scroll');
      revealObserver.observe(target);
    });
  }
}

document.querySelectorAll('a[href^="/?section="]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (window.location.pathname !== '/' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const section = new URL(link.href).searchParams.get('section');
    if (section && navigateToSection(section)) event.preventDefault();
  });
});

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

function setMobileMenu(open) {
  if (!menuButton || !mobileNavigation) return;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  menuButton.classList.toggle('is-open', open);
  menuButton.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
  mobileNavigation.hidden = !open;
  window.lucide?.createIcons();
}

menuButton?.addEventListener('click', () => {
  const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
  setMobileMenu(!isExpanded);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') setMobileMenu(false);
});

const mobileNavBreakpoint = window.matchMedia('(min-width: 761px)');
mobileNavBreakpoint.addEventListener('change', (event) => {
  if (event.matches) setMobileMenu(false);
});

document.addEventListener('pointerdown', (event) => {
  if (menuButton?.getAttribute('aria-expanded') !== 'true') return;
  if (mobileNavigation?.contains(event.target) || menuButton?.contains(event.target)) return;
  setMobileMenu(false);
});

mobileNavigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileNavigation.hidden = true;
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
    if (menuButton) {
      menuButton.classList.remove('is-open');
      menuButton.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
    }
    window.lucide?.createIcons();
  });
});

const carousel = document.querySelector('[data-carousel]');
if (carousel) {
  const slides = [...carousel.querySelectorAll('.hero-slide')];
  const count = carousel.querySelector('[data-carousel-count]');
  const caption = carousel.querySelector('[data-carousel-caption]');
  const captions = ['Your next coastal escape', 'Golden-hour moments, made yours', 'Find your piece of the coast'];
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