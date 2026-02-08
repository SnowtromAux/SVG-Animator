// ===== Posts Feed =====

const PLACEHOLDER_POSTS = [
  {
    id: 1,
    user: { name: 'Иван Петров', initials: 'ИП' },
    time: 'преди 2 часа',
    text: 'Току-що завърших нова SVG анимация за лендинг страница. Много съм доволен от резултата!',
    tags: ['svganimation', 'landingpage', 'ui', 'motion'],
    likes: 24,
    dislikes: 2,
    comments: [
      { id: 1, author: 'Мария К.', initials: 'МК', text: 'Страхотна работа! Можеш ли да споделиш как направи ефекта на вълните?', time: 'преди 1 час' },
      { id: 2, author: 'Георги Д.', initials: 'ГД', text: 'Много впечатляващо, браво!', time: 'преди 45 мин' }
    ]
  },
  {
    id: 2,
    user: { name: 'Елена Димитрова', initials: 'ЕД' },
    time: 'преди 5 часа',
    text: 'Някой има ли опит с анимиране на SVG path morph? Опитвам се да направя плавен преход между две форми, но не мога да намеря добър подход. Също се чудя как най-добре да синхронизирам ключови кадри между различни path-ове и дали има оптимален начин да го направя без да се натоварва рендъра в браузъра.',
    tags: ['svg', 'pathmorph', 'flubber', 'frontend'],
    likes: 8,
    dislikes: 0,
    comments: [
      { id: 3, author: 'Стефан М.', initials: 'СМ', text: 'Пробвай с flubber библиотеката, генерира добри интерполации между path-ове.', time: 'преди 3 часа' }
    ]
  },
  {
    id: 3,
    user: { name: 'Александър Стоянов', initials: 'АС' },
    time: 'преди 1 ден',
    text: 'Споделям моя нов проект - интерактивна SVG карта с анимирани маршрути. Работих по нея цяла седмица.',
    tags: ['interactive', 'svgmap', 'routes', 'project'],
    likes: 56,
    dislikes: 1,
    comments: []
  },
  {
    id: 4,
    user: { name: 'Десислава Йорданова', initials: 'ДЙ' },
    time: 'преди 2 дни',
    text: 'Ново в общността! Радвам се да открия това място. Работя основно с micro-анимации за UI елементи. Имам няколко готини трика за easing функции и “overshoot” ефекти, които ще споделя скоро.',
    tags: ['microinteractions', 'easing', 'ui', 'community'],
    likes: 32,
    dislikes: 0,
    comments: [
      { id: 4, author: 'Иван П.', initials: 'ИП', text: 'Добре дошла! Тук ще намериш много полезни ресурси.', time: 'преди 1 ден' },
      { id: 5, author: 'Николай В.', initials: 'НВ', text: 'Привет! Ако имаш въпроси, питай спокойно.', time: 'преди 1 ден' },
      { id: 6, author: 'Мария К.', initials: 'МК', text: 'Micro-анимациите са страхотна тема, ще се радвам да видя работата ти!', time: 'преди 22 часа' }
    ]
  }
];

// ===== State =====
const postStates = {};
let openPostId = null;

// mock current user (по-късно го връзваш към auth)
const CURRENT_USER = { name: 'Вие', initials: 'Аз' };

function initPostStates() {
  PLACEHOLDER_POSTS.forEach(post => {
    postStates[post.id] = {
      liked: false,
      disliked: false,
      likes: post.likes,
      dislikes: post.dislikes
    };
  });
}

function getPostById(id) {
  return PLACEHOLDER_POSTS.find(p => p.id === id);
}

