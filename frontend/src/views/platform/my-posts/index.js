import { getMyPostsRequest, deleteMyPostRequest } from "/svganimator/frontend/src/services/posts.js";

/* =========================
   Utils
========================= */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizeSvg(svgText) {
  if (!svgText || typeof svgText !== "string") return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return "";

  doc.querySelectorAll("script, foreignObject").forEach((n) => n.remove());

  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || "").trim().toLowerCase();

      if (name.startsWith("on")) el.removeAttribute(attr.name);

      if ((name === "href" || name === "xlink:href") && value.startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  if (!svg.getAttribute("viewBox")) {
    const w = svg.getAttribute("width");
    const h = svg.getAttribute("height");
    const wNum = w ? parseFloat(w) : NaN;
    const hNum = h ? parseFloat(h) : NaN;
    if (Number.isFinite(wNum) && Number.isFinite(hNum)) {
      svg.setAttribute("viewBox", `0 0 ${wNum} ${hNum}`);
    }
  }

  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return svg.outerHTML;
}

function formatDateBg(createdAt) {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("bg-BG", { year: "numeric", month: "long", day: "numeric" });
}

function getInitials(name) {
  const n = String(name || "").trim();
  if (!n) return "??";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "?").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "?").toUpperCase();
  return `${a}${b}`;
}

function safeJsonParse(str) {
  if (!str || typeof str !== "string") return null;
  try { return JSON.parse(str); } catch { return null; }
}

function pickSvgFromApi(raw) {
  const candidates = [
    raw?.svg_text,
    raw?.svg,
    raw?.starting_svg,
    raw?.animation_svg,
    raw?.animation?.starting_svg,
    raw?.animation?.svg_text,
    raw?.animation?.svg,
    raw?.animation?.starting_svg,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().startsWith("<svg")) return c;
  }
  return "";
}

function mapApiPost(raw) {
  const id = raw?.id ?? raw?.post_id ?? raw?.post?.id ?? raw?.post?.post_id;

  const description =
    raw?.description ??
    raw?.text ??
    raw?.post?.description ??
    raw?.post?.text ??
    "";

  const createdAt =
    raw?.created_at ??
    raw?.createdAt ??
    raw?.post?.created_at ??
    raw?.post?.createdAt ??
    null;

  const likes = Number(raw?.likes_count ?? raw?.likes ?? 0) || 0;
  const dislikes = Number(raw?.dislikes_count ?? raw?.dislikes ?? 0) || 0;

  const userName =
    raw?.username ??
    raw?.user?.name ??
    raw?.author?.name ??
    (raw?.user_id ? `User #${raw.user_id}` : "Потребител");

  const anim = raw?.animation || raw?.post?.animation || null;

  const svgText = pickSvgFromApi(raw) || anim?.starting_svg || "";
  const svgPreview = sanitizeSvg(svgText);

  // ⚠️ ако backend не ги връща — плейъра ще бъде disabled (но thumbnail ще се вижда)
  const animationSegments =
    (Array.isArray(raw?.animation_segments) && raw.animation_segments) ||
    (Array.isArray(anim?.animation_segments) && anim.animation_segments) ||
    (Array.isArray(anim?.segments) && anim.segments) ||
    [];

  const animationSettings =
    raw?.animation_settings ??
    anim?.animation_settings ??
    anim?.settings ??
    null;

  // duration опит (ако го имаш в settings)
  const settingsObj =
    typeof animationSettings === "string" ? safeJsonParse(animationSettings) : animationSettings;
  const fps = Number(settingsObj?.fps ?? 30) || 30;
  const durationGuess =
    Number(anim?.duration ?? raw?.duration ?? 0) ||
    0;

  return {
    id: Number(id),
    userName: String(userName || "Потребител"),
    userInitials: getInitials(userName),
    description: String(description || ""),
    createdAt,
    likes,
    dislikes,

    svgPreview,

    animationName: String(anim?.name || ""),
    animationSegments,
    animationSettings,
    fps,
    durationGuess,
  };
}

/* =========================
   Inline ConfirmationModal
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
    if (e.key === "Escape" && overlay.classList.contains("active")) cleanupResolve(false);
  });

  window.ConfirmationModal = { open, close };
}

/* =========================
   State
========================= */
const state = {
  posts: [],
  visiblePosts: [],
  postIds: new Set(),

  currentPostId: null,
  loading: false,
  hasMore: true,

  searchText: "",
  searchTimer: null,
};

/* =========================
   DOM helpers
========================= */
function el(id) {
  return document.getElementById(id);
}

