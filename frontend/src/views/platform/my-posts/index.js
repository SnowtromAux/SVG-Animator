// ===== My Posts Page (PREVIEW ONLY: NO POST MODAL, NO COMMENTS, LIKE/DISLIKE READ-ONLY) =====

// mock current user (връзваш по-късно към auth)
const CURRENT_USER = { name: 'Вие', initials: 'Аз' };

// Само мои постове (placeholder)
const MY_POSTS = [
  {
    id: 101,
    user: CURRENT_USER,
    time: 'преди 1 час',
    text: 'Днес направих нов micro-interaction за hover state с SVG. Използвах easing и малък overshoot — супер гладко става!',
    tags: ['microinteractions', 'svg', 'ui', 'easing'],
    likes: 12,
    dislikes: 1
  },
  {
    id: 102,
    user: CURRENT_USER,
    time: 'вчера',
    text: 'Пускам кратък breakdown как правя path morph без да се “къса” формата. Най-важното е да имаш приблизително еднакъв брой сегменти и да нормализираш командите.',
    tags: ['pathmorph', 'svg', 'frontend', 'tips'],
    likes: 28,
    dislikes: 0
  }
];

/* =========================
   Inline ConfirmationModal (като в my-projects)
========================= */
function initConfirmationModal() {
  const overlay = document.getElementById("confirmModalOverlay");
  const closeBtn = document.getElementById("confirmModalClose");
  const titleEl = document.getElementById("confirmModalTitle");
  const msgEl = document.getElementById("confirmModalMessage");
  const cancelBtn = document.getElementById("confirmModalCancel");
  const confirmBtn = document.getElementById("confirmModalConfirm");

  if (!overlay || !closeBtn || !titleEl || !msgEl || !cancelBtn || !confirmBtn) {
    console.warn("[ConfirmationModal] Missing DOM nodes (inline).");
    return;
  }

  let resolver = null;

  const cleanupResolve = (value) => {
    overlay.classList.remove("active");
    document.body.style.overflow = "";

    const r = resolver;
    resolver = null;
    if (r) r(value);
  };

  const open = ({
    title = "Потвърждение",
    message = "",
    confirmText = "OK",
    cancelText = "Откажи",
  } = {}) => {
    titleEl.textContent = title;
    msgEl.textContent = message;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    return new Promise((resolve) => {
      resolver = resolve;
    });
  };

  const close = () => cleanupResolve(false);

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", () => cleanupResolve(false));
  confirmBtn.addEventListener("click", () => cleanupResolve(true));

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) cleanupResolve(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      cleanupResolve(false);
    }
  });

  window.ConfirmationModal = { open, close };
}

/* =========================
   Helpers
========================= */
function shouldShowMore(text, limit = 180) {
  return (text || '').length > limit;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(t => String(t).trim())
    .filter(Boolean)
    .map(t => (t.startsWith('#') ? t.slice(1) : t))
    .map(t => t.replace(/\s+/g, ''))
    .slice(0, 8);
}

function renderTags(tags) {
  const list = normalizeTags(tags);
  if (list.length === 0) return '';

  return `
    <div class="post-tags">
      ${list.map(t => `
        <span class="tag-chip" data-action="noop">
          <span class="hash">#</span>${t}
        </span>
      `).join('')}
    </div>
  `;
}

