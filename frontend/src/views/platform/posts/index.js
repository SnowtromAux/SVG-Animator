import {
  getAllPostsRequest,
  likePostRequest,
  dislikePostRequest,
} from "/w25/day3_20260211_306/6MI0800241_8MI0800229_svganimator/frontend/src/services/posts.js";

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

  const anim = raw?.animation || raw?.post?.animation || null;

  const svgText = pickSvgFromApi(raw) || anim?.starting_svg || "";
  const svgPreview = sanitizeSvg(svgText);

  const animationSegments =
    (Array.isArray(anim?.animation_segments) && anim.animation_segments) ||
    (Array.isArray(anim?.segments) && anim.segments) ||
    [];

  const animationSettings =
    anim?.animation_settings ??
    anim?.settings ??
    null;

  return {
    id: Number(id),
    userName,
    userInitials: getInitials(userName),
    description: String(description || ""),
    createdAt,
    likes,
    dislikes,
    svgPreview,

    animationName: String(anim?.name || ""),
    animationSegments,
    animationSettings,
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

  reactions: {}, // UI state (counts + what user clicked)
  reactionPending: new Set(), // postId lock while request is running
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
  // важно: като правим innerHTML re-render, спираме всички "видеа" за да няма висящи RAF-и
  stopAllPlayers(true);

  const container = el("feedContainer");
  if (!container) return;

  const list = state.visiblePosts;
  setEmpty(list.length === 0 && !state.loading);

  container.innerHTML = list.map((post, idx) => renderPostCard(post, idx)).join("");

  // след re-render – инициализираме player-ите за видимите постове
  hydrateVideoPlayers();
}

/** Обновява само UI-то на реакциите за конкретен пост (без renderFeed()) */
function updateReactionUi(postId) {
  const r = state.reactions[postId];
  if (!r) return;

  const likeBtn = document.querySelector(`[data-action="like"][data-post-id="${postId}"]`);
  const dislikeBtn = document.querySelector(`[data-action="dislike"][data-post-id="${postId}"]`);

  if (likeBtn) {
    likeBtn.classList.toggle("liked", !!r.liked);
    const count = likeBtn.querySelector(".count");
    if (count) count.textContent = String(r.likes ?? 0);
  }

  if (dislikeBtn) {
    dislikeBtn.classList.toggle("disliked", !!r.disliked);
    const count = dislikeBtn.querySelector(".count");
    if (count) count.textContent = String(r.dislikes ?? 0);
  }

  // (по желание) докато чакаме заявка — можеш да disable-неш бутоните
  const pending = state.reactionPending.has(postId);
  if (likeBtn) likeBtn.disabled = pending;
  if (dislikeBtn) dislikeBtn.disabled = pending;
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
   Reactions (API)
========================= */
function applyReactionResponse(postId, payload) {
  const r = state.reactions[postId];
  if (!r || !payload) return;

  const reaction = payload.reaction; // "like" | "dislike" | null
  const likes = Number(payload.likes);
  const dislikes = Number(payload.dislikes);

  if (Number.isFinite(likes)) r.likes = likes;
  if (Number.isFinite(dislikes)) r.dislikes = dislikes;

  if (reaction === "like") {
    r.liked = true;
    r.disliked = false;
  } else if (reaction === "dislike") {
    r.liked = false;
    r.disliked = true;
  } else {
    // null
    r.liked = false;
    r.disliked = false;
  }
}

async function toggleLike(postId) {
  if (state.reactionPending.has(postId)) return;
  const r = state.reactions[postId];
  if (!r) return;

  state.reactionPending.add(postId);
  updateReactionUi(postId);

  try {
    const res = await likePostRequest({ postId });

    if (!res || res.success !== true) {
      console.error("[posts] like error:", res);
      return;
    }

    const data = res.data || res?.data?.data || res?.data; // safety, ако някъде е обвито
    applyReactionResponse(postId, data);
  } catch (e) {
    console.error("[posts] like exception:", e);
  } finally {
    state.reactionPending.delete(postId);
    updateReactionUi(postId);
  }
}

async function toggleDislike(postId) {
  if (state.reactionPending.has(postId)) return;
  const r = state.reactions[postId];
  if (!r) return;

  state.reactionPending.add(postId);
  updateReactionUi(postId);

  try {
    const res = await dislikePostRequest({ postId });

    if (!res || res.success !== true) {
      console.error("[posts] dislike error:", res);
      return;
    }

    const data = res.data || res?.data?.data || res?.data;
    applyReactionResponse(postId, data);
  } catch (e) {
    console.error("[posts] dislike exception:", e);
  } finally {
    state.reactionPending.delete(postId);
    updateReactionUi(postId);
  }
}

/* =========================
   Post "Video" Players
========================= */

const players = new Map(); // postId -> controller
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

/* ======= SVG value helpers (editor-like) ======= */
function ensurePxIfLength(propName, value) {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (!s) return "";

  if (propName !== "stroke-width" && propName !== "font-size") return s;

  // already has unit
  if (/^-?\d+(\.\d+)?[a-z%]+$/i.test(s)) return s;

  // pure number => px
  if (/^-?\d+(\.\d+)?$/.test(s)) return `${s}px`;

  return s;
}

function parseCssColorToHex(value) {
  if (!value) return "";
  const v = String(value).trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    const r = v[1], g = v[2], b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  const rgbMatch = v.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i
  );
  if (rgbMatch) {
    const r = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[1]))));
    const g = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[2]))));
    const b = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[3]))));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  // try named colors by browser normalization
  const test = document.createElement("span");
  test.style.color = "";
  test.style.color = v;
  if (test.style.color) {
    document.body.appendChild(test);
    const cs = getComputedStyle(test).color;
    test.remove();
    const m = cs.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i);
    if (m) {
      const rr = Math.max(0, Math.min(255, Math.round(parseFloat(m[1]))));
      const gg = Math.max(0, Math.min(255, Math.round(parseFloat(m[2]))));
      const bb = Math.max(0, Math.min(255, Math.round(parseFloat(m[3]))));
      return `#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;
    }
  }

  return "";
}

function resolvePaintUrlToHex(svgRoot, urlValue) {
  const m = String(urlValue || "").match(/^url\(\s*#([^)]+)\s*\)$/i);
  if (!m) return "";

  const id = m[1];
  let defsEl = null;
  try {
    defsEl = svgRoot.querySelector(`#${CSS.escape(id)}`);
  } catch {
    defsEl = null;
  }
  if (!defsEl) return "";

  const tag = defsEl.tagName ? defsEl.tagName.toLowerCase() : "";
  if (tag.includes("gradient")) {
    const stop = defsEl.querySelector("stop");
    const stopColor = stop?.getAttribute("stop-color") || stop?.style?.stopColor || "";
    const hex = parseCssColorToHex(stopColor);
    if (hex) return hex;
  }

  return "";
}

