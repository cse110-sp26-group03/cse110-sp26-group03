// Load shared header/footer and mark the active nav item (data-page on <body>).
(function () {
  const page = document.body.dataset.page;

  function bindNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const closeBtn = document.querySelector('.nav-close');
    const panel = document.getElementById('site-nav-panel');
    const nav = document.querySelector('.site-nav');
    if (!toggle || !panel || !nav) return;

    const setOpen = (open) => {
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute(
        'aria-label',
        open ? 'Close navigation menu' : 'Open navigation menu',
      );
      document.body.classList.toggle('nav-open', open);
    };

    toggle.addEventListener('click', () => {
      setOpen(!panel.classList.contains('is-open'));
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => setOpen(false));
    }

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) {
        setOpen(false);
      }
    });
  }

  function setActiveNav() {
    if (!page) return;
    const active = document.querySelector(`.site-nav a[data-nav="${page}"]`);
    if (active) active.setAttribute('aria-current', 'page');
  }

  async function loadFragment(id, url) {
    const slot = document.getElementById(id);
    if (!slot) return;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    slot.innerHTML = await res.text();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await Promise.all([
        loadFragment('site-header', 'components/header.html'),
        loadFragment('site-footer', 'components/footer.html'),
      ]);
      setActiveNav();
      bindNavToggle();
    } catch {
      /* Static fallback: inline header/footer remain if fetch fails (e.g. file://) */
      bindNavToggle();
    }
  });
})();
