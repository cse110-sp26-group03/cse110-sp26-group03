// Load shared header/footer and mark the active nav item (data-page on <body>).
(function () {
  const page = document.body.dataset.page;

  function bindNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.site-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
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
