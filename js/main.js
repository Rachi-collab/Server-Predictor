/* ═══════════════════════════════════════════════════
   PredictOps — Site Chrome & Interaction
   (navbar, hero counters, mobile nav, scroll reveals)
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  animateHeroStats();
  initMobileMenu();
  initArchReveal();
  initDashboard();   // starts the live simulated dashboard (js/dashboard.js)
  animateRings();    // performance ring animations (js/charts.js)

  // Render the performance-section charts once (static, not part of live loop)
  renderFeatureChart();
  renderAdaptChart();
});

// ─── Navbar scroll state ───────────────────────────
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

// ─── Hero stat counters ─────────────────────────────
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

// ─── Mobile menu ────────────────────────────────────
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const links = document.querySelector('.nav-links');
  if (!hamburger || !links) return;
  hamburger.addEventListener('click', () => {
    const isOpen = links.style.display === 'flex';
    links.style.display = isOpen ? 'none' : 'flex';
    links.style.cssText += isOpen ? '' : `
      position: fixed; top: 64px; left: 0; right: 0;
      flex-direction: column; background: rgba(8,11,18,0.97);
      backdrop-filter: blur(16px); padding: 20px 24px;
      border-bottom: 1px solid var(--border); gap: 18px;
    `;
  });
}

// ─── Architecture stage reveal on scroll ───────────
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
