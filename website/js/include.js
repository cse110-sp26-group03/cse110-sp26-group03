// Load shared header/footer and mark the active nav item (data-page on <body>).
(function () {
  const page = document.body.dataset.page;

  function bindNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.site-nav');
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute(
        'aria-label',
        open ? 'Close navigation menu' : 'Open navigation menu',
      );
    };

    toggle.addEventListener('click', () => {
      setOpen(!nav.classList.contains('is-open'));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
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
