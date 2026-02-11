import { getMyPostsRequest, deletePostRequest } from "/svganimator/frontend/src/services/posts.js";

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

  // remove dangerous nodes
  doc.querySelectorAll("script, foreignObject").forEach((n) => n.remove());

  // remove inline event handlers + javascript: hrefs
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

  // ensure viewBox if missing
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

/**
 * ВАЖНО: работи с твоя нов респонс:
 * - raw.animation.duration
 * - raw.animation.animation_settings
 * - raw.animation.animation_segments
 */
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

  const likes = Number(raw?.likes_count ?? raw?.likes ?? raw?.post?.likes_count ?? raw?.post?.likes ?? 0) || 0;
  const dislikes = Number(raw?.dislikes_count ?? raw?.dislikes ?? raw?.post?.dislikes_count ?? raw?.post?.dislikes ?? 0) || 0;

  const userName =
    raw?.user?.name ??
    raw?.author?.name ??
    raw?.username ??
    raw?.post?.user?.name ??
    (raw?.user_id ? `User #${raw.user_id}` : "Потребител");

  const anim = raw?.animation || raw?.post?.animation || null;

  const svgText = pickSvgFromApi(raw) || "";
  const svgPreview = sanitizeSvg(svgText);

  const animationSegments =
    (Array.isArray(anim?.animation_segments) && anim.animation_segments) ||
    (Array.isArray(anim?.segments) && anim.segments) ||
    [];

  const animationSettings =
    anim?.animation_settings ??
    anim?.settings ??
    null;

  const animationDuration =
    Number(anim?.duration ?? raw?.duration ?? 0) || 0;

  return {
    id: Number(id),
    userName,
    userInitials: getInitials(userName),
    description: String(description || ""),
    createdAt,
    likes,
    dislikes,
    svgPreview,

    animationId: Number(anim?.id ?? raw?.animation_id ?? 0) || 0,
    animationName: String(anim?.name || ""),
    animationSegments,
    animationSettings,
    animationDuration,
  };
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
   Confirm modal (inline from HTML)
========================= */
const confirmModal = {
  overlay: null,
  messageEl: null,
  btnCancel: null,
  btnConfirm: null,
  btnClose: null,

  onConfirm: null,

  init() {
    this.overlay = el("confirmModalOverlay");
    this.messageEl = el("confirmModalMessage");
    this.btnCancel = el("confirmModalCancel");
    this.btnConfirm = el("confirmModalConfirm");
    this.btnClose = el("confirmModalClose");

    if (!this.overlay || !this.messageEl || !this.btnCancel || !this.btnConfirm || !this.btnClose) {
      console.warn("[confirmModal] missing DOM nodes");
      return;
    }

    const close = () => this.close();

    this.btnCancel.addEventListener("click", close);
    this.btnClose.addEventListener("click", close);

    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) close();
    });

    this.btnConfirm.addEventListener("click", async () => {
      const fn = this.onConfirm;
      this.close();
      if (typeof fn === "function") {
        await fn();
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.overlay.classList.contains("active")) {
        close();
      }
    });
  },

  open({ message = "Сигурен ли си?", onConfirm }) {
    if (!this.overlay) this.init();
    if (!this.overlay) return;

    this.messageEl.textContent = String(message || "Сигурен ли си?");
    this.onConfirm = typeof onConfirm === "function" ? onConfirm : null;

    this.overlay.classList.add("active");
  },

  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove("active");
    this.onConfirm = null;
  },
};

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
  stopAllPlayers(true);

  const container = el("feedContainer");
  if (!container) return;

  const list = state.visiblePosts;
  setEmpty(list.length === 0 && !state.loading);

  container.innerHTML = list.map((post, idx) => renderPostCard(post, idx)).join("");

  hydrateVideoPlayers();
}