function setLoader(isLoading) {
  const loader = el("feedLoader");
  if (!loader) return;
  loader.style.display = isLoading ? "flex" : "none";
}

function setEmpty(isEmpty) {
  const empty = el("feedEmpty");
  if (!empty) return;
  empty.style.display = isEmpty ? "block" : "none";
}

/* =========================
   Rendering
========================= */
function renderFeed() {
  stopAllPlayers(true);

  const container = el("feedContainer");
  if (!container) return;

  const list = state.visiblePosts;
  setEmpty(list.length === 0 && !state.loading);

  container.innerHTML = list.map((post, idx) => renderPostCard(post, idx)).join("");
  hydrateVideoPlayers();
}

function renderPostCard(post, index) {
  const dateLabel = formatDateBg(post.createdAt);

  const hasVideo = Array.isArray(post.animationSegments) && post.animationSegments.length > 0;

  const svgHtml = post.svgPreview
    ? `
      <div class="post-video" data-video-root data-post-id="${post.id}">
        <div class="post-video-stage" data-video-stage>
          <div class="post-svg">${post.svgPreview}</div>
        </div>

        <button
          class="post-video-play"
          type="button"
          data-action="toggle-video"
          data-post-id="${post.id}"
          ${hasVideo ? "" : "disabled"}
          aria-label="${hasVideo ? "Пусни/Спри" : "Няма анимация"}"
          title="${hasVideo ? "Play / Pause" : "Няма сегменти"}"
        >
          <svg class="icon-play" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V6L19 12L9 18Z" fill="currentColor"/>
          </svg>
          <svg class="icon-pause" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M7 6H10V18H7V6ZM14 6H17V18H14V6Z" fill="currentColor"/>
          </svg>
        </button>

        <div class="post-video-hud">
          <div class="post-video-time" data-video-time>0:00 / 0:00</div>
          <div class="post-video-progress">
            <div class="post-video-progress-fill" data-video-progress></div>
          </div>
        </div>
      </div>
    `
    : `<div class="post-media-fallback">Няма SVG</div>`;

  return `
    <article class="post-card" data-post-id="${post.id}" style="animation-delay:${Math.min(index * 0.05, 0.4)}s">
      <div class="post-header">
        <div class="post-avatar">${escapeHtml(post.userInitials)}</div>
        <div class="post-user-info">
          <span class="post-username">${escapeHtml(post.userName)}</span>
          <span class="post-time">${escapeHtml(dateLabel)}</span>
        </div>

        <button class="post-delete-btn" data-action="delete-post" data-post-id="${post.id}" aria-label="Изтрий">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M8 6V4H16V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M19 6L18 20H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Изтрий
        </button>
      </div>

      <div class="post-content">
        <p class="post-text">${escapeHtml(post.description)}</p>

        <div class="post-media">
          ${svgHtml}
        </div>
      </div>

      <div class="post-actions">
        <!-- ✅ read-only -->
        <button class="action-btn readonly" type="button" disabled aria-disabled="true" title="Само за преглед">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M7 22V11L2 13V22H7ZM7 11L11.5 2C12.3284 2 13.1235 2.32924 13.7097 2.91536C14.2959 3.50148 14.625 4.29653 14.625 5.125V8.5H20.25C20.5955 8.49743 20.9376 8.56898 21.2534 8.71002C21.5693 8.85106 21.8517 9.05833 22.0816 9.31756C22.3115 9.5768 22.4836 9.88211 22.5862 10.2131C22.6887 10.5441 22.7193 10.8933 22.6757 11.237L21.4632 20.237C21.3875 20.8357 21.0946 21.3857 20.6393 21.7877C20.184 22.1897 19.5975 22.4158 18.9882 22.425H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${Number(post.likes) || 0}</span>
        </button>

        <button class="action-btn readonly" type="button" disabled aria-disabled="true" title="Само за преглед">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="transform: rotate(180deg)">
            <path d="M7 22V11L2 13V22H7ZM7 11L11.5 2C12.3284 2 13.1235 2.32924 13.7097 2.91536C14.2959 3.50148 14.625 4.29653 14.625 5.125V8.5H20.25C20.5955 8.49743 20.9376 8.56898 21.2534 8.71002C21.5693 8.85106 21.8517 9.05833 22.0816 9.31756C22.3115 9.5768 22.4836 9.88211 22.5862 10.2131C22.6887 10.5441 22.7193 10.8933 22.6757 11.237L21.4632 20.237C21.3875 20.8357 21.0946 21.3857 20.6393 21.7877C20.184 22.1897 19.5975 22.4158 18.9882 22.425H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${Number(post.dislikes) || 0}</span>
        </button>

        <span class="action-spacer"></span>
      </div>
    </article>
  `;
}

