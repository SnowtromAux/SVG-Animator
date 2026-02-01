(() => {
  const mountId = 'info-modal-mount';

  window.InfoModalReady = (async () => {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    const res = await fetch('../../components/InfoModal/InfoModal.html');
    const html = await res.text();
    mount.innerHTML = html;

    const overlay = document.getElementById('infoModalOverlay');
    const closeBtn = document.getElementById('infoModalClose');
    const titleEl = document.getElementById('infoModalTitle');
    const bodyEl = document.getElementById('infoModalBody');

    const open = ({ title = 'Информация', items = [] } = {}) => {
      titleEl.textContent = title;

      bodyEl.innerHTML = (items || []).map(item => `
        <div class="info-item">
          <span class="info-label">${item.name}</span>
          <span class="info-value">${item.value}</span>
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