function shouldShowMore(text, limit = 180) {
  return (text || '').length > limit;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(t => String(t).trim())
    .filter(Boolean)
    .map(t => t.startsWith('#') ? t.slice(1) : t)
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

function formatNowTime() {
  // прост mock: "току-що"
  return 'току-що';
}

function nextCommentId() {
  let maxId = 0;
  PLACEHOLDER_POSTS.forEach(p => p.comments.forEach(c => { if (c.id > maxId) maxId = c.id; }));
  return maxId + 1;
}

// ===== Feed render =====
function renderFeed() {
  const container = document.getElementById('feedContainer');
  container.innerHTML = PLACEHOLDER_POSTS.map(post => renderPost(post)).join('');
}

function renderPost(post) {
  const s = postStates[post.id];
  const commentCount = post.comments.length;
  const showMore = shouldShowMore(post.text);

  return `
    <article class="post-card" data-post-id="${post.id}">
      <div class="post-header">
        <div class="post-avatar">${post.user.initials}</div>
        <div class="post-user-info">
          <span class="post-username">${post.user.name}</span>
          <span class="post-time">${post.time}</span>
        </div>
        <button class="post-menu-btn" aria-label="Повече опции" data-action="noop">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
          </svg>
        </button>
      </div>

      <div class="post-content">
        <p class="post-text ${showMore ? 'preview' : ''}">${post.text}</p>

        ${showMore ? `
          <button class="post-more" data-action="open-post" data-post-id="${post.id}">
            Вижте повече
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        ` : ``}

        ${renderTags(post.tags)}

        <div class="post-media">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Placeholder
        </div>
      </div>

      <div class="post-actions">
        <button class="action-btn ${s.liked ? 'liked' : ''}" data-action="like" data-post-id="${post.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M7 22V11L2 13V22H7ZM7 11L11.5 2C12.3284 2 13.1235 2.32924 13.7097 2.91536C14.2959 3.50148 14.625 4.29653 14.625 5.125V8.5H20.25C20.5955 8.49743 20.9376 8.56898 21.2534 8.71002C21.5693 8.85106 21.8517 9.05833 22.0816 9.31756C22.3115 9.5768 22.4836 9.88211 22.5862 10.2131C22.6887 10.5441 22.7193 10.8933 22.6757 11.237L21.4632 20.237C21.3875 20.8357 21.0946 21.3857 20.6393 21.7877C20.184 22.1897 19.5975 22.4158 18.9882 22.425H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${s.likes}</span>
        </button>

        <button class="action-btn ${s.disliked ? 'disliked' : ''}" data-action="dislike" data-post-id="${post.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="transform: rotate(180deg)">
            <path d="M7 22V11L2 13V22H7ZM7 11L11.5 2C12.3284 2 13.1235 2.32924 13.7097 2.91536C14.2959 3.50148 14.625 4.29653 14.625 5.125V8.5H20.25C20.5955 8.49743 20.9376 8.56898 21.2534 8.71002C21.5693 8.85106 21.8517 9.05833 22.0816 9.31756C22.3115 9.5768 22.4836 9.88211 22.5862 10.2131C22.6887 10.5441 22.7193 10.8933 22.6757 11.237L21.4632 20.237C21.3875 20.8357 21.0946 21.3857 20.6393 21.7877C20.184 22.1897 19.5975 22.4158 18.9882 22.425H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${s.dislikes}</span>
        </button>

        <span class="action-spacer"></span>

        <button class="action-btn comment-toggle" data-action="open-comments" data-post-id="${post.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${commentCount}</span>
        </button>
      </div>

      <div class="post-divider"></div>

      <div class="comments-section disabled" id="comments-${post.id}">
        <div class="comments-inner">
          <div class="no-comments">Коментарите се отварят в попъп</div>
        </div>
      </div>
    </article>
  `;
}

// ===== Modal =====
function openModal(postId, focus = 'post') {
  const post = getPostById(postId);
  if (!post) return;

  openPostId = postId;

  const modal = document.getElementById('postModal');
  const content = document.getElementById('postModalContent');

  content.innerHTML = renderModal(post);

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Focus the input by default for comments view
  if (focus === 'comments') {
    const right = content.querySelector('.modal-right');
    if (right) {
      right.classList.add('flash');
      const anchor = content.querySelector('#modal-comments-anchor');
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => right.classList.remove('flash'), 900);
    }
    const input = content.querySelector('.comment-input');
    if (input) input.focus();
  }
}

