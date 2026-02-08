// ===== My Posts Page =====

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
    dislikes: 1,
    comments: [
      { id: 1001, author: 'Иван Петров', initials: 'ИП', text: 'Много яко! Ще споделиш ли видео?', time: 'преди 45 мин' }
    ]
  },
  {
    id: 102,
    user: CURRENT_USER,
    time: 'вчера',
    text: 'Пускам кратък breakdown как правя path morph без да се “къса” формата. Най-важното е да имаш приблизително еднакъв брой сегменти и да нормализираш командите.',
    tags: ['pathmorph', 'svg', 'frontend', 'tips'],
    likes: 28,
    dislikes: 0,
    comments: []
  }
];

// ===== State =====
const postStates = {};
let openPostId = null;
let openMenuPostId = null; // which card menu is open

function initPostStates() {
  MY_POSTS.forEach(post => {
    postStates[post.id] = {
      liked: false,
      disliked: false,
      likes: post.likes,
      dislikes: post.dislikes
    };
  });
}

function getPostById(id) {
  return MY_POSTS.find(p => p.id === id);
}

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

function tagsToString(tags) {
  return normalizeTags(tags).map(t => `#${t}`).join(' ');
}

function parseTagsFromInput(str) {
  return String(str || '')
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => (s.startsWith('#') ? s.slice(1) : s))
    .map(s => s.replace(/\s+/g, ''))
    .filter(Boolean)
    .slice(0, 12);
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
  return 'току-що';
}

function nextCommentId() {
  let maxId = 0;
  MY_POSTS.forEach(p => p.comments.forEach(c => { if (c.id > maxId) maxId = c.id; }));
  return maxId + 1;
}

// ===== Render feed =====
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
  const s = postStates[post.id];
  const commentCount = post.comments.length;
  const showMore = shouldShowMore(post.text);

  const menuOpen = openMenuPostId === post.id;

  return `
    <article class="post-card" data-post-id="${post.id}">
      <div class="post-header">
        <div class="post-avatar">${post.user.initials}</div>
        <div class="post-user-info">
          <span class="post-username">${post.user.name}</span>
          <span class="post-time">${post.time}</span>
        </div>

        <div class="post-menu">
          <button class="post-menu-btn" aria-label="Опции" data-action="toggle-menu" data-post-id="${post.id}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
              <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
            </svg>
          </button>

          <div class="post-menu-dropdown ${menuOpen ? 'open' : ''}" id="menu-${post.id}">
            <button class="post-menu-item" data-action="open-edit" data-post-id="${post.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M16.5 3.5A2.121 2.121 0 0 1 19.5 6.5L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Редактирай
            </button>
            <button class="post-menu-item danger" data-action="delete-post" data-post-id="${post.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 6V4H16V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M19 6L18 20H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              Изтрий
            </button>
          </div>
        </div>
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

        <button class="action-btn" data-action="open-comments" data-post-id="${post.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${commentCount}</span>
        </button>
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
  content.innerHTML = renderModal(post, { editing: false });

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

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

function renderModal(post, { editing }) {
  const s = postStates[post.id];
  const commentCount = post.comments.length;

  const leftContent = editing
    ? `
      <textarea class="edit-textarea" id="editText">${post.text}</textarea>
      <div style="margin-top:0.75rem;">
        <input class="edit-tags-input" id="editTags" value="${tagsToString(post.tags)}" placeholder="#tag1 #tag2 #tag3">
        <div class="edit-help">Съвет: разделяй с интервал или запетая. Пример: <b>#svg #ui #motion</b></div>
      </div>
      <div class="edit-actions">
        <button class="manage-btn" data-action="save-edit" data-post-id="${post.id}">
          Запази
        </button>
        <button class="manage-btn" data-action="cancel-edit" data-post-id="${post.id}">
          Откажи
        </button>
      </div>
    `
    : `
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
    `;

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

      ${leftContent}
    </div>

    <aside class="modal-right">
      <div class="modal-section-title">Управление</div>
      <div class="manage-actions">
        <button class="manage-btn" data-action="open-edit" data-post-id="${post.id}">
          Редактирай
        </button>
        <button class="manage-btn danger" data-action="delete-post" data-post-id="${post.id}">
          Изтрий
        </button>
      </div>

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

      <div class="comments-inner" style="padding:0;">
        <div class="comment-input-wrapper" style="margin-bottom: 0.85rem;">
          <div class="comment-avatar">${CURRENT_USER.initials}</div>
          <input type="text"
                 class="comment-input"
                 placeholder="Напишете коментар..."
                 data-post-id="${post.id}">
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

        ${
          commentCount > 0
            ? `
              <div class="comments-list" id="modal-comments-list">
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
            `
            : `<div class="no-comments" id="modal-no-comments">Все още няма коментари</div>
               <div class="comments-list" id="modal-comments-list" style="display:none;"></div>`
        }
      </div>
    </aside>
  `;
}

