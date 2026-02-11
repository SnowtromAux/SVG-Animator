import {
  getAllAnimationsRequest,
  deleteAnimationRequest,
} from "/svganimator/frontend/src/services/animations.js";

import { createPostRequest } from "/svganimator/frontend/src/services/posts.js";

/* =========================
   Inline InfoModal
========================= */
function initInfoModal() {
  const overlay = document.getElementById("infoModalOverlay");
  const closeBtn = document.getElementById("infoModalClose");
  const titleEl = document.getElementById("infoModalTitle");
  const bodyEl = document.getElementById("infoModalBody");

  if (!overlay || !closeBtn || !titleEl || !bodyEl) {
    console.warn("[InfoModal] Missing DOM nodes (inline).");
    return;
  }

  const escapeHtml = (str) => {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  const open = ({ title = "Информация", items = [] } = {}) => {
    titleEl.textContent = title;

    bodyEl.innerHTML = (items || [])
      .map(
        (item) => `
        <div class="info-item">
          <span class="info-label">${escapeHtml(item?.name ?? "")}</span>
          <span class="info-value">${escapeHtml(item?.value ?? "")}</span>
        </div>
      `
      )
      .join("");

    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  };

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) close();
  });

  window.InfoModal = { open, close };
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
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      cleanupResolve(false);
    }
  });

  window.ConfirmationModal = { open, close };
}

/* =========================
   Inline ShareModal
========================= */
function initShareModal() {
  const overlay = document.getElementById("shareModalOverlay");
  const closeBtn = document.getElementById("shareModalClose");
  const titleEl = document.getElementById("shareModalTitle");
  const textarea = document.getElementById("shareDescription");
  const submitBtn = document.getElementById("shareModalSubmit");

  if (!overlay || !closeBtn || !titleEl || !textarea || !submitBtn) {
    console.warn("[ShareModal] Missing DOM nodes (inline).");
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

  const open = ({ title = "Сподели", placeholder = "" } = {}) => {
    titleEl.textContent = title;
    textarea.value = "";
    if (placeholder) textarea.placeholder = placeholder;

    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    // фокус в textarea
    setTimeout(() => textarea.focus(), 0);

    return new Promise((resolve) => {
      resolver = resolve;
    });
  };

  const close = () => cleanupResolve({ ok: false, description: "" });

  closeBtn.addEventListener("click", close);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) close();
  });

  submitBtn.addEventListener("click", () => {
    const description = String(textarea.value || "").trim();
    cleanupResolve({ ok: true, description });
  });

  window.ShareModal = { open, close };
}

/* =========================
   Helpers
========================= */
function formatSeconds(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n - Math.round(n)) < 1e-9) return `${Math.round(n)}s`;
  return `${n.toFixed(1)}s`;
}

function formatDateBg(createdAt) {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("bg-BG", { year: "numeric", month: "long", day: "numeric" });
}

function safeJsonParse(str) {
  if (!str || typeof str !== "string") return null;
  try { return JSON.parse(str); } catch { return null; }
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

function extractDimensionsFromSvg(svgText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return null;

    const wAttr = svg.getAttribute("width");
    const hAttr = svg.getAttribute("height");
    const vb = svg.getAttribute("viewBox");

    const parseDim = (v) => {
      if (!v) return null;
      const n = parseFloat(String(v).replace("px", "").trim());
      return Number.isFinite(n) ? n : null;
    };

    const w = parseDim(wAttr);
    const h = parseDim(hAttr);
    if (w && h) return { w, h };

    if (vb) {
      const parts = vb.split(/[,\s]+/).map((x) => parseFloat(x)).filter((x) => Number.isFinite(x));
      if (parts.length === 4) return { w: parts[2], h: parts[3] };
    }
    return null;
  } catch {
    return null;
  }
}

function estimateSvgSizeKb(svgText) {
  const bytes = new Blob([String(svgText || "")]).size;
  return Math.max(1, Math.round(bytes / 1024));
}

function pickFromSettings(settings, keys) {
  if (!settings || typeof settings !== "object") return null;
  for (const k of keys) {
    if (k in settings && settings[k] != null && settings[k] !== "") return settings[k];
  }
  return null;
}