/* =========================
   Search
========================= */
function applySearch() {
  const q = state.searchText.trim().toLowerCase();
  if (!q) {
    state.visiblePosts = [...state.posts];
    renderFeed();
    return;
  }

  state.visiblePosts = state.posts.filter((p) => {
    const t = (p.description || "").toLowerCase();
    const u = (p.userName || "").toLowerCase();
    return t.includes(q) || u.includes(q);
  });

  renderFeed();
}

function initSearch() {
  const input = el("searchInput");
  if (!input) return;

  input.addEventListener("input", (e) => {
    const value = String(e.target.value || "");
    state.searchText = value;

    if (state.searchTimer) clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => applySearch(), 150);
  });
}

/* =========================
   Infinite scroll
========================= */
async function loadMorePosts() {
  if (state.loading || !state.hasMore) return;

  state.loading = true;
  setLoader(true);

  const res = await getMyPostsRequest({ currentPostId: state.currentPostId });

  state.loading = false;
  setLoader(false);

  if (!res || res.success !== true) {
    console.error("[my-posts] load error:", res);
    state.hasMore = false;
    applySearch();
    return;
  }

  const rawList =
    (Array.isArray(res.nextPosts) && res.nextPosts) ||
    (Array.isArray(res.posts) && res.posts) ||
    (Array.isArray(res.data?.nextPosts) && res.data.nextPosts) ||
    (Array.isArray(res.data?.posts) && res.data.posts) ||
    (Array.isArray(res.data) && res.data) ||
    [];

  const mapped = rawList.map(mapApiPost).filter((p) => Number.isFinite(p.id));

  let added = 0;
  for (const p of mapped) {
    if (state.postIds.has(p.id)) continue;
    state.postIds.add(p.id);
    state.posts.push(p);
    added++;
  }

  if (state.posts.length > 0) {
    state.currentPostId = state.posts[state.posts.length - 1].id;
  }

  if (added === 0) state.hasMore = false;

  applySearch();
}

function initInfiniteScroll() {
  const sentinel = el("feedSentinel");
  if (!sentinel) return;

  const io = new IntersectionObserver(
    async (entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting) await loadMorePosts();
    },
    { root: null, rootMargin: "600px 0px", threshold: 0.01 }
  );

  io.observe(sentinel);
}

/* =========================
   Delete
========================= */
async function deleteWithConfirmation(postId) {
  const post = state.posts.find((p) => p.id === postId);

  const ok = await window.ConfirmationModal.open({
    title: "Потвърждение",
    message: `Сигурен ли си, че искаш да изтриеш този пост${post?.animationName ? ` (“${post.animationName}”)` : ""}?`,
    confirmText: "Изтрий",
    cancelText: "Откажи",
  });

  if (!ok) return;

  const res = await deleteMyPostRequest({ postId });
  if (!res || res.success !== true) {
    console.error("[my-posts] delete error:", res);
    alert(res?.error?.message || "Грешка при изтриване.");
    return;
  }

  // remove locally
  state.posts = state.posts.filter((p) => p.id !== postId);
  state.visiblePosts = state.visiblePosts.filter((p) => p.id !== postId);
  state.postIds.delete(postId);

  renderFeed();
}

/* =========================
   Events
========================= */
function initEvents() {
  const feed = el("feedContainer");
  if (!feed) return;

  feed.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const postId = btn.dataset.postId ? parseInt(btn.dataset.postId, 10) : null;

    if (action === "toggle-video") {
      if (!postId) return;
      toggleVideo(postId);
    }

    if (action === "delete-post") {
      if (!postId) return;
      deleteWithConfirmation(postId);
    }
  });
}