function rerenderModalIfOpen(extra = {}) {
  if (!openPostId) return;
  const post = getPostById(openPostId);
  if (!post) return;
  const content = document.getElementById('postModalContent');

  // ако сме в edit mode -> държим editing=true
  content.innerHTML = renderModal(post, { editing: !!extra.editing });

  if (extra.focus === 'comments') {
    const anchor = content.querySelector('#modal-comments-anchor');
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function scrollCommentsToBottom() {
  const list = document.getElementById('modal-comments-list');
  if (!list) return;
  list.style.display = '';
  list.scrollTop = list.scrollHeight;
}

// ===== CRUD actions =====
function deletePost(postId) {
  const idx = MY_POSTS.findIndex(p => p.id === postId);
  if (idx === -1) return;

  const ok = confirm('Сигурен ли си, че искаш да изтриеш този пост?');
  if (!ok) return;

  MY_POSTS.splice(idx, 1);
  delete postStates[postId];

  // close modal if it was open
  if (openPostId === postId) closeModal();

  // close menu
  if (openMenuPostId === postId) openMenuPostId = null;

  renderFeed();
}

function saveEdit(postId) {
  const post = getPostById(postId);
  if (!post) return;

  const textEl = document.getElementById('editText');
  const tagsEl = document.getElementById('editTags');

  const newText = (textEl?.value || '').trim();
  const newTags = parseTagsFromInput(tagsEl?.value || '');

  if (!newText) {
    alert('Текстът не може да е празен.');
    return;
  }

  post.text = newText;
  post.tags = newTags;

  renderFeed();
  rerenderModalIfOpen({ editing: false });
}

// ===== Events =====
function initEvents() {
  const feed = document.getElementById('feedContainer');

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

  document.getElementById('postModal').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    handleAction(btn);
  });

  // Enter to send comment (modal)
  document.getElementById('postModal').addEventListener('keydown', (e) => {
    const input = e.target.closest('.comment-input');
    if (!input) return;
    if (e.key === 'Enter') {
      const postId = parseInt(input.dataset.postId);
      sendComment(postId, input.value);
    }
  });

  // close menu on outside click
  document.addEventListener('click', (e) => {
    const clickedMenu = e.target.closest('.post-menu');
    if (!clickedMenu && openMenuPostId !== null) {
      openMenuPostId = null;
      renderFeed();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      openMenuPostId = null;
      renderFeed();
      closeModal();
    }
  });
}

function handleAction(btn) {
  const action = btn.dataset.action;

  if (action === 'noop') return;

  if (action === 'close-modal') {
    closeModal();
    return;
  }

  const postId = btn.dataset.postId ? parseInt(btn.dataset.postId) : null;
  const s = postId ? postStates[postId] : null;

  switch (action) {
    case 'toggle-menu': {
      if (!postId) return;
      openMenuPostId = (openMenuPostId === postId) ? null : postId;
      renderFeed();
      return;
    }

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

    case 'open-edit': {
      // ако сме във фийда -> отвори модал директно в edit mode
      if (!postId) return;
      if (openPostId !== postId) openModal(postId, 'post');
      rerenderModalIfOpen({ editing: true });
      openMenuPostId = null;
      renderFeed();
      return;
    }

    case 'cancel-edit': {
      rerenderModalIfOpen({ editing: false });
      return;
    }

    case 'save-edit': {
      if (!postId) return;
      saveEdit(postId);
      return;
    }

    case 'delete-post': {
      if (!postId) return;
      deletePost(postId);
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
      if (s.liked) { s.liked = false; s.likes--; }
      else {
        s.liked = true; s.likes++;
        if (s.disliked) { s.disliked = false; s.dislikes--; }
      }
      renderFeed();
      rerenderModalIfOpen();
      return;
    }

    case 'dislike': {
      if (!s) return;
      if (s.disliked) { s.disliked = false; s.dislikes--; }
      else {
        s.disliked = true; s.dislikes++;
        if (s.liked) { s.liked = false; s.likes--; }
      }
      renderFeed();
      rerenderModalIfOpen();
      return;
    }
  }
}

// ===== Comments =====
function sendComment(postId, rawText) {
  const post = getPostById(postId);
  if (!post) return;

  const text = (rawText || '').trim();
  if (!text) return;

  post.comments.push({
    id: nextCommentId(),
    author: CURRENT_USER.name,
    initials: CURRENT_USER.initials,
    text,
    time: formatNowTime()
  });

  renderFeed();
  rerenderModalIfOpen({ focus: 'comments' });

  const input = document.querySelector('#postModalContent .comment-input');
  if (input) {
    input.value = '';
    input.focus();
  }

  setTimeout(scrollCommentsToBottom, 0);
}

// ===== Particle background (same) =====
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

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initPostStates();
  renderFeed();
  initEvents();
});