function renderPostCard(post, index) {
  const r = ensureReactionState(post);
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

        <!-- ✅ ВЪРНАТ delete бутон -->
        <button
          class="post-delete-btn"
          type="button"
          data-action="delete"
          data-post-id="${post.id}"
          aria-label="Изтрий публикацията"
          title="Изтрий"
        >
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

  const res = await getMyPostsRequest({ currentPostId: state.currentPostId });

  state.loading = false;
  setLoader(false);

  if (!res || res.success !== true) {
    console.error("[posts] load error:", res);
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
    ensureReactionState(p);
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
   Post "Video" Players
========================= */
const players = new Map();
const PLAYER_DEFAULT_FPS = 30;

function safeParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function formatTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/* ======= SVG value helpers ======= */
function ensurePxIfLength(propName, value) {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (!s) return "";

  if (propName !== "stroke-width" && propName !== "font-size") return s;

  if (/^-?\d+(\.\d+)?[a-z%]+$/i.test(s)) return s;
  if (/^-?\d+(\.\d+)?$/.test(s)) return `${s}px`;
  return s;
}

function setSvgProperty(element, property, value) {
  if (!element) return;
  const v = value == null ? "" : String(value);

  try {
    element.setAttribute(property, v);
  } catch {}

  const styleable = new Set(["opacity", "fill", "stroke", "stroke-width", "font-size", "x", "y"]);
  if (element.style && typeof element.style.setProperty === "function" && styleable.has(property)) {
    element.style.setProperty(property, v);
  }
}

function getStyleAttrValue(element, propName) {
  const styleAttr = element?.getAttribute?.("style");
  if (!styleAttr) return "";
  const parts = String(styleAttr).split(";");
  for (const part of parts) {
    const [k, ...rest] = part.split(":");
    if (!k || !rest.length) continue;
    if (k.trim().toLowerCase() === propName.toLowerCase()) {
      return rest.join(":").trim();
    }
  }
  return "";
}

function getFallbackDefaultForProp(propName) {
  if (propName === "stroke-width") return "1px";
  if (propName === "font-size") return "16px";
  if (propName === "opacity") return "1";
  return "";
}

function getResolvedValue(svgRoot, element, propName) {
  if (!element) return "";

  let currentValue = element.getAttribute(propName);

  if (!currentValue || String(currentValue).trim() === "") {
    const inline = element.style?.getPropertyValue?.(propName);
    if (inline && inline.trim()) currentValue = inline.trim();
  }

  if (!currentValue || String(currentValue).trim() === "") {
    const raw = getStyleAttrValue(element, propName);
    if (raw) currentValue = raw;
  }

  if (!currentValue || String(currentValue).trim() === "") {
    const cs = window.getComputedStyle(element);
    let v = cs.getPropertyValue(propName);
    if (v && typeof v === "string") v = v.trim();
    if (!v) {
      const camel = propName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      v = (cs[camel] || "").toString().trim();
    }
    currentValue = v || "";
  }

  if (!currentValue || String(currentValue).trim() === "") {
    currentValue = getFallbackDefaultForProp(propName);
  }

  currentValue = ensurePxIfLength(propName, currentValue);
  return String(currentValue || "").trim();
}

function parseNumberWithUnit(v) {
  const s = String(v ?? "").trim();
  const m = s.match(/^(-?\d+(\.\d+)?)([a-z%]*)$/i);
  if (!m) return null;
  return { num: parseFloat(m[1]), unit: m[3] || "" };
}

function interpolateNumberWithUnit(from, to, progress) {
  const a = parseNumberWithUnit(from);
  const b = parseNumberWithUnit(to);
  if (!a || !b) return null;
  if (a.unit !== b.unit) return null;
  const value = a.num + (b.num - a.num) * progress;
  return `${value}${a.unit}`;
}

function cubicBezierYForX(x, p1x, p1y, p2x, p2y) {
  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const bezX = (t) => ((ax * t + bx) * t + cx) * t;
  const bezXDer = (t) => (3 * ax * t + 2 * bx) * t + cx;
  const bezY = (t) => ((ay * t + by) * t + cy) * t;

  let t = clamp01(x);
  for (let i = 0; i < 6; i++) {
    const x2 = bezX(t) - x;
    const d = bezXDer(t);
    if (Math.abs(x2) < 1e-6) break;
    if (Math.abs(d) < 1e-6) break;
    t = clamp01(t - x2 / d);
  }
  return clamp01(bezY(t));
}

function applyEasing(t, easing) {
  const tt = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "linear":
      return tt;
    case "ease":
      return cubicBezierYForX(tt, 0.25, 0.1, 0.25, 1);
    case "ease-in":
      return cubicBezierYForX(tt, 0.42, 0, 1, 1);
    case "ease-out":
      return cubicBezierYForX(tt, 0, 0, 0.58, 1);
    case "ease-in-out":
      return cubicBezierYForX(tt, 0.42, 0, 0.58, 1);
    default: {
      const m = String(easing || "").match(
        /^cubic-bezier\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/i
      );
      if (m) {
        const p1x = parseFloat(m[1]);
        const p1y = parseFloat(m[2]);
        const p2x = parseFloat(m[3]);
        const p2y = parseFloat(m[4]);
        if ([p1x, p1y, p2x, p2y].every((n) => Number.isFinite(n))) {
          return cubicBezierYForX(tt, p1x, p1y, p2x, p2y);
        }
      }
      return tt;
    }
  }
}

/* ======= Settings for preview ======= */
function normalizeLoadedSettings(raw) {
  const out = {
    fps: PLAYER_DEFAULT_FPS,
    useOriginalViewBox: true,
    viewBox: null,
    keepCentered: true,
    canvasBgColor: "#0a0a12",
    transparentBg: false,
  };

  if (!raw || typeof raw !== "object") return out;

  if (Number.isFinite(Number(raw.fps))) out.fps = Math.max(1, Math.min(120, Number(raw.fps)));
  if (typeof raw.useOriginalViewBox === "boolean") out.useOriginalViewBox = raw.useOriginalViewBox;

  if (raw.viewBox && typeof raw.viewBox === "object") {
    out.viewBox = {
      minX: Number(raw.viewBox.minX ?? 0) || 0,
      minY: Number(raw.viewBox.minY ?? 0) || 0,
      width: Math.max(1, Number(raw.viewBox.width ?? 800) || 800),
      height: Math.max(1, Number(raw.viewBox.height ?? 600) || 600),
    };
  }

  if (typeof raw.keepCentered === "boolean") out.keepCentered = raw.keepCentered;

  if (typeof raw.canvasBgColor === "string" && raw.canvasBgColor.trim()) {
    out.canvasBgColor = raw.canvasBgColor.trim();
  }

  if (typeof raw.transparentBg === "boolean") out.transparentBg = raw.transparentBg;

  return out;
}

function parseSettings(settingsStrOrObj) {
  const parsed =
    typeof settingsStrOrObj === "string"
      ? safeParseJson(settingsStrOrObj)
      : (typeof settingsStrOrObj === "object" ? settingsStrOrObj : null);

  return normalizeLoadedSettings(parsed);
}

function applyPreviewSettings(svgRoot, stageEl, settings) {
  if (!svgRoot) return;

  if (stageEl) {
    stageEl.style.background = settings.transparentBg
      ? "transparent"
      : (settings.canvasBgColor || "#0a0a12");
  }

  if (!settings.useOriginalViewBox && settings.viewBox) {
    const vb = settings.viewBox;
    svgRoot.setAttribute("viewBox", `${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`);
  }

  svgRoot.setAttribute(
    "preserveAspectRatio",
    settings.keepCentered ? "xMidYMid meet" : "xMinYMin meet"
  );
}

/* ======= Segments normalize (FIX: element_id by DOM order) ======= */
function extractAnimPropertyAndToValue(seg) {
  const animData =
    typeof seg.animation_data === "string"
      ? safeParseJson(seg.animation_data)
      : (seg.animation_data || null);

  if (!animData || typeof animData !== "object") return { property: null, toValue: null };

  const keys = Object.keys(animData);
  if (!keys.length) return { property: null, toValue: null };

  const property = keys[0];
  const toValue = animData[property];

  return { property, toValue };
}

function normalizeSegmentsForPlayer(rawSegments, svgRoot) {
  const segments = Array.isArray(rawSegments) ? rawSegments : [];
  const allEls = Array.from(svgRoot.querySelectorAll("*")); // svg itself is NOT included

  const parsed = [];

  for (const seg of segments) {
    const start = Number(seg.start_at ?? seg.startTime ?? 0) || 0;
    const dur =
      Number(seg.duration ?? 0) ||
      Math.max(0, (Number(seg.end_at ?? 0) || 0) - start);

    const easing = String(seg.easing || "linear");
    const { property, toValue } = extractAnimPropertyAndToValue(seg);

    if (!property) continue;

    let targetEl = null;

    // 1) selector ако някой ден го добавиш
    if (seg.element_selector && typeof seg.element_selector === "string") {
      try {
        targetEl = svgRoot.querySelector(seg.element_selector);
      } catch {
        targetEl = null;
      }
    }

    // 2) element_id => DOM order (1-based)
    if (!targetEl) {
      const uid = Number(seg.element_id ?? seg.element_uid);
      if (Number.isFinite(uid) && uid >= 1 && uid <= allEls.length) {
        targetEl = allEls[uid - 1] || null;
      }
    }

    // 2.1) off-by-one fallback
    if (!targetEl) {
      const uid = Number(seg.element_id ?? seg.element_uid);
      if (Number.isFinite(uid)) {
        const a = allEls[uid] || null; // +1
        const b = allEls[uid - 2] || null; // -1
        targetEl = a || b || null;
      }
    }

    if (!targetEl) continue;

    const toNorm = ensurePxIfLength(property, String(toValue ?? ""));

    parsed.push({
      element: targetEl,
      property,
      toValue: toNorm,
      startTime: Math.max(0, start),
      duration: Math.max(0.001, dur),
      easing,
      fromValue: "",
    });
  }

  // chain fromValue per element+property by start order
  const byEl = new Map();
  for (const s of parsed) {
    if (!byEl.has(s.element)) byEl.set(s.element, new Map());
    const mp = byEl.get(s.element);
    if (!mp.has(s.property)) mp.set(s.property, []);
    mp.get(s.property).push(s);
  }

  for (const mp of byEl.values()) {
    for (const arr of mp.values()) {
      arr.sort((a, b) => a.startTime - b.startTime);
      let prevTo = null;
      for (const s of arr) {
        const base = prevTo ?? getResolvedValue(svgRoot, s.element, s.property);
        s.fromValue = ensurePxIfLength(s.property, String(base ?? ""));
        prevTo = s.toValue;
      }
    }
  }

  return parsed;
}

function getFpsFromSettings(settings) {
  const s = parseSettings(settings);
  const fps = Number(s.fps);
  if (Number.isFinite(fps) && fps > 0 && fps <= 120) return fps;
  return PLAYER_DEFAULT_FPS;
}

function computeTotalDuration(segments, fallbackDuration = 0) {
  let maxEnd = 0;
  for (const s of segments) {
    const end = (Number(s.startTime) || 0) + (Number(s.duration) || 0);
    if (end > maxEnd) maxEnd = end;
  }
  return Math.max(0, maxEnd || Number(fallbackDuration) || 0);
}

function applySegmentsAtTime(svgRoot, segments, tSec) {
  for (const seg of segments) {
    const st = seg.startTime;
    const en = st + seg.duration;

    const from = seg.fromValue ?? "";
    const to = seg.toValue ?? "";

    if (tSec < st) {
      setSvgProperty(seg.element, seg.property, from);
      continue;
    }

    if (tSec >= en) {
      setSvgProperty(seg.element, seg.property, to);
      continue;
    }

    const progress = (tSec - st) / seg.duration;
    const eased = applyEasing(progress, seg.easing);

    const numWU = interpolateNumberWithUnit(from, to, eased);
    if (numWU !== null) {
      setSvgProperty(seg.element, seg.property, ensurePxIfLength(seg.property, numWU));
      continue;
    }

    const fromNum = parseFloat(from);
    const toNum = parseFloat(to);
    const fromIsNum = !Number.isNaN(fromNum) && String(from).trim() !== "";
    const toIsNum = !Number.isNaN(toNum) && String(to).trim() !== "";

    if (fromIsNum && toIsNum) {
      const v = fromNum + (toNum - fromNum) * eased;
      setSvgProperty(seg.element, seg.property, ensurePxIfLength(seg.property, String(v)));
      continue;
    }

    setSvgProperty(seg.element, seg.property, eased < 0.5 ? from : to);
  }
}

/* ======= Player creation ======= */
function createPlayerForPost(post) {
  const root = document.querySelector(`.post-video[data-post-id="${post.id}"]`);
  if (!root) return null;

  const stage = root.querySelector("[data-video-stage]");
  const timeEl = root.querySelector("[data-video-time]");
  const progressEl = root.querySelector("[data-video-progress-fill]");
  const playBtn = root.querySelector('[data-action="toggle-video"]');

  const svg = stage?.querySelector("svg");
  if (!svg) return null;

  const settings = parseSettings(post.animationSettings);
  applyPreviewSettings(svg, stage, settings);

  const fps = getFpsFromSettings(settings);
  const segs = normalizeSegmentsForPlayer(post.animationSegments, svg);

  const totalDuration = computeTotalDuration(segs, post.animationDuration);
  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));
  const frameMs = 1000 / fps;

  if (segs.length) applySegmentsAtTime(svg, segs, 0);

  const ctrl = {
    postId: post.id,
    root,
    playBtn,
    timeEl,
    progressEl,

    svg,
    segments: segs,
    fps,
    frameMs,
    totalDuration,
    totalFrames,

    isPlaying: false,
    rafId: null,
    currentFrame: 0,
    startTimeMs: 0,

    updateHud() {
      const t = this.currentFrame / this.fps;
      if (this.timeEl) {
        this.timeEl.textContent = `${formatTime(t)} / ${formatTime(this.totalDuration)}`;
      }
      if (this.progressEl) {
        const p = this.totalFrames > 0 ? (this.currentFrame / this.totalFrames) : 0;
        this.progressEl.style.width = `${Math.max(0, Math.min(100, p * 100))}%`;
      }
    },

    tick(now) {
      if (!this.isPlaying) return;

      const elapsed = now - this.startTimeMs;
      this.currentFrame = Math.floor(elapsed / this.frameMs);

      if (this.currentFrame >= this.totalFrames) {
        this.currentFrame = 0;
        this.startTimeMs = now;
      }

      const t = this.currentFrame / this.fps;
      applySegmentsAtTime(this.svg, this.segments, t);
      this.updateHud();

      this.rafId = requestAnimationFrame((n) => this.tick(n));
    },

    play() {
      if (!this.segments.length) return;
      if (this.isPlaying) return;

      pauseAllExcept(this.postId);

      this.isPlaying = true;
      this.root.classList.add("is-playing");

      this.startTimeMs = performance.now() - this.currentFrame * this.frameMs;
      this.rafId = requestAnimationFrame((n) => this.tick(n));
    },

    pause() {
      this.isPlaying = false;
      this.root.classList.remove("is-playing");
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.updateHud();
    },

    toggle() {
      if (this.isPlaying) this.pause();
      else this.play();
    },

    destroy(reset = false) {
      this.pause();
      if (reset) {
        this.currentFrame = 0;
        if (this.segments.length) applySegmentsAtTime(this.svg, this.segments, 0);
        this.updateHud();
      }
    },
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

function pauseAllExcept(postId) {
  for (const [id, ctrl] of players.entries()) {
    if (id !== postId) ctrl.pause();
  }
}

function stopAllPlayers(reset = false) {
  for (const ctrl of players.values()) {
    ctrl.destroy(reset);
  }
  players.clear();
}

function toggleVideo(postId) {
  const ctrl = players.get(postId);
  if (!ctrl) return;
  ctrl.toggle();
}

/* =========================
   Delete flow
========================= */
function requestDelete(postId) {
  const id = Number(postId);
  if (!Number.isFinite(id)) return;

  confirmModal.open({
    message: "Сигурен ли си, че искаш да изтриеш този пост? Това действие е необратимо.",
    onConfirm: async () => {
      // спираме плейъра ако е пуснат
      const ctrl = players.get(id);
      if (ctrl) {
        ctrl.destroy(true);
        players.delete(id);
      }

      const res = await deletePostRequest({ postId: id });
      if (!res || res.success !== true) {
        console.error("[posts] delete error:", res);
        alert(res?.error?.message || "Грешка при изтриване.");
        return;
      }

      // махаме от state
      state.posts = state.posts.filter((p) => p.id !== id);
      state.visiblePosts = state.visiblePosts.filter((p) => p.id !== id);
      state.postIds.delete(id);
      delete state.reactions[id];

      if (state.currentPostId === id) {
        state.currentPostId = state.posts.length ? state.posts[state.posts.length - 1].id : null;
      }

      applySearch();
    },
  });
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
    if (action === "noop") return;

    const postId = btn.dataset.postId ? parseInt(btn.dataset.postId, 10) : null;
    if (!postId) return;

    if (action === "like") toggleLike(postId);
    if (action === "dislike") toggleDislike(postId);
    if (action === "toggle-video") toggleVideo(postId);

    // ✅ delete
    if (action === "delete") requestDelete(postId);
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
  confirmModal.init();

  initParticles();
  initSearch();
  initEvents();
  initInfiniteScroll();

  await loadMorePosts();
});