/* =========================
   Particle background
========================= */
function initParticles() {
  const canvas = document.getElementById("particleCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particles = [];
  let mouseX = 0, mouseY = 0;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

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
        opacity: Math.random() * 0.4 + 0.15,
      });
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 150) {
        p.x -= dx * 0.008;
        p.y -= dy * 0.008;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${p.opacity})`;
      ctx.fill();

      particles.slice(i + 1).forEach((o) => {
        const dx2 = p.x - o.x;
        const dy2 = p.y - o.y;
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

  resize();
  createParticles();
  draw();

  window.addEventListener("resize", () => {
    resize();
    createParticles();
  });

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
}

/* =========================
   Player (same as your posts page)
========================= */
const players = new Map();
const PLAYER_DEFAULT_FPS = 30;

function formatTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function safeParseJson(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function parseSettings(settingsStrOrObj) {
  const parsed =
    typeof settingsStrOrObj === "string"
      ? safeParseJson(settingsStrOrObj)
      : (typeof settingsStrOrObj === "object" ? settingsStrOrObj : null);

  return {
    fps: Number(parsed?.fps ?? PLAYER_DEFAULT_FPS) || PLAYER_DEFAULT_FPS,
    canvasBgColor: typeof parsed?.canvasBgColor === "string" ? parsed.canvasBgColor : "#0a0a12",
    transparentBg: !!parsed?.transparentBg,
    useOriginalViewBox: parsed?.useOriginalViewBox !== false,
    keepCentered: parsed?.keepCentered !== false,
    viewBox: parsed?.viewBox || null,
  };
}

function applyPreviewSettings(svgRoot, stageEl, settings) {
  if (!svgRoot) return;

  if (stageEl) {
    stageEl.style.background = settings.transparentBg ? "transparent" : (settings.canvasBgColor || "#0a0a12");
  }

  if (!settings.useOriginalViewBox && settings.viewBox) {
    const vb = settings.viewBox;
    const minX = Number(vb.minX ?? 0) || 0;
    const minY = Number(vb.minY ?? 0) || 0;
    const w = Math.max(1, Number(vb.width ?? 800) || 800);
    const h = Math.max(1, Number(vb.height ?? 600) || 600);
    svgRoot.setAttribute("viewBox", `${minX} ${minY} ${w} ${h}`);
  }

  svgRoot.setAttribute("preserveAspectRatio", settings.keepCentered ? "xMidYMid meet" : "xMinYMin meet");
}

/**
 * ⚠️ Тук няма да анимираме без сегменти.
 * Ако добавиш segments в backend response – ще върнем пълната логика.
 */
function createPlayerForPost(post) {
  const root = document.querySelector(`.post-video[data-post-id="${post.id}"]`);
  if (!root) return null;

  const stage = root.querySelector("[data-video-stage]");
  const timeEl = root.querySelector("[data-video-time]");
  const progressFill = root.querySelector("[data-video-progress]");
  const svg = stage?.querySelector("svg");
  if (!svg) return null;

  const settings = parseSettings(post.animationSettings);
  applyPreviewSettings(svg, stage, settings);

  const segs = Array.isArray(post.animationSegments) ? post.animationSegments : [];
  const hasSegments = segs.length > 0;

  const fps = Number(settings.fps) || PLAYER_DEFAULT_FPS;
  const totalDuration = hasSegments ? 0 : 0; // без сегменти -> 0:00

  const ctrl = {
    postId: post.id,
    root,
    svg,
    timeEl,
    progressFill,
    isPlaying: false,

    updateHud() {
      const cur = 0;
      const tot = totalDuration;
      if (this.timeEl) this.timeEl.textContent = `${formatTime(cur)} / ${formatTime(tot)}`;
      if (this.progressFill) this.progressFill.style.width = "0%";
    },

    toggle() {
      // няма сегменти => просто игнор
      this.updateHud();
    },

    destroy(reset = false) {
      this.isPlaying = false;
      this.root.classList.remove("is-playing");
      this.updateHud();
    }
  };

  ctrl.updateHud();
  return ctrl;
}

function hydrateVideoPlayers() {
  const visibleIds = new Set(state.visiblePosts.map((p) => p.id));

  for (const [postId, ctrl] of players.entries()) {
    if (!visibleIds.has(postId)) {
      ctrl.destroy(false);
      players.delete(postId);
    }
  }

  for (const post of state.visiblePosts) {
    if (!post.svgPreview) continue;

    if (players.has(post.id)) {
      players.get(post.id).destroy(false);
      players.delete(post.id);
    }

    const ctrl = createPlayerForPost(post);
    if (ctrl) players.set(post.id, ctrl);
  }
}

function stopAllPlayers(reset = false) {
  for (const ctrl of players.values()) ctrl.destroy(reset);
  players.clear();
}

function toggleVideo(postId) {
  const ctrl = players.get(postId);
  if (!ctrl) return;
  ctrl.toggle();
}

/* =========================
   Init
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  initParticles();
  initSearch();
  initEvents();
  initConfirmationModal();
  initInfiniteScroll();

  await loadMorePosts();
});