function mapApiAnimationToProject(item) {
  const anim = item?.animation || {};
  const segments = Array.isArray(item?.animation_segments) ? item.animation_segments : [];
  const settings = safeJsonParse(anim.animation_settings) || {};

  const fps = Number(pickFromSettings(settings, ["fps"])) || 60;
  const durationSec = Number(anim.duration);

  const startingSvg = String(anim.starting_svg || "");
  const svgPreview = sanitizeSvg(startingSvg);

  const wSetting = Number(pickFromSettings(settings, ["width", "w", "canvasWidth", "exportWidth"]));
  const hSetting = Number(pickFromSettings(settings, ["height", "h", "canvasHeight", "exportHeight"]));
  let dims = (Number.isFinite(wSetting) && Number.isFinite(hSetting)) ? { w: wSetting, h: hSetting } : null;
  if (!dims) dims = extractDimensionsFromSvg(startingSvg);

  const sizeBytes = Number(pickFromSettings(settings, ["fileSizeBytes", "file_size_bytes", "bytes"]));
  const sizeKbSetting = Number(pickFromSettings(settings, ["fileSizeKb", "file_size_kb", "size_kb"]));
  let sizeKb = null;
  if (Number.isFinite(sizeKbSetting) && sizeKbSetting > 0) sizeKb = Math.round(sizeKbSetting);
  else if (Number.isFinite(sizeBytes) && sizeBytes > 0) sizeKb = Math.max(1, Math.round(sizeBytes / 1024));
  else sizeKb = estimateSvgSizeKb(startingSvg);

  return {
    id: anim.id,
    name: anim.name || "Без име",
    createdAt: anim.created_at,
    fps,
    durationSec,
    svgPreview,
    dims,
    sizeKb,
    segmentsCount: segments.length,
  };
}

/* =========================
   Dashboard
========================= */
class ProjectsDashboard {
  constructor() {
    this.projects = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.searchText = "";
    this.searchTimer = null;

    // ✅ важно: bind за pageshow handler
    this.onPageShow = this.onPageShow.bind(this);

    this.init();
  }

  async init() {
    this.cacheElements();
    this.bindEvents();

    // ✅ При първоначално зареждане
    await this.loadProjects({ page: 1, searchText: "" });

    // ✅ Ако се върнеш назад (bfcache), pageshow ще се викне
    window.addEventListener("pageshow", this.onPageShow);

    this.initParticles();
  }

  // ✅ Това оправя проблема (Back/Forward cache)
  async onPageShow(event) {
    const navEntry = performance.getEntriesByType?.("navigation")?.[0];
    const isBackForward = event?.persisted === true || navEntry?.type === "back_forward";
    if (!isBackForward) return;

    await this.loadProjects({ page: this.currentPage || 1, searchText: this.searchText || "" });
  }

  cacheElements() {
    this.projectsGrid = document.getElementById("projectsGrid");
    this.emptyState = document.getElementById("emptyState");
    this.pagination = document.getElementById("pagination");
    this.paginationNumbers = document.getElementById("paginationNumbers");
    this.prevPageBtn = document.getElementById("prevPage");
    this.nextPageBtn = document.getElementById("nextPage");
    this.searchInput = document.getElementById("searchInput");
    this.createNewBtn = document.getElementById("createNewBtn");
  }

  bindEvents() {
    this.searchInput.addEventListener("input", (e) => {
      const value = String(e.target.value || "");
      this.handleSearch(value);
    });

    this.prevPageBtn.addEventListener("click", async () => {
      if (this.currentPage > 1) {
        await this.loadProjects({ page: this.currentPage - 1, searchText: this.searchText });
      }
    });

    this.nextPageBtn.addEventListener("click", async () => {
      if (this.currentPage < this.totalPages) {
        await this.loadProjects({ page: this.currentPage + 1, searchText: this.searchText });
      }
    });

    this.createNewBtn.addEventListener("click", () => {
      window.location.href = "/svganimator/frontend/platform/editor";
    });
  }

  handleSearch(query) {
    const q = query.trim();
    this.searchText = q;

    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(async () => {
      await this.loadProjects({ page: 1, searchText: this.searchText });
    }, 250);
  }

  async loadProjects({ page = 1, searchText = "" } = {}) {
    this.setLoading(true);

    const res = await getAllAnimationsRequest({ page, searchText });

    this.setLoading(false);

    if (!res || res.success !== true) {
      console.error("[my-projects] load error:", res);

      this.projects = [];
      this.currentPage = page;
      this.totalPages = 1;

      this.renderProjects();
      this.renderPagination();

      this.emptyState.style.display = "flex";
      this.pagination.style.display = "none";
      return;
    }

    const animations = Array.isArray(res.animations) ? res.animations : [];
    this.projects = animations.map(mapApiAnimationToProject);

    this.currentPage = Number(page) || 1;
    this.totalPages = Number(res.numOfPages) || 1;

    this.renderProjects();
    this.renderPagination();
  }