function setSvgProperty(element, property, value) {
  if (!element) return;
  const v = value == null ? "" : String(value);

  try {
    element.setAttribute(property, v);
  } catch {
    // ignore
  }

  const styleable = new Set(["opacity", "fill", "stroke", "stroke-width", "font-size"]);
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

  // 1) attribute
  let currentValue = element.getAttribute(propName);

  // 2) inline style via CSSStyleDeclaration
  if (!currentValue || String(currentValue).trim() === "") {
    const inline = element.style?.getPropertyValue?.(propName);
    if (inline && inline.trim()) currentValue = inline.trim();
  }

  // 2.5) raw style=""
  if (!currentValue || String(currentValue).trim() === "") {
    const raw = getStyleAttrValue(element, propName);
    if (raw) currentValue = raw;
  }

  // 3) computed style
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

  // 4) fallback defaults
  if (!currentValue || String(currentValue).trim() === "") {
    currentValue = getFallbackDefaultForProp(propName);
  }

  // resolve url(#id) paints
  if (typeof currentValue === "string" && currentValue.trim().startsWith("url(")) {
    const resolved = resolvePaintUrlToHex(svgRoot, currentValue.trim());
    if (resolved) currentValue = resolved;
  }

  // ensure px for length props
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

function interpolateColor(hex1, hex2, t) {
  const c1 = hex1.replace("#", "");
  const c2 = hex2.replace("#", "");

  const r1 = parseInt(c1.slice(0, 2), 16);
  const g1 = parseInt(c1.slice(2, 4), 16);
  const b1 = parseInt(c1.slice(4, 6), 16);

  const r2 = parseInt(c2.slice(0, 2), 16);
  const g2 = parseInt(c2.slice(2, 4), 16);
  const b2 = parseInt(c2.slice(4, 6), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
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

/* ======= UID mapping (като editor-а) ======= */
function isAnimatableNode(node) {
  if (!node || !node.tagName) return false;
  const tag = node.tagName.toLowerCase();

  // skip non-animatable/infrastructure tags
  if (
    tag === "svg" ||
    tag === "defs" ||
    tag === "style" ||
    tag === "script" ||
    tag === "title" ||
    tag === "desc" ||
    tag === "metadata" ||
    tag === "lineargradient" ||
    tag === "radialgradient" ||
    tag === "stop" ||
    tag === "clippath" ||
    tag === "mask" ||
    tag === "pattern" ||
    tag === "filter" ||
    tag === "symbol"
  ) return false;

  // skip filter primitives fe*
  if (tag.startsWith("fe")) return false;

  return true;
}

function buildUidMap(svgRoot) {
  const uidMap = new Map(); // uid -> element
  let uid = 0;

  const walk = (node) => {
    if (!node || !node.children) return;

    for (const ch of node.children) {
      if (!ch || !ch.tagName) continue;

      if (isAnimatableNode(ch)) {
        uid += 1;
        uidMap.set(uid, ch);
      }

      // important: always walk children, even if this node is not animatable
      walk(ch);
    }
  };

  walk(svgRoot);
  return uidMap;
}

/* ======= Settings (bg/viewBox) for preview ======= */
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

  // background
  if (stageEl) {
    if (settings.transparentBg) {
      stageEl.style.background = "transparent";
    } else {
      stageEl.style.background = settings.canvasBgColor || "#0a0a12";
    }
  }

  // viewBox override (ако useOriginalViewBox=false)
  if (!settings.useOriginalViewBox && settings.viewBox) {
    const vb = settings.viewBox;
    svgRoot.setAttribute("viewBox", `${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`);
  }

  // keepCentered controls preserveAspectRatio alignment
  svgRoot.setAttribute("preserveAspectRatio", settings.keepCentered ? "xMidYMid meet" : "xMinYMin meet");
}

/* ======= Segments normalize + chain fromValue ======= */
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
  const uidMap = buildUidMap(svgRoot);

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

    // 1) selector
    if (seg.element_selector && typeof seg.element_selector === "string") {
      try {
        targetEl = svgRoot.querySelector(seg.element_selector);
      } catch {
        targetEl = null;
      }
    }

    // 2) uid mapping (element_id from backend)
    if (!targetEl) {
      const uid = Number(seg.element_id ?? seg.element_uid);
      if (Number.isFinite(uid) && uidMap.has(uid)) {
        targetEl = uidMap.get(uid);
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
      fromValue: "", // will be filled
    });
  }

  // chain fromValue per element+property by start order (без toString collisions)
  const byEl = new Map(); // element -> Map(prop -> seg[])
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

function computeTotalDuration(segments) {
  let maxEnd = 0;
  for (const s of segments) {
    const end = (Number(s.startTime) || 0) + (Number(s.duration) || 0);
    if (end > maxEnd) maxEnd = end;
  }
  return Math.max(0, maxEnd);
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

    // 1) number with unit
    const numWU = interpolateNumberWithUnit(from, to, eased);
    if (numWU !== null) {
      setSvgProperty(seg.element, seg.property, ensurePxIfLength(seg.property, numWU));
      continue;
    }

    // 2) plain numeric
    const fromNum = parseFloat(from);
    const toNum = parseFloat(to);
    const fromIsNum = !Number.isNaN(fromNum) && String(from).trim() !== "";
    const toIsNum = !Number.isNaN(toNum) && String(to).trim() !== "";

    if (fromIsNum && toIsNum) {
      const v = fromNum + (toNum - fromNum) * eased;
      setSvgProperty(seg.element, seg.property, ensurePxIfLength(seg.property, String(v)));
      continue;
    }

    // 3) colors (+ url(#grad) resolve)
    const fromHex = parseCssColorToHex(from) || resolvePaintUrlToHex(svgRoot, from) || "";
    const toHex = parseCssColorToHex(to) || resolvePaintUrlToHex(svgRoot, to) || "";

    if (fromHex && toHex) {
      setSvgProperty(seg.element, seg.property, interpolateColor(fromHex, toHex, eased));
      continue;
    }

    // 4) fallback (step)
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
  const totalDuration = computeTotalDuration(segs);
  const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));
  const frameMs = 1000 / fps;

  // set initial frame
  applySegmentsAtTime(svg, segs, 0);

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

      // stop others
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
        applySegmentsAtTime(this.svg, this.segments, 0);
        this.updateHud();
      }
    },
  };

  ctrl.updateHud();
  return ctrl;
}

function hydrateVideoPlayers() {
  const visibleIds = new Set(state.visiblePosts.map((p) => p.id));

  // махаме контролери за постове, които вече не са рендернати
  for (const [postId, ctrl] of players.entries()) {
    if (!visibleIds.has(postId)) {
      ctrl.destroy(false);
      players.delete(postId);
    }
  }

  for (const post of state.visiblePosts) {
    if (!post.svgPreview) continue;

    // ако вече има контролер – махаме го (DOM се е сменил)
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

    if (action === "like") void toggleLike(postId);
    if (action === "dislike") void toggleDislike(postId);
    if (action === "toggle-video") toggleVideo(postId);
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
