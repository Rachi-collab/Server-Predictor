document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  animateHeroStats();
  initMobileMenu();
  initArchReveal();
  initDashboard();
  animateRings();
  renderFeatureChart();
  renderAdaptChart();
});
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
function animateHeroStats() {
  const els = document.querySelectorAll('.hero-stat-val[data-target]');
  els.forEach(el => {
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const links = document.querySelector('.nav-links');
  if (!hamburger || !links) return;

  const setMenuState = (isOpen) => {
    links.classList.toggle('is-open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('menu-open', isOpen);
  };

  hamburger.addEventListener('click', () => {
    const isOpen = !links.classList.contains('is-open');
    setMenuState(isOpen);
  });

  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setMenuState(false));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) setMenuState(false);
  });
}
function initArchReveal() {
  const stages = document.querySelectorAll('.arch-stage');
  if (!stages.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 120);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  stages.forEach(s => observer.observe(s));
}
