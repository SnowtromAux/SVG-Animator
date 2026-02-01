(() => {
  const mountId = 'confirmation-modal-mount';

  window.ConfirmationModalReady = (async () => {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    const res = await fetch('../../components/ConfirmationModal/ConfirmationModal.html');
    const html = await res.text();
    mount.innerHTML = html;

    const overlay = document.getElementById('confirmModalOverlay');
    const closeBtn = document.getElementById('confirmModalClose');
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const cancelBtn = document.getElementById('confirmModalCancel');
    const confirmBtn = document.getElementById('confirmModalConfirm');

    let resolver = null;

    const cleanupResolve = (value) => {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      const r = resolver;
      resolver = null;
      if (r) r(value);
    };

    const open = ({ title = 'Потвърждение', message = '', confirmText = 'OK', cancelText = 'Откажи' } = {}) => {
      titleEl.textContent = title;
      msgEl.textContent = message;
      confirmBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';

      return new Promise((resolve) => {
        resolver = resolve;
      });
    };

    const close = () => cleanupResolve(false);

    closeBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', () => cleanupResolve(false));
    confirmBtn.addEventListener('click', () => cleanupResolve(true));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanupResolve(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        cleanupResolve(false);
      }
    });

    window.ConfirmationModal = { open, close };
  })();
})();
