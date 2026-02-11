import { getAllPostsRequest } from "/svganimator/frontend/src/services/posts.js";

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

function pickSvgFromApi(raw) {
  const candidates = [
    raw?.svg_text,
    raw?.svg,
    raw?.starting_svg,
    raw?.animation_svg,
    raw?.animation?.starting_svg,
    raw?.animation?.svg_text,
    raw?.animation?.svg,
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

  const likes = Number(
    raw?.likes_count ??
      raw?.likes ??
      raw?.post?.likes_count ??
      raw?.post?.likes ??
      0
  ) || 0;

  const dislikes = Number(
    raw?.dislikes_count ??
      raw?.dislikes ??
      raw?.post?.dislikes_count ??
      raw?.post?.dislikes ??
      0
  ) || 0;

  const userName =
    raw?.user?.name ??
    raw?.author?.name ??
    raw?.username ??
    raw?.post?.user?.name ??
    (raw?.user_id ? `User #${raw.user_id}` : "Потребител");

  const svgText = pickSvgFromApi(raw);
  const svgPreview = sanitizeSvg(svgText);

  return {
    id: Number(id),
    userName,
    userInitials: getInitials(userName),
    description: String(description || ""),
    createdAt,
    likes,
    dislikes,
    svgPreview,
  };
}

/* =========================
   State
========================= */
const state = {
  posts: [],
  visiblePosts: [],
  postIds: new Set(),

  currentPostId: null, // първо зареждане => без параметър
  loading: false,
  hasMore: true,

  searchText: "",
  searchTimer: null,

  reactions: {}, // local UI only
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
function ensureReactionState(post) {
  if (!state.reactions[post.id]) {
    state.reactions[post.id] = {
      liked: false,
      disliked: false,
      likes: post.likes,
      dislikes: post.dislikes,
    };
  }
  return state.reactions[post.id];
}

function renderFeed() {
  const container = el("feedContainer");
  if (!container) return;

  const list = state.visiblePosts;
  setEmpty(list.length === 0 && !state.loading);

  container.innerHTML = list.map((post, idx) => renderPostCard(post, idx)).join("");
}

function renderPostCard(post, index) {
  const r = ensureReactionState(post);
  const dateLabel = formatDateBg(post.createdAt);

  const svgHtml = post.svgPreview
    ? `<div class="post-svg">${post.svgPreview}</div>`
    : `<div class="post-media-fallback">Няма SVG</div>`;

  return `
    <article class="post-card" data-post-id="${post.id}" style="animation-delay:${Math.min(index * 0.05, 0.4)}s">
      <div class="post-header">
        <div class="post-avatar">${escapeHtml(post.userInitials)}</div>
        <div class="post-user-info">
          <span class="post-username">${escapeHtml(post.userName)}</span>
          <span class="post-time">${escapeHtml(dateLabel)}</span>
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
        <p class="post-text">${escapeHtml(post.description)}</p>

        <div class="post-media">
          ${svgHtml}
        </div>
      </div>

      <div class="post-actions">
        <button class="action-btn ${r.liked ? "liked" : ""}" data-action="like" data-post-id="${post.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M7 22V11L2 13V22H7ZM7 11L11.5 2C12.3284 2 13.1235 2.32924 13.7097 2.91536C14.2959 3.50148 14.625 4.29653 14.625 5.125V8.5H20.25C20.5955 8.49743 20.9376 8.56898 21.2534 8.71002C21.5693 8.85106 21.8517 9.05833 22.0816 9.31756C22.3115 9.5768 22.4836 9.88211 22.5862 10.2131C22.6887 10.5441 22.7193 10.8933 22.6757 11.237L21.4632 20.237C21.3875 20.8357 21.0946 21.3857 20.6393 21.7877C20.184 22.1897 19.5975 22.4158 18.9882 22.425H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${r.likes}</span>
        </button>

        <button class="action-btn ${r.disliked ? "disliked" : ""}" data-action="dislike" data-post-id="${post.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="transform: rotate(180deg)">
            <path d="M7 22V11L2 13V22H7ZM7 11L11.5 2C12.3284 2 13.1235 2.32924 13.7097 2.91536C14.2959 3.50148 14.625 4.29653 14.625 5.125V8.5H20.25C20.5955 8.49743 20.9376 8.56898 21.2534 8.71002C21.5693 8.85106 21.8517 9.05833 22.0816 9.31756C22.3115 9.5768 22.4836 9.88211 22.5862 10.2131C22.6887 10.5441 22.7193 10.8933 22.6757 11.237L21.4632 20.237C21.3875 20.8357 21.0946 21.3857 20.6393 21.7877C20.184 22.1897 19.5975 22.4158 18.9882 22.425H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="count">${r.dislikes}</span>
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
    state.searchTimer = setTimeout(() => {
      applySearch();
    }, 150);
  });
}

/* =========================
   Infinite scroll
========================= */
async function loadMorePosts() {
  if (state.loading || !state.hasMore) return;

  state.loading = true;
  setLoader(true);

  const res = await getAllPostsRequest({ currentPostId: state.currentPostId });

  state.loading = false;
  setLoader(false);

  if (!res || res.success !== true) {
    console.error("[posts] load error:", res);
    state.hasMore = false;
    applySearch();
    return;
  }

  // backend: { success:true, nextPosts:[...] }
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
    ensureReactionState(p);
    added++;
  }

  // update cursor
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
      if (entry && entry.isIntersecting) {
        await loadMorePosts();
      }
    },
    { root: null, rootMargin: "600px 0px", threshold: 0.01 }
  );

  io.observe(sentinel);
}

/* =========================
   Reactions (local only)
========================= */
function toggleLike(postId) {
  const r = state.reactions[postId];
  if (!r) return;

  if (r.liked) {
    r.liked = false;
    r.likes = Math.max(0, r.likes - 1);
  } else {
    r.liked = true;
    r.likes += 1;
    if (r.disliked) {
      r.disliked = false;
      r.dislikes = Math.max(0, r.dislikes - 1);
    }
  }

  renderFeed();
}

function toggleDislike(postId) {
  const r = state.reactions[postId];
  if (!r) return;

  if (r.disliked) {
    r.disliked = false;
    r.dislikes = Math.max(0, r.dislikes - 1);
  } else {
    r.disliked = true;
    r.dislikes += 1;
    if (r.liked) {
      r.liked = false;
      r.likes = Math.max(0, r.likes - 1);
    }
  }

  renderFeed();
}

/* =========================
   Events
========================= */
function initEvents() {
  const feed = el("feedContainer");
  if (!feed) return;

  // само бутони like/dislike, няма отваряне на post
  feed.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === "noop") return;

    const postId = btn.dataset.postId ? parseInt(btn.dataset.postId, 10) : null;
    if (!postId) return;

    if (action === "like") toggleLike(postId);
    if (action === "dislike") toggleDislike(postId);
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
   Init
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  initParticles();
  initSearch();
  initEvents();
  initInfiniteScroll();

  await loadMorePosts();
});
