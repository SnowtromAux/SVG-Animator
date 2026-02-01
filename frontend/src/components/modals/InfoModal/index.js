(() => {
  const BASE = '/svganimator/frontend';
  const SRC  = `${BASE}/src`;

  const mountId = 'info-modal-mount';

  window.InfoModalReady = (async () => {
    const mount = document.getElementById(mountId);
    if (!mount) {
      console.warn(`[InfoModal] Missing mount #${mountId}`);
      return;
    }

    const url = `${SRC}/components/Modals/InfoModal/index.html`;

    let html = '';
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[InfoModal] Failed to fetch HTML (${res.status}) at: ${url}`);
        return;
      }
      html = await res.text();
    } catch (err) {
      console.error('[InfoModal] Fetch error:', err);
      return;
    }

    mount.innerHTML = html;

    // ✅ Grab DOM from mount (safer)
    const overlay = mount.querySelector('#infoModalOverlay');
    const closeBtn = mount.querySelector('#infoModalClose');
    const titleEl = mount.querySelector('#infoModalTitle');
    const bodyEl = mount.querySelector('#infoModalBody');

    if (!overlay || !closeBtn || !titleEl || !bodyEl) {
      console.error('[InfoModal] Missing required DOM nodes in InfoModal.html');
      return;
    }

    const escapeHtml = (str) => {
      return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    };

    const open = ({ title = 'Информация', items = [] } = {}) => {
      titleEl.textContent = title;

      bodyEl.innerHTML = (items || []).map(item => `
        <div class="info-item">
          <span class="info-label">${escapeHtml(item?.name ?? '')}</span>
          <span class="info-value">${escapeHtml(item?.value ?? '')}</span>
        </div>
      `).join('');

      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) close();
    });

    window.InfoModal = { open, close };
  })();
})();