  setLoading(isLoading) {
    if (this.prevPageBtn) this.prevPageBtn.disabled = isLoading || this.currentPage <= 1;
    if (this.nextPageBtn) this.nextPageBtn.disabled = isLoading || this.currentPage >= this.totalPages;
    if (this.searchInput) this.searchInput.disabled = !!isLoading;
    if (this.createNewBtn) this.createNewBtn.disabled = !!isLoading;

    // disable action buttons inside cards (ако има ги)
    if (this.projectsGrid) {
      this.projectsGrid.querySelectorAll("button").forEach((b) => {
        // не пипаме pagination / header — само вътре в grid
        b.disabled = !!isLoading;
      });
    }
  }

  renderProjects() {
    if (!this.projects || this.projects.length === 0) {
      this.projectsGrid.innerHTML = "";
      this.emptyState.style.display = "flex";
      this.pagination.style.display = "none";
      return;
    }

    this.emptyState.style.display = "none";
    this.pagination.style.display = "flex";

    this.projectsGrid.innerHTML = this.projects
      .map((project, index) => {
        const durationLabel = formatSeconds(project.durationSec);
        const fpsLabel = `${project.fps} FPS`;

        const imageHtml = project.svgPreview
          ? `<div class="card-svg-preview" aria-label="SVG preview">${project.svgPreview}</div>`
          : `<div class="card-image-placeholder">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                <path d="M16 24L22 18L28 24L36 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="18" cy="18" r="2" fill="currentColor"/>
              </svg>
            </div>`;

        return `
          <div class="project-card" data-id="${project.id}" style="animation-delay: ${index * 0.1}s">
            <div class="card-image">
              ${imageHtml}
              <div class="card-stats-overlay">
                <div class="stat-badge">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M7 4V7.5L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  <span>${durationLabel}</span>
                </div>
                <div class="stat-badge">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 10V11.5C2 12.3284 2.67157 13 3.5 13H10.5C11.3284 13 12 12.3284 12 11.5V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M7 1V9M7 9L4 6M7 9L10 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>${fpsLabel}</span>
                </div>
              </div>
            </div>

            <div class="card-content">
              <div class="card-header">
                <h3 class="card-title">${project.name}</h3>
                <button class="card-info-btn" data-id="${project.id}" aria-label="Информация">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M10 9V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="10" cy="6.5" r="0.75" fill="currentColor"/>
                  </svg>
                </button>
              </div>

              <p class="card-date">Създаден: ${formatDateBg(project.createdAt)}</p>

              <!-- ✅ 3 бутона, винаги заедно -->
              <div class="card-actions">
                <button class="btn-card btn-card-danger btn-card-icon" data-action="delete" data-id="${project.id}" aria-label="Изтрий">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M7.5 2.5h5M3.75 5h12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M6.25 5l.6 11.2c.05.95.83 1.7 1.78 1.7h2.74c.95 0 1.73-.75 1.78-1.7L13.75 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                    <path d="M8.75 8.2v6.2M11.25 8.2v6.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  </svg>
                </button>

                <button class="btn-card btn-card-edit btn-card-icon" data-action="edit" data-id="${project.id}" aria-label="Редактирай">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M12.9 3.4l3.7 3.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M4 16h3.5l9.4-9.4a1.4 1.4 0 0 0 0-2L15.4 3a1.4 1.4 0 0 0-2 0L4 12.5V16z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                  </svg>
                </button>

                <button class="btn-card btn-card-share btn-card-icon" data-action="share" data-id="${project.id}" aria-label="Сподели">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M12.5 6.667L16.667 3.333" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M16.667 3.333v4.167h-4.167" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16.25 10.833V15c0 .92-.746 1.667-1.667 1.667H5.417A1.667 1.667 0 0 1 3.75 15V5.833c0-.92.746-1.666 1.667-1.666H9.583" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                    <path d="M8.333 11.667L16.667 3.333" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    this.projectsGrid.querySelectorAll(".card-info-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const projectId = parseInt(btn.dataset.id, 10);
        this.openInfo(projectId);
      });
    });

    this.projectsGrid.querySelectorAll(".btn-card[data-action]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const projectId = parseInt(btn.dataset.id, 10);
        const action = btn.dataset.action;

        if (action === "edit") {
          window.location.href = `/svganimator/frontend/platform/editor?animation_id=${encodeURIComponent(projectId)}`;
          return;
        }

        if (action === "delete") {
          await this.deleteWithConfirmation(projectId);
          return;
        }

        if (action === "share") {
          await this.shareProject(projectId);
          return;
        }
      });
    });

    this.projectsGrid.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("click", () => {
        const projectId = parseInt(card.dataset.id, 10);
        window.location.href = `/svganimator/frontend/platform/editor?animation_id=${encodeURIComponent(projectId)}`;
      });
    });
  }

  renderPagination() {
    const totalPages = Math.max(1, Number(this.totalPages) || 1);
    const current = Math.min(Math.max(1, Number(this.currentPage) || 1), totalPages);

    this.prevPageBtn.disabled = current === 1;
    this.nextPageBtn.disabled = current === totalPages;

    let html = "";
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
        html += `<button class="page-number ${i === current ? "active" : ""}" data-page="${i}">${i}</button>`;
      } else if (i === current - 2 || i === current + 2) {
        html += `<span class="page-number" style="pointer-events:none;">...</span>`;
      }
    }

    this.paginationNumbers.innerHTML = html;

    this.paginationNumbers.querySelectorAll(".page-number[data-page]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const page = parseInt(btn.dataset.page, 10);
        await this.loadProjects({ page, searchText: this.searchText });
      });
    });
  }

  openInfo(projectId) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    const dimsText = project.dims ? `${Math.round(project.dims.w)}x${Math.round(project.dims.h)}` : "—";
    const sizeText = project.sizeKb ? `${project.sizeKb} KB` : "—";

    window.InfoModal?.open?.({
      title: project.name,
      items: [
        { name: "Формат", value: "SVG" },
        { name: "Размер", value: dimsText },
        { name: "Файлов размер", value: sizeText },
        { name: "FPS", value: String(project.fps) },
        { name: "Секунди", value: formatSeconds(project.durationSec) },
      ],
    });
  }

  async deleteWithConfirmation(projectId) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    let ok = false;

    if (!window.ConfirmationModal?.open) {
      ok = window.confirm(`Сигурен ли си, че искаш да изтриеш "${project.name}"?`);
    } else {
      ok = await window.ConfirmationModal.open({
        title: "Потвърждение",
        message: `Сигурен ли си, че искаш да изтриеш "${project.name}"?`,
        confirmText: "Изтрий",
        cancelText: "Откажи",
      });
    }

    if (!ok) return;
    await this.deleteProject(projectId);
  }

  async deleteProject(projectId) {
    this.setLoading(true);
    const res = await deleteAnimationRequest({ animationId: projectId });
    this.setLoading(false);

    if (!res || res.success !== true) {
      console.error("[my-projects] delete error:", res);
      alert(res?.error?.message || "Грешка при изтриване на анимацията.");
      return;
    }

    const current = this.currentPage;
    const q = this.searchText;

    await this.loadProjects({ page: current, searchText: q });

    if ((this.projects?.length ?? 0) === 0 && current > 1) {
      await this.loadProjects({ page: current - 1, searchText: q });
    }
  }

  async shareProject(projectId) {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) return;

    if (!window.ShareModal?.open) {
      alert("ShareModal не е инициализиран.");
      return;
    }

    const result = await window.ShareModal.open({
      title: `Сподели: ${project.name}`,
      placeholder: "Напиши описание...",
    });

    if (!result?.ok) return;

    const description = String(result.description || "").trim();
    if (!description) {
      window.InfoModal?.open?.({
        title: "Липсва описание",
        items: [{ name: "Съобщение", value: "Моля, добави описание преди да споделиш." }],
      });
      return;
    }

    this.setLoading(true);

    const res = await createPostRequest({
      animationId: projectId,
      description,
    });

    this.setLoading(false);

    if (!res || res.success !== true) {
      console.error("[my-projects] share error:", res);
      window.InfoModal?.open?.({
        title: "Грешка",
        items: [{ name: "Съобщение", value: res?.error?.message || "Грешка при споделяне." }],
      });
      return;
    }

    window.InfoModal?.open?.({
      title: "Успешно!",
      items: [{ name: "Съобщение", value: "Проектът беше споделен успешно." }],
    });
  }

  initParticles() {
    const canvas = document.getElementById("particleCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let particles = [];
    let mouseX = 0;
    let mouseY = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      const numberOfParticles = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          p.x -= dx * 0.01;
          p.y -= dy * 0.01;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
        ctx.fill();

        particles.slice(i + 1).forEach((o) => {
          const dx2 = p.x - o.x;
          const dy2 = p.y - o.y;
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (d2 < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(o.x, o.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - d2 / 120)})`;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(drawParticles);
    };

    resize();
    createParticles();
    drawParticles();

    window.addEventListener("resize", () => {
      resize();
      createParticles();
    });

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initInfoModal();
  initConfirmationModal();
  initShareModal();
  new ProjectsDashboard();
});
