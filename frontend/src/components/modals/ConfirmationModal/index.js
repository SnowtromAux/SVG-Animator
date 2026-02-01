(() => {
  // ✅ Единна база за всички страници
  const BASE = '/svganimator/frontend';
  const SRC  = `${BASE}/src`;

  const mountId = 'confirmation-modal-mount';

  window.ConfirmationModalReady = (async () => {
    const mount = document.getElementById(mountId);
    if (!mount) {
      console.warn(`[ConfirmationModal] Missing mount #${mountId}`);
      return;
    }

    // ✅ Абсолютен път (не зависи от URL-а на страницата)
    const url = `${SRC}/components/Modals/ConfirmationModal/index.html`;

    let html = '';
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[ConfirmationModal] Failed to fetch HTML (${res.status}) at: ${url}`);
        return;
      }
      html = await res.text();
    } catch (err) {
      console.error('[ConfirmationModal] Fetch error:', err);
      return;
    }

    mount.innerHTML = html;

    // ✅ Взимаме елементите ОТ mount-а (по-сигурно от document.getElementById)
    const overlay   = mount.querySelector('#confirmModalOverlay');
    const closeBtn  = mount.querySelector('#confirmModalClose');
    const titleEl   = mount.querySelector('#confirmModalTitle');
    const msgEl     = mount.querySelector('#confirmModalMessage');
    const cancelBtn = mount.querySelector('#confirmModalCancel');
    const confirmBtn= mount.querySelector('#confirmModalConfirm');

    // ✅ Guard ако HTML е различен/не е зареден
    if (!overlay || !closeBtn || !titleEl || !msgEl || !cancelBtn || !confirmBtn) {
      console.error('[ConfirmationModal] Missing required DOM nodes in ConfirmationModal.html');
      return;
    }

    let resolver = null;

    const cleanupResolve = (value) => {
      overlay.classList.remove('active');
      document.body.style.overflow = '';

      const r = resolver;
      resolver = null;
      if (r) r(value);
    };

    const open = ({
      title = 'Потвърждение',
      message = '',
      confirmText = 'OK',
      cancelText = 'Откажи'
    } = {}) => {
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

    // ✅ Bind events (няма да гръмне)
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