/* =========================
   Render feed
========================= */
function renderFeed() {
  const container = document.getElementById('feedContainer');

  if (MY_POSTS.length === 0) {
    container.innerHTML = `
      <div class="post-card" style="padding: 1.25rem;">
        <div style="color: var(--text-muted); font-weight: 600;">
          Все още нямате постове.
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = MY_POSTS.map(post => renderPost(post)).join('');
}

function renderPost(post) {
  const showMore = shouldShowMore(post.text);

  return `
    <article class="post-card" data-post-id="${post.id}">
      <div class="post-header">
        <div class="post-avatar">${post.user.initials}</div>
        <div class="post-user-info">
          <span class="post-username">${post.user.name}</span>
          <span class="post-time">${post.time}</span>
        </div>
      </div>

      <div class="post-content">
        <p class="post-text ${showMore ? 'preview' : ''}">${post.text}</p>

        ${showMore ? `<div class="post-hint">(Съкратен преглед)</div>` : ``}

        ${renderTags(post.tags)}

        <div class="post-media" data-action="noop">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Placeholder
        </div>
      </div>

      <div class="post-actions">
        <!-- ✅ Read-only reactions -->
        <button class="action-btn readonly" type="button" disabled aria-disabled="true" title="Само за преглед">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 22V11L2 13V22H7ZM7 11L11.5 2C12.3284 2 13.1235 2.32924 13.7097 2.91536C14.2959 3.50148 14.625 4.29653 14.625 5.125V8.5H20.25C20.5955 8.49743 20.9376 8.56898 21.2534 8.71002C21.5693 8.85106 21.8517 9.05833 22.0816 9.31756C22.3115 9.5768 22.4836 9.88211 22.5862 10.2131C22.6887 10.5441 22.7193 10.8933 22.6757 11.237L21.4632 20.237C21.3875 20.8357 21.0946 21.3857 20.6393 21.7877C20.184 22.1897 19.5975 22.4158 18.9882 22.425H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${Number(post.likes) || 0}</span>
        </button>

        <button class="action-btn readonly" type="button" disabled aria-disabled="true" title="Само за преглед">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="transform: rotate(180deg)" aria-hidden="true">
            <path d="M7 22V11L2 13V22H7ZM7 11L11.5 2C12.3284 2 13.1235 2.32924 13.7097 2.91536C14.2959 3.50148 14.625 4.29653 14.625 5.125V8.5H20.25C20.5955 8.49743 20.9376 8.56898 21.2534 8.71002C21.5693 8.85106 21.8517 9.05833 22.0816 9.31756C22.3115 9.5768 22.4836 9.88211 22.5862 10.2131C22.6887 10.5441 22.7193 10.8933 22.6757 11.237L21.4632 20.237C21.3875 20.8357 21.0946 21.3857 20.6393 21.7877C20.184 22.1897 19.5975 22.4158 18.9882 22.425H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${Number(post.dislikes) || 0}</span>
        </button>

        <span class="action-spacer"></span>

        <button class="delete-btn" data-action="delete-post" data-post-id="${post.id}" aria-label="Изтрий анимация">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M8 6V4H16V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M19 6L18 20H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Изтрий анимация
        </button>
      </div>
    </article>
  `;
}

/* =========================
   Delete with ConfirmationModal
========================= */
function getPostById(postId) {
  return MY_POSTS.find(p => p.id === postId);
}

async function deletePostWithConfirmation(postId) {
  const post = getPostById(postId);
  if (!post) return;

  let ok = false;

  if (!window.ConfirmationModal?.open) {
    ok = window.confirm("Сигурен ли си, че искаш да изтриеш тази анимация?");
  } else {
    ok = await window.ConfirmationModal.open({
      title: "Потвърждение",
      message: "Сигурен ли си, че искаш да изтриеш тази анимация?",
      confirmText: "Изтрий",
      cancelText: "Откажи",
    });
  }

  if (!ok) return;

  const idx = MY_POSTS.findIndex(p => p.id === postId);
  if (idx === -1) return;

  MY_POSTS.splice(idx, 1);
  renderFeed();
}

/* =========================
   Events
========================= */
function initEvents() {
  const feed = document.getElementById('feedContainer');

  // реагира само на data-action (delete). Like/dislike са disabled и нямат data-action.
  feed.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    if (action === 'noop') return;

    if (action === 'delete-post') {
      const postId = actionBtn.dataset.postId ? parseInt(actionBtn.dataset.postId, 10) : null;
      if (!postId) return;
      deletePostWithConfirmation(postId);
    }
  });
}

/* =========================
   Particle background (same)
========================= */
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouseX = 0, mouseY = 0;

  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };

  const createParticles = () => {
    particles = [];
    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 20000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 0.8, opacity: Math.random() * 0.4 + 0.15
      });
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      const dx = mouseX - p.x, dy = mouseY - p.y, d = Math.sqrt(dx*dx + dy*dy);
      if (d < 150) { p.x -= dx * 0.008; p.y -= dy * 0.008; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${p.opacity})`; ctx.fill();
      particles.slice(i + 1).forEach(o => {
        const dx2 = p.x - o.x, dy2 = p.y - o.y, d2 = Math.sqrt(dx2*dx2 + dy2*dy2);
        if (d2 < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x,p.y);
          ctx.lineTo(o.x,o.y);
          ctx.strokeStyle = `rgba(99,102,241,${0.12*(1-d2/100)})`;
          ctx.stroke();
        }
      });
    });
    requestAnimationFrame(draw);
  };

  resize(); createParticles(); draw();
  window.addEventListener('resize', () => { resize(); createParticles(); });
  window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
}

/* =========================
   Init
========================= */
document.addEventListener('DOMContentLoaded', () => {
  initConfirmationModal();
  initParticles();
  renderFeed();
  initEvents();
});