function closeModal() {
  const modal = document.getElementById('postModal');
  const content = document.getElementById('postModalContent');

  openPostId = null;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  content.innerHTML = '';
  document.body.style.overflow = '';
}

function renderModal(post) {
  const s = postStates[post.id];
  const commentCount = post.comments.length;

  return `
    <div class="modal-left">
      <div class="modal-top">
        <div class="post-header" style="padding:0;">
          <div class="post-avatar">${post.user.initials}</div>
          <div class="post-user-info">
            <span class="post-username">${post.user.name}</span>
            <span class="post-time">${post.time}</span>
          </div>
        </div>

        <button class="modal-close" data-action="close-modal" aria-label="Затвори">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <p class="modal-post-text">${post.text}</p>
      ${renderTags(post.tags)}

      <div class="post-media" style="margin-bottom:0;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Placeholder
      </div>
    </div>

    <aside class="modal-right">
      <div class="modal-section-title">Реакции</div>

      <div class="modal-actions">
        <button class="action-btn ${s.liked ? 'liked' : ''}" data-action="like" data-post-id="${post.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M7 22V11L2 13V22H7ZM7 11L11.5 2C12.3284 2 13.1235 2.32924 13.7097 2.91536C14.2959 3.50148 14.625 4.29653 14.625 5.125V8.5H20.25C20.5955 8.49743 20.9376 8.56898 21.2534 8.71002C21.5693 8.85106 21.8517 9.05833 22.0816 9.31756C22.3115 9.5768 22.4836 9.88211 22.5862 10.2131C22.6887 10.5441 22.7193 10.8933 22.6757 11.237L21.4632 20.237C21.3875 20.8357 21.0946 21.3857 20.6393 21.7877C20.184 22.1897 19.5975 22.4158 18.9882 22.425H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${s.likes}</span>
        </button>

        <button class="action-btn ${s.disliked ? 'disliked' : ''}" data-action="dislike" data-post-id="${post.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="transform: rotate(180deg)">
            <path d="M7 22V11L2 13V22H7ZM7 11L11.5 2C12.3284 2 13.1235 2.32924 13.7097 2.91536C14.2959 3.50148 14.625 4.29653 14.625 5.125V8.5H20.25C20.5955 8.49743 20.9376 8.56898 21.2534 8.71002C21.5693 8.85106 21.8517 9.05833 22.0816 9.31756C22.3115 9.5768 22.4836 9.88211 22.5862 10.2131C22.6887 10.5441 22.7193 10.8933 22.6757 11.237L21.4632 20.237C21.3875 20.8357 21.0946 21.3857 20.6393 21.7877C20.184 22.1897 19.5975 22.4158 18.9882 22.425H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${s.dislikes}</span>
        </button>
      </div>

      <div id="modal-comments-anchor" class="modal-section-title">Коментари (${commentCount})</div>

      <!-- ACTIVE comment input -->
      <div class="comments-inner" style="padding:0;">
        <div class="comment-input-wrapper" style="margin-bottom: 0.85rem;">
          <div class="comment-avatar">${CURRENT_USER.initials}</div>
          <input type="text"
                 class="comment-input"
                 placeholder="Напишете коментар..."
                 data-post-id="${post.id}"
                 data-action="comment-input">
          <button class="comment-send-btn"
                  data-action="send-comment"
                  data-post-id="${post.id}"
                  aria-label="Изпрати коментар">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        ${commentCount > 0 ? `
          <div class="comments-list" style="max-height: 420px;" id="modal-comments-list">
            ${post.comments.map(c => `
              <div class="comment-item">
                <div class="comment-avatar">${c.initials}</div>
                <div class="comment-body">
                  <div>
                    <span class="comment-author">${c.author}</span>
                    <span class="comment-text">${c.text}</span>
                  </div>
                  <div class="comment-meta">
                    <span>${c.time}</span>
                    <button data-action="noop">Отговори</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="no-comments" id="modal-no-comments">Все още няма коментари</div>
          <div class="comments-list" style="max-height: 420px; display:none;" id="modal-comments-list"></div>
        `}
      </div>
    </aside>
  `;
}

function rerenderModalIfOpen() {
  if (!openPostId) return;
  const post = getPostById(openPostId);
  if (!post) return;
  document.getElementById('postModalContent').innerHTML = renderModal(post);
}

function scrollCommentsToBottom() {
  const list = document.getElementById('modal-comments-list');
  if (!list) return;
  list.scrollTop = list.scrollHeight;
}

// ===== Events =====
function initEvents() {
  const feed = document.getElementById('feedContainer');

  // Click anywhere on post opens modal (unless action button clicked)
  feed.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      handleAction(actionBtn);
      return;
    }

    const card = e.target.closest('.post-card');
    if (card) {
      const postId = parseInt(card.dataset.postId);
      openModal(postId, 'post');
    }
  });

  // Modal delegation for buttons
  document.getElementById('postModal').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    handleAction(btn);
  });

  // Modal: Enter to send comment
  document.getElementById('postModal').addEventListener('keydown', (e) => {
    const input = e.target.closest('.comment-input');
    if (!input) return;

    if (e.key === 'Enter') {
      const postId = parseInt(input.dataset.postId);
      sendComment(postId, input.value);
    }
  });

  // ESC close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function handleAction(btn) {
  const action = btn.dataset.action;

  if (action === 'close-modal') {
    closeModal();
    return;
  }

  if (action === 'noop') return;

  const postId = btn.dataset.postId ? parseInt(btn.dataset.postId) : null;
  const s = postId ? postStates[postId] : null;

  switch (action) {
    case 'open-post': {
      if (!postId) return;
      openModal(postId, 'post');
      return;
    }

    case 'open-comments': {
      if (!postId) return;
      openModal(postId, 'comments');
      return;
    }

    case 'send-comment': {
      if (!postId) return;
      const input = document.querySelector('#postModalContent .comment-input');
      if (!input) return;
      sendComment(postId, input.value);
      return;
    }

    case 'like': {
      if (!s) return;
      if (s.liked) {
        s.liked = false;
        s.likes--;
      } else {
        s.liked = true;
        s.likes++;
        if (s.disliked) {
          s.disliked = false;
          s.dislikes--;
        }
      }
      renderFeed();
      rerenderModalIfOpen();
      return;
    }

    case 'dislike': {
      if (!s) return;
      if (s.disliked) {
        s.disliked = false;
        s.dislikes--;
      } else {
        s.disliked = true;
        s.dislikes++;
        if (s.liked) {
          s.liked = false;
          s.likes--;
        }
      }
      renderFeed();
      rerenderModalIfOpen();
      return;
    }
  }
}

function sendComment(postId, rawText) {
  const post = getPostById(postId);
  if (!post) return;

  const text = (rawText || '').trim();
  if (!text) return;

  const newComment = {
    id: nextCommentId(),
    author: CURRENT_USER.name,
    initials: CURRENT_USER.initials,
    text,
    time: formatNowTime()
  };

  post.comments.push(newComment);

  // Update UI
  renderFeed();
  rerenderModalIfOpen();

  // Clear input and scroll
  const input = document.querySelector('#postModalContent .comment-input');
  if (input) {
    input.value = '';
    input.focus();
  }

  // If "no comments" existed, it gets replaced by rerender.
  // Just scroll to bottom:
  setTimeout(scrollCommentsToBottom, 0);
}

// ===== Particle background =====
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
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 0.8,
        opacity: Math.random() * 0.4 + 0.15
      });
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      const dx = mouseX - p.x, dy = mouseY - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 150) { p.x -= dx * 0.008; p.y -= dy * 0.008; }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${p.opacity})`;
      ctx.fill();

      particles.slice(i + 1).forEach(o => {
        const dx2 = p.x - o.x, dy2 = p.y - o.y;
        const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d2 < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(o.x, o.y);
          ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - d2 / 100)})`;
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

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initPostStates();
  renderFeed();
  initEvents();
});
