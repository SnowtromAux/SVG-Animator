import { ANIMATION_PROPERTIES } from '../../../constants/animation-properties.js';
import { DEFAULT_FPS, PX_PER_SECOND, MAX_SECONDS } from '../../../constants/default-settings.js';
import { isAnimatableNode } from '../../../utils/svg-animatable.js';

import {
  getAnimationRequest,
  createAnimationRequest,
  saveAnimationRequest
} from '../../../services/animations.js';

class SvgAnimatorEditor {
  constructor() {
    this.state = {
      svgContent: null,
      elements: [],
      selectedElement: null,

      steps: [],
      currentStepIndex: -1,
      editingStepIndex: null,

      isPlaying: false,
      isEditorLocked: false,

      currentFrame: 0,
      totalFrames: 0,

      zoom: 100,
      hasUnsavedChanges: false,

      animationId: null,
      stepCounter: 0,
      elementCounter: 0,

      drag: {
        active: false,
        stepIndex: null,
        startPointerX: 0,
        startLeftPx: 0,
        startScrollLeft: 0
      },

      settings: {
        fps: DEFAULT_FPS,
        useOriginalViewBox: true,
        viewBox: { minX: 0, minY: 0, width: 800, height: 600 },
        originalViewBox: null,
        keepCentered: true,
        canvasBgColor: '#0a0a12',
        transparentBg: false
      },

      // Grouped steps for correct playback and for avoiding “reset” conflicts
      stepGroups: new Map(),
      stepGroupsDirty: true,

      // RAF
      rafId: null
    };

    this.DOM = {};
    this._isSyncingTimelineScroll = false;

    // binds
    this.handleFileUpload = this.handleFileUpload.bind(this);
    this.refreshElementsTree = this.refreshElementsTree.bind(this);
    this.handleSave = this.handleSave.bind(this);

    this.setZoom = this.setZoom.bind(this);
    this.togglePlayback = this.togglePlayback.bind(this);
    this.seekToFrame = this.seekToFrame.bind(this);

    this.navigateStep = this.navigateStep.bind(this);

    this.handleElementSelect = this.handleElementSelect.bind(this);
    this.handleAnimationTypeSelect = this.handleAnimationTypeSelect.bind(this);
    this.addOrUpdateAnimationStep = this.addOrUpdateAnimationStep.bind(this);

    this.openSettingsModal = this.openSettingsModal.bind(this);
    this.applySettings = this.applySettings.bind(this);
    this.resetSettings = this.resetSettings.bind(this);

    this.handleUrlImport = this.handleUrlImport.bind(this);
    this.handleCodeImport = this.handleCodeImport.bind(this);

    this.handleKeydown = this.handleKeydown.bind(this);

    this.handleExportVideo = this.handleExportVideo.bind(this);
    this.handleExportFrames = this.handleExportFrames.bind(this);

    this.onTimelinePointerDown = this.onTimelinePointerDown.bind(this);
    this.onTimelinePointerMove = this.onTimelinePointerMove.bind(this);
    this.onTimelinePointerUp = this.onTimelinePointerUp.bind(this);
  }

  init() {
    this.cacheDOMElements();
    this.setupEventListeners();
    this.generateTimelineRuler();
    this.applyCanvasBackground();
    this.updateFpsDisplay();
    this.initToasts();

    // remove elastic/expo/back options from easing dropdown
    this.pruneUnsupportedEasings();

    // expose step actions (existing HTML uses onclick)
    window.editStep = (index) => this.editStep(index);
    window.deleteStep = (index) => this.deleteStep(index);

    // load by URL param if exists
    const urlAnimId = this.getAnimationIdFromUrl();
    if (urlAnimId) {
      this.state.animationId = urlAnimId;
      this.loadAnimationById(urlAnimId);
    }
  }

  // ===========================
  // URL helpers
  // ===========================
  getAnimationIdFromUrl() {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('animation_id');
    return id ? Number(id) : null;
  }

  setAnimationIdToUrl(id) {
    const url = new URL(window.location.href);
    url.searchParams.set('animation_id', String(id));
    window.history.replaceState({}, '', url.toString());
  }

  // ===========================
  // Toasts
  // ===========================
  initToasts() {
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast-container{
          position: fixed;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
        }
        .toast{
          pointer-events: auto;
          min-width: 280px;
          max-width: 560px;
          padding: 10px 12px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,.35);
          backdrop-filter: blur(8px);
          font-size: 13px;
          line-height: 1.35;
          display:flex;
          align-items:flex-start;
          gap:10px;
          opacity: 0;
          transform: translateY(-8px);
          transition: opacity .18s ease, transform .18s ease;
        }
        .toast.show{ opacity: 1; transform: translateY(0); }
        .toast .toast-dot{ width:10px;height:10px;border-radius:50%;margin-top:4px;flex:0 0 10px; }
        .toast.success{
          background: rgba(18, 36, 22, .92);
          border: 1px solid rgba(52, 211, 153, .35);
          color: rgba(236, 253, 245, 0.95);
        }
        .toast.success .toast-dot{ background: rgba(52, 211, 153, .95); }
        .toast.error{
          background: rgba(40, 18, 18, .92);
          border: 1px solid rgba(248, 113, 113, .35);
          color: rgba(254, 242, 242, 0.95);
        }
        .toast.error .toast-dot{ background: rgba(248, 113, 113, .95); }
      `;
      document.head.appendChild(style);
    }

    if (!this.DOM.toastContainer) {
      const container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
      this.DOM.toastContainer = container;
    }
  }

  showToast(type, message, { timeout = 2600 } = {}) {
    this.initToasts();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-dot"></span>
      <div class="toast-msg">${String(message)}</div>
    `;
    this.DOM.toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    window.setTimeout(() => {
      el.classList.remove('show');
      window.setTimeout(() => el.remove(), 220);
    }, timeout);
  }

  // ===========================
  // DOM cache
  // ===========================
  cacheDOMElements() {
    const d = document;

    // Top bar
    this.DOM.projectName = d.getElementById('projectName');
    this.DOM.saveBtn = d.getElementById('saveBtn');
    this.DOM.settingsBtn = d.getElementById('settingsBtn');
    this.DOM.exportBtn = d.getElementById('exportBtn');

    // Elements panel
    this.DOM.elementsTree = d.getElementById('elementsTree');
    this.DOM.uploadSvgBtn = d.getElementById('uploadSvgBtn');
    this.DOM.svgFileInput = d.getElementById('svgFileInput');

    // Canvas
    this.DOM.canvasContainer = d.getElementById('canvasContainer');
    this.DOM.canvasPlaceholder = d.getElementById('canvasPlaceholder');
    this.DOM.mainCanvas = d.getElementById('mainCanvas');
    this.DOM.zoomIn = d.getElementById('zoomIn');
    this.DOM.zoomOut = d.getElementById('zoomOut');
    this.DOM.zoomLevel = d.getElementById('zoomLevel');
    this.DOM.resetView = d.getElementById('resetView');

    // Timeline
    this.DOM.timelineRuler = d.getElementById('timelineRuler');
    this.DOM.timelineTracks = d.getElementById('timelineTracks');
    this.DOM.playhead = d.getElementById('playhead');
    this.DOM.playPause = d.getElementById('playPause');
    this.DOM.skipStart = d.getElementById('skipStart');
    this.DOM.skipEnd = d.getElementById('skipEnd');
    this.DOM.prevFrame = d.getElementById('prevFrame');
    this.DOM.nextFrame = d.getElementById('nextFrame');
    this.DOM.currentTime = d.getElementById('currentTime');
    this.DOM.totalTime = d.getElementById('totalTime');
    this.DOM.timelineFps = d.querySelector('.timeline-fps');

    // Steps panel
    this.DOM.stepsList = d.getElementById('stepsList');
    this.DOM.stepIndicator = d.getElementById('stepIndicator');
    this.DOM.prevStep = d.getElementById('prevStep');
    this.DOM.nextStep = d.getElementById('nextStep');

    // Add panel
    this.DOM.targetElement = d.getElementById('targetElement');
    this.DOM.animationType = d.getElementById('animationType');
    this.DOM.animationValues = d.getElementById('animationValues');
    this.DOM.valueInputs = d.getElementById('valueInputs');
    this.DOM.animationStartTime = d.getElementById('animationStartTime');
    this.DOM.animationDuration = d.getElementById('animationDuration');
    this.DOM.animationEasing = d.getElementById('animationEasing');
    this.DOM.addAnimationBtn = d.getElementById('addAnimationBtn');

    // Modals
    this.DOM.unsavedModal = d.getElementById('unsavedModal');
    this.DOM.discardBtn = d.getElementById('discardBtn');
    this.DOM.saveAndCloseBtn = d.getElementById('saveAndCloseBtn');

    // Import modals
    this.DOM.importUrlBtn = d.getElementById('importUrlBtn');
    this.DOM.importCodeBtn = d.getElementById('importCodeBtn');
    this.DOM.importUrlModal = d.getElementById('importUrlModal');
    this.DOM.importCodeModal = d.getElementById('importCodeModal');
    this.DOM.svgUrlInput = d.getElementById('svgUrlInput');
    this.DOM.svgCodeInput = d.getElementById('svgCodeInput');
    this.DOM.closeUrlModal = d.getElementById('closeUrlModal');
    this.DOM.closeCodeModal = d.getElementById('closeCodeModal');
    this.DOM.cancelUrlImport = d.getElementById('cancelUrlImport');
    this.DOM.cancelCodeImport = d.getElementById('cancelCodeImport');
    this.DOM.confirmUrlImport = d.getElementById('confirmUrlImport');
    this.DOM.confirmCodeImport = d.getElementById('confirmCodeImport');

    // Settings modal
    this.DOM.settingsModal = d.getElementById('settingsModal');
    this.DOM.closeSettingsModal = d.getElementById('closeSettingsModal');
    this.DOM.fpsOptions = d.querySelectorAll('.fps-option');
    this.DOM.customFps = d.getElementById('customFps');
    this.DOM.useOriginalViewBox = d.getElementById('useOriginalViewBox');
    this.DOM.viewboxInputs = d.getElementById('viewboxInputs');
    this.DOM.viewboxMinX = d.getElementById('viewboxMinX');
    this.DOM.viewboxMinY = d.getElementById('viewboxMinY');
    this.DOM.viewboxWidth = d.getElementById('viewboxWidth');
    this.DOM.viewboxHeight = d.getElementById('viewboxHeight');
    this.DOM.keepCentered = d.getElementById('keepCentered');
    this.DOM.canvasBgColor = d.getElementById('canvasBgColor');
    this.DOM.canvasBgColorText = d.getElementById('canvasBgColorText');
    this.DOM.transparentBgBtn = d.getElementById('transparentBgBtn');
    this.DOM.resetSettingsBtn = d.getElementById('resetSettingsBtn');
    this.DOM.applySettingsBtn = d.getElementById('applySettingsBtn');

    // Timeline resize
    this.DOM.timelineWrapper = d.getElementById('timelineWrapper');
    this.DOM.timelineSection = d.getElementById('timelineSection');
    this.DOM.timelineResizeHandle = d.getElementById('timelineResizeHandle');
    this.DOM.timelineLabels = d.getElementById('timelineLabels');
    this.DOM.timelineTracksArea = d.getElementById('timelineTracksArea');

    // Export modal
    this.DOM.exportModal = d.getElementById('exportModal');
    this.DOM.closeExportModal = d.getElementById('closeExportModal');
    this.DOM.exportVideoBtn = d.getElementById('exportVideoBtn');
    this.DOM.exportFramesBtn = d.getElementById('exportFramesBtn');
    this.DOM.exportProgress = d.getElementById('exportProgress');
    this.DOM.exportProgressFill = d.getElementById('exportProgressFill');
    this.DOM.exportProgressText = d.getElementById('exportProgressText');
  }

  // ===========================
  // General helpers
  // ===========================
  clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  safeParseJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  showModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('show');
    modalEl.style.display = 'block';
  }

  hideModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
  }

  markAsChanged() {
    this.state.hasUnsavedChanges = true;
  }

  // ===========================
  // Remove unsupported easings (elastic/expo/back)
  // ===========================
  pruneUnsupportedEasings() {
    const select = this.DOM.animationEasing;
    if (!select) return;

    const UNSUPPORTED = new Set([
      'elastic',
      'expo',
      'back',
      'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      'cubic-bezier(0.6, 0.04, 0.98, 0.335)'
    ]);

    const options = Array.from(select.options || []);
    let removedSelected = false;

    for (const opt of options) {
      const v = String(opt.value || '').trim();
      if (UNSUPPORTED.has(v)) {
        if (opt.selected) removedSelected = true;
        opt.remove();
      }
    }

    if (removedSelected) select.value = 'ease-in-out';
  }

  sanitizeEasing(easing) {
    const unsupportedLegacy = new Set([
      'elastic',
      'expo',
      'back',
      'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      'cubic-bezier(0.6, 0.04, 0.98, 0.335)'
    ]);
    if (!easing) return 'linear';
    if (unsupportedLegacy.has(easing)) return 'ease-in-out';
    return easing;
  }

  // ===========================
  // Length units: stroke-width & font-size MUST be px
  // ===========================
  isLengthProp(prop) {
    return prop === 'stroke-width' || prop === 'font-size';
  }

  parseNumberWithUnit(v) {
    const s = String(v ?? '').trim();
    const m = s.match(/^(-?\d+(\.\d+)?)([a-z%]*)$/i);
    if (!m) return null;
    return { num: parseFloat(m[1]), unit: m[3] || '' };
  }

  ensurePxIfLength(prop, value) {
    if (!this.isLengthProp(prop)) return String(value);
    const p = this.parseNumberWithUnit(value);
    if (!p) return String(value);
    return `${p.num}px`;
  }

  normalizeToValueWithFromUnit(prop, from, to) {
    if (this.isLengthProp(prop)) {
      const b = this.parseNumberWithUnit(to);
      if (!b) return String(to);
      return `${b.num}px`;
    }

    const a = this.parseNumberWithUnit(from);
    const b = this.parseNumberWithUnit(to);
    if (!a || !b) return String(to);

    if (a.unit && !b.unit) return `${b.num}${a.unit}`;
    return String(to);
  }

  interpolateNumberWithUnit(prop, from, to, progress) {
    if (this.isLengthProp(prop)) {
      const a = this.parseNumberWithUnit(from);
      const b = this.parseNumberWithUnit(to);
      if (!a || !b) return null;
      const value = a.num + (b.num - a.num) * progress;
      return `${value}px`;
    }

    const a = this.parseNumberWithUnit(from);
    const b = this.parseNumberWithUnit(to);
    if (!a || !b) return null;
    if (a.unit !== b.unit) return null;

    const value = a.num + (b.num - a.num) * progress;
    return `${value}${a.unit}`;
  }

  // ===========================
  // Event listeners
  // ===========================
  setupEventListeners() {
    // File upload
    this.DOM.uploadSvgBtn.addEventListener('click', () => this.DOM.svgFileInput.click());
    this.DOM.svgFileInput.addEventListener('change', this.handleFileUpload);

    // Top bar
    this.DOM.projectName.addEventListener('input', () => this.markAsChanged());
    this.DOM.saveBtn.addEventListener('click', this.handleSave);

    // Zoom controls
    this.DOM.zoomIn.addEventListener('click', () => this.setZoom(this.state.zoom + 10));
    this.DOM.zoomOut.addEventListener('click', () => this.setZoom(this.state.zoom - 10));
    this.DOM.resetView.addEventListener('click', () => this.setZoom(100));

    // Playback controls
    this.DOM.playPause.addEventListener('click', this.togglePlayback);
    this.DOM.skipStart.addEventListener('click', () => this.seekToFrame(0));
    this.DOM.skipEnd.addEventListener('click', () => this.seekToFrame(this.state.totalFrames - 1));
    this.DOM.prevFrame.addEventListener('click', () => this.seekToFrame(this.state.currentFrame - 1));
    this.DOM.nextFrame.addEventListener('click', () => this.seekToFrame(this.state.currentFrame + 1));

    // Steps navigation
    this.DOM.prevStep.addEventListener('click', () => this.navigateStep(-1));
    this.DOM.nextStep.addEventListener('click', () => this.navigateStep(1));

    // Add/update animation
    this.DOM.targetElement.addEventListener('change', this.handleElementSelect);
    this.DOM.animationType.addEventListener('change', this.handleAnimationTypeSelect);
    this.DOM.addAnimationBtn.addEventListener('click', this.addOrUpdateAnimationStep);

    // Timeline scroll sync
    const syncScroll = (sourceEl) => {
      if (this._isSyncingTimelineScroll) return;
      this._isSyncingTimelineScroll = true;
      const st = sourceEl.scrollTop || 0;
      if (this.DOM.timelineLabels) this.DOM.timelineLabels.scrollTop = st;
      requestAnimationFrame(() => {
        this._isSyncingTimelineScroll = false;
      });
    };

    if (this.DOM.timelineWrapper) {
      this.DOM.timelineWrapper.addEventListener('scroll', () => syncScroll(this.DOM.timelineWrapper), { passive: true });
    }
    if (this.DOM.timelineTracksArea) {
      this.DOM.timelineTracksArea.addEventListener('scroll', () => syncScroll(this.DOM.timelineTracksArea), { passive: true });
    }
    if (this.DOM.timelineLabels) {
      this.DOM.timelineLabels.addEventListener('scroll', () => syncScroll(this.DOM.timelineLabels), { passive: true });
    }

    // Unsaved modal
    if (this.DOM.discardBtn) {
      this.DOM.discardBtn.addEventListener('click', () => {
        this.hideModal(this.DOM.unsavedModal);
        window.location.href = 'my-projects';
      });
    }
    if (this.DOM.saveAndCloseBtn) {
      this.DOM.saveAndCloseBtn.addEventListener('click', async () => {
        await this.handleSave();
        this.hideModal(this.DOM.unsavedModal);
        window.location.href = 'my-projects';
      });
    }

    // Import URL modal
    this.DOM.importUrlBtn?.addEventListener('click', () => this.showModal(this.DOM.importUrlModal));
    this.DOM.closeUrlModal?.addEventListener('click', () => this.hideModal(this.DOM.importUrlModal));
    this.DOM.cancelUrlImport?.addEventListener('click', () => this.hideModal(this.DOM.importUrlModal));
    this.DOM.confirmUrlImport?.addEventListener('click', this.handleUrlImport);
    this.DOM.svgUrlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleUrlImport();
    });

    // Import Code modal
    this.DOM.importCodeBtn?.addEventListener('click', () => this.showModal(this.DOM.importCodeModal));
    this.DOM.closeCodeModal?.addEventListener('click', () => this.hideModal(this.DOM.importCodeModal));
    this.DOM.cancelCodeImport?.addEventListener('click', () => this.hideModal(this.DOM.importCodeModal));
    this.DOM.confirmCodeImport?.addEventListener('click', this.handleCodeImport);

    // Settings modal
    this.DOM.settingsBtn?.addEventListener('click', this.openSettingsModal);
    this.DOM.closeSettingsModal?.addEventListener('click', () => this.hideModal(this.DOM.settingsModal));
    this.DOM.applySettingsBtn?.addEventListener('click', this.applySettings);
    this.DOM.resetSettingsBtn?.addEventListener('click', this.resetSettings);

    // FPS options
    this.DOM.fpsOptions?.forEach((option) => {
      option.addEventListener('click', () => {
        this.DOM.fpsOptions.forEach((o) => o.classList.remove('active'));
        option.classList.add('active');
        this.DOM.customFps.value = '';
      });
    });
    this.DOM.customFps?.addEventListener('input', () => {
      if (this.DOM.customFps.value) {
        this.DOM.fpsOptions.forEach((o) => o.classList.remove('active'));
      }
    });

    // ViewBox checkbox
    this.DOM.useOriginalViewBox?.addEventListener('change', () => {
      this.DOM.viewboxInputs?.classList.toggle('disabled', this.DOM.useOriginalViewBox.checked);
    });

    // Color pickers sync
    this.DOM.canvasBgColor?.addEventListener('input', () => {
      this.DOM.canvasBgColorText.value = this.DOM.canvasBgColor.value;
      this.DOM.transparentBgBtn.classList.remove('active');
    });

    this.DOM.canvasBgColorText?.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(this.DOM.canvasBgColorText.value)) {
        this.DOM.canvasBgColor.value = this.DOM.canvasBgColorText.value;
      }
      this.DOM.transparentBgBtn.classList.remove('active');
    });

    this.DOM.transparentBgBtn?.addEventListener('click', () => {
      this.DOM.transparentBgBtn.classList.toggle('active');
    });

    // Timeline resize handle (optional)
    if (this.DOM.timelineResizeHandle && this.DOM.timelineSection) {
      this.DOM.timelineResizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const handle = this.DOM.timelineResizeHandle;
        const section = this.DOM.timelineSection;
        let isResizing = true;
        const startY = e.clientY;
        const startHeight = section.getBoundingClientRect().height;

        handle.classList.add('active');
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (ev) => {
          if (!isResizing) return;
          const dy = startY - ev.clientY;
          const newHeight = Math.max(120, Math.min(600, startHeight + dy));
          section.style.height = `${newHeight}px`;
        };

        const onMouseUp = () => {
          isResizing = false;
          handle.classList.remove('active');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    }

    // Export modal
    this.DOM.exportBtn?.addEventListener('click', () => this.showModal(this.DOM.exportModal));
    this.DOM.closeExportModal?.addEventListener('click', () => this.hideModal(this.DOM.exportModal));
    this.DOM.exportVideoBtn?.addEventListener('click', this.handleExportVideo);
    this.DOM.exportFramesBtn?.addEventListener('click', this.handleExportFrames);

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown);

    // Warn on leaving
    window.addEventListener('beforeunload', (e) => {
      if (!this.state.hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }

  // ===========================
  // Lock/unlock editor while playing
  // ===========================
  setEditorLocked(isLocked) {
    this.state.isEditorLocked = !!isLocked;

    if (this.DOM.targetElement) this.DOM.targetElement.disabled = isLocked;
    if (this.DOM.animationType) this.DOM.animationType.disabled = isLocked || !this.DOM.targetElement.value;
    if (this.DOM.animationStartTime) this.DOM.animationStartTime.disabled = isLocked;
    if (this.DOM.animationDuration) this.DOM.animationDuration.disabled = isLocked;
    if (this.DOM.animationEasing) this.DOM.animationEasing.disabled = isLocked;

    if (this.DOM.addAnimationBtn) this.DOM.addAnimationBtn.disabled = isLocked || !this.DOM.animationType.value;

    this.DOM.stepsList?.querySelectorAll?.('.step-action-btn')?.forEach((btn) => {
      btn.disabled = isLocked;
      btn.style.pointerEvents = isLocked ? 'none' : '';
      btn.style.opacity = isLocked ? '0.5' : '';
    });
  }

  // ===========================
  // File Upload
  // ===========================
  handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.svg')) {
      this.showToast('error', 'Моля, изберете SVG файл.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      this.loadSVG(event.target.result);
      this.DOM.projectName.value = file.name.replace('.svg', '');
      this.markAsChanged();
    };
    reader.readAsText(file);
  }

  // ===========================
  // URL Import
  // ===========================
  async handleUrlImport() {
    const url = this.DOM.svgUrlInput.value.trim();

    if (!url) {
      this.DOM.svgUrlInput.classList.add('error');
      setTimeout(() => this.DOM.svgUrlInput.classList.remove('error'), 500);
      return;
    }

    try {
      new URL(url);
    } catch {
      this.DOM.svgUrlInput.classList.add('error');
      setTimeout(() => this.DOM.svgUrlInput.classList.remove('error'), 500);
      return;
    }

    this.DOM.confirmUrlImport.classList.add('loading');
    this.DOM.confirmUrlImport.disabled = true;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('fetch_failed');

      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('svg') && !contentType.includes('xml') && !contentType.includes('text')) {
        throw new Error('not_svg');
      }

      const svgText = await response.text();
      if (!svgText.includes('<svg')) throw new Error('invalid_svg');

      const urlPath = new URL(url).pathname;
      const filename = urlPath.split('/').pop() || 'imported-svg';
      const projectName = filename.replace('.svg', '').replace(/[^a-zA-Z0-9-_]/g, '-');

      this.loadSVG(svgText);
      this.DOM.projectName.value = projectName;
      this.markAsChanged();

      this.hideModal(this.DOM.importUrlModal);
      this.DOM.svgUrlInput.value = '';
      this.showToast('success', 'SVG е зареден успешно');
    } catch {
      this.showToast('error', 'Грешка при зареждане на SVG от URL. Проверете линка.');
      this.DOM.svgUrlInput.classList.add('error');
      setTimeout(() => this.DOM.svgUrlInput.classList.remove('error'), 500);
    } finally {
      this.DOM.confirmUrlImport.classList.remove('loading');
      this.DOM.confirmUrlImport.disabled = false;
    }
  }

  // ===========================
  // Code Import
  // ===========================
  handleCodeImport() {
    const code = this.DOM.svgCodeInput.value.trim();

    if (!code) {
      this.DOM.svgCodeInput.classList.add('error');
      setTimeout(() => this.DOM.svgCodeInput.classList.remove('error'), 500);
      return;
    }

    if (!code.includes('<svg')) {
      this.DOM.svgCodeInput.classList.add('error');
      setTimeout(() => this.DOM.svgCodeInput.classList.remove('error'), 500);
      this.showToast('error', 'Кодът не съдържа валиден SVG елемент.');
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(code, 'image/svg+xml');
    const parseError = doc.querySelector('parsererror');

    if (parseError) {
      this.DOM.svgCodeInput.classList.add('error');
      setTimeout(() => this.DOM.svgCodeInput.classList.remove('error'), 500);
      this.showToast('error', 'Невалиден SVG код. Проверете синтаксиса.');
      return;
    }

    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      this.DOM.svgCodeInput.classList.add('error');
      setTimeout(() => this.DOM.svgCodeInput.classList.remove('error'), 500);
      this.showToast('error', 'SVG елементът не е намерен в кода.');
      return;
    }

    this.loadSVG(code);
    this.DOM.projectName.value = 'Импортиран SVG';
    this.markAsChanged();

    this.hideModal(this.DOM.importCodeModal);
    this.DOM.svgCodeInput.value = '';
    this.showToast('success', 'SVG е зареден успешно');
  }

  // ===========================
  // Reset editor state when loading new SVG
  // ===========================
  resetForNewSvg() {
    if (this.state.isPlaying) this.stopPlayback();

    this.state.steps = [];
    this.state.currentStepIndex = -1;
    this.state.editingStepIndex = null;
    this.state.stepCounter = 0;

    this.state.currentFrame = 0;
    this.state.totalFrames = 0;

    this.state.selectedElement = null;

    this.state.stepGroups = new Map();
    this.state.stepGroupsDirty = true;

    if (this.DOM.targetElement) {
      this.DOM.targetElement.innerHTML = '<option value="">Изберете елемент</option>';
      this.DOM.targetElement.value = '';
      this.DOM.targetElement.disabled = true;
    }

    if (this.DOM.animationType) {
      this.DOM.animationType.innerHTML = '<option value="">Изберете анимация</option>';
      this.DOM.animationType.value = '';
      this.DOM.animationType.disabled = true;
    }

    if (this.DOM.animationValues) this.DOM.animationValues.style.display = 'none';
    if (this.DOM.valueInputs) this.DOM.valueInputs.innerHTML = '';
    if (this.DOM.addAnimationBtn) {
      this.DOM.addAnimationBtn.disabled = true;
      this.DOM.addAnimationBtn.textContent = 'Добави стъпка';
    }

    if (this.DOM.animationStartTime) this.DOM.animationStartTime.value = 0;
    if (this.DOM.animationDuration) this.DOM.animationDuration.value = 1;
    if (this.DOM.animationEasing) this.DOM.animationEasing.value = 'ease-in-out';

    this.renderSteps();
    this.updateTimeline();
    this.updateStepNavigation();
    this.updatePlayhead();

    this.setEditorLocked(false);
  }

  // ===========================
  // Load SVG into canvas
  // ===========================
  loadSVG(svgString) {
    this.resetForNewSvg();

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    if (!svgElement) {
      this.showToast('error', 'Невалиден SVG файл.');
      return;
    }

    this.state.svgContent = svgElement;

    const originalViewBox = svgElement.getAttribute('viewBox');
    if (originalViewBox) {
      const parts = originalViewBox.split(/\s+|,/).map(Number);
      if (parts.length === 4) {
        this.state.settings.originalViewBox = {
          minX: parts[0],
          minY: parts[1],
          width: parts[2],
          height: parts[3]
        };

        if (this.state.settings.useOriginalViewBox) {
          this.state.settings.viewBox = { ...this.state.settings.originalViewBox };
        } else {
          const vb = this.state.settings.viewBox || null;
          if (!vb || !Number.isFinite(vb.width) || !Number.isFinite(vb.height)) {
            this.state.settings.viewBox = { ...this.state.settings.originalViewBox };
          }
        }
      }
    }

    this.DOM.mainCanvas.innerHTML = svgElement.innerHTML;

    Array.from(svgElement.attributes).forEach((attr) => {
      if (attr.name !== 'xmlns') {
        this.DOM.mainCanvas.setAttribute(attr.name, attr.value);
      }
    });

    this.applyViewBox();
    this.applyCanvasBackground();

    if (this.DOM.canvasPlaceholder) this.DOM.canvasPlaceholder.style.display = 'none';
    this.DOM.mainCanvas.style.display = 'block';

    this.buildElementsTree();
    this.enableAddPanel();

    this.updateFpsDisplay();
    this.updateTimeline();

    this.showToast('success', 'SVG е зареден');
  }

  // ===========================
  // Elements tree
  // ===========================
  buildElementsTree() {
    this.state.elements = [];
    this.state.elementCounter = 0;
    this.DOM.elementsTree.innerHTML = '';

    const svgElement = this.DOM.mainCanvas;
    const treeHTML = this.buildTreeHTML(svgElement, 0);
    this.DOM.elementsTree.innerHTML = treeHTML;

    this.DOM.elementsTree.querySelectorAll('.tree-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectElement(item.dataset.path);
      });

      item.addEventListener('mouseenter', () => this.highlightElement(item.dataset.path, true));
      item.addEventListener('mouseleave', () => this.highlightElement(item.dataset.path, false));
    });

    this.DOM.elementsTree.querySelectorAll('.tree-toggle').forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTreeItem(toggle);
      });
    });

    this.updateElementSelect();
  }

  buildTreeHTML(element, depth, path = '') {
    if (!element || !element.tagName) return '';

    const tagName = element.tagName.toLowerCase();
    if (tagName === '#text' || tagName === '#comment') return '';

    const currentPath = path ? `${path}>${tagName}` : tagName;
    const hasChildren = element.children && element.children.length > 0;

    const animatable = isAnimatableNode(element);
    let html = '';

    if (animatable) {
      const id = element.id || '';
      const className = element.getAttribute('class') || '';
      const uid = ++this.state.elementCounter;

      const elementData = {
        uid,
        path: currentPath,
        element,
        tagName,
        id,
        className
      };
      this.state.elements.push(elementData);

      html += `
        <div class="tree-item" data-path="${currentPath}" data-depth="${depth}">
          ${
            depth > 0
              ? '<div class="tree-indent">' + '<div class="tree-indent-line"></div>'.repeat(depth) + '</div>'
              : ''
          }
          <span class="tree-toggle ${hasChildren ? '' : 'hidden'}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="tree-num">#${uid}</span>
          <span class="tree-tag">&lt;${tagName}&gt;</span>
          ${id ? `<span class="tree-id">#${id}</span>` : ''}
        </div>
      `;
    }

    if (hasChildren) {
      if (animatable) {
        html += `<div class="tree-children" data-parent="${currentPath}">`;
        Array.from(element.children).forEach((child, index) => {
          html += this.buildTreeHTML(child, depth + 1, `${currentPath}[${index}]`);
        });
        html += `</div>`;
      } else {
        Array.from(element.children).forEach((child, index) => {
          html += this.buildTreeHTML(child, depth, `${currentPath}[${index}]`);
        });
      }
    }

    return html;
  }

  toggleTreeItem(toggle) {
    const item = toggle.closest('.tree-item');
    const path = item?.dataset?.path;
    if (!path) return;

    const children = this.DOM.elementsTree.querySelector(`.tree-children[data-parent="${path}"]`);
    if (children) {
      children.classList.toggle('collapsed');
      toggle.classList.toggle('expanded');
    }
  }

  selectElement(path) {
    this.DOM.elementsTree.querySelectorAll('.tree-item').forEach((item) => item.classList.remove('selected'));
    const item = this.DOM.elementsTree.querySelector(`.tree-item[data-path="${path}"]`);
    if (item) item.classList.add('selected');

    this.state.selectedElement = this.state.elements.find((el) => el.path === path) || null;

    if (this.state.selectedElement) {
      this.DOM.targetElement.value = this.state.selectedElement.path;
      this.updateAnimationTypes();
    }
  }

  getDynamicHighlightPx() {
    const container = this.DOM.canvasContainer;
    const rect = container?.getBoundingClientRect?.();
    const minDim = rect ? Math.min(rect.width, rect.height) : 800;

    const w = Math.max(6, Math.min(32, Math.round(minDim * 0.016)));
    const off = Math.max(6, Math.min(42, Math.round(w * 1.05)));
    return { w, off };
  }

  highlightElement(path, isHovering) {
    const elementData = this.state.elements.find((el) => el.path === path);
    if (!elementData || !elementData.element) return;

    const element = elementData.element;

    if (isHovering) {
      element.classList.add('svg-element-highlight');
      const { w, off } = this.getDynamicHighlightPx();
      element.style.setProperty('--svg-highlight-w', `${w}px`);
      element.style.setProperty('--svg-highlight-off', `${off}px`);
    } else {
      element.classList.remove('svg-element-highlight');
      element.style.removeProperty('--svg-highlight-w');
      element.style.removeProperty('--svg-highlight-off');
    }
  }

  refreshElementsTree() {
    if (this.state.svgContent) {
      this.buildElementsTree();
    }
  }

  updateElementSelect() {
    this.DOM.targetElement.innerHTML = '<option value="">Изберете елемент</option>';

    this.state.elements.forEach((el) => {
      const option = document.createElement('option');
      option.value = el.path;
      option.textContent = `#${el.uid} <${el.tagName}>` + (el.id ? ` #${el.id}` : '');
      this.DOM.targetElement.appendChild(option);
    });
  }

  // ===========================
  // Add Animation Panel
  // ===========================
  enableAddPanel() {
    this.DOM.targetElement.disabled = false;
    this.DOM.animationStartTime.disabled = false;
  }

  handleElementSelect() {
    if (this.state.isPlaying) {
      this.showToast('error', 'Спрете таймлайна, за да променяте избори.');
      this.DOM.targetElement.value = this.state.selectedElement?.path || '';
      return;
    }

    const path = this.DOM.targetElement.value;
    if (!path) {
      this.DOM.animationType.disabled = true;
      this.DOM.animationType.innerHTML = '<option value="">Изберете анимация</option>';
      return;
    }
    this.selectElement(path);
    this.updateAnimationTypes();
  }

  updateAnimationTypes() {
    if (!this.state.selectedElement) return;

    const tagName = this.state.selectedElement.tagName;
    const props = ANIMATION_PROPERTIES[tagName] || ANIMATION_PROPERTIES.default;

    this.DOM.animationType.innerHTML = '<option value="">Изберете анимация</option>';
    props.properties.forEach((prop) => {
      const option = document.createElement('option');
      option.value = prop.name;
      option.textContent = prop.label;
      option.dataset.type = prop.type;
      this.DOM.animationType.appendChild(option);
    });

    this.DOM.animationType.disabled = this.state.isPlaying;
    this.DOM.animationDuration.disabled = this.state.isPlaying;
    this.DOM.animationEasing.disabled = this.state.isPlaying;
  }

  // ===========================
  // Color helpers
  // ===========================
  rgbToHex(r, g, b) {
    const rr = this.clamp(Math.round(r), 0, 255).toString(16).padStart(2, '0');
    const gg = this.clamp(Math.round(g), 0, 255).toString(16).padStart(2, '0');
    const bb = this.clamp(Math.round(b), 0, 255).toString(16).padStart(2, '0');
    return `#${rr}${gg}${bb}`;
  }

  parseCssColorToHex(value) {
    if (!value) return '';
    const v = String(value).trim();

    if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
    if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
      const r = v[1], g = v[2], b = v[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }

    const rgbMatch = v.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
    if (rgbMatch) {
      return this.rgbToHex(parseFloat(rgbMatch[1]), parseFloat(rgbMatch[2]), parseFloat(rgbMatch[3]));
    }

    const test = document.createElement('span');
    test.style.color = '';
    test.style.color = v;
    if (test.style.color) {
      document.body.appendChild(test);
      const cs = getComputedStyle(test).color;
      test.remove();
      const m = cs.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i);
      if (m) return this.rgbToHex(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
    }
    return '';
  }

  resolvePaintUrlToHex(urlValue) {
    const m = String(urlValue || '').match(/^url\(\s*#([^)]+)\s*\)$/i);
    if (!m) return '';

    const id = m[1];
    const defsEl = this.DOM.mainCanvas.querySelector(`#${CSS.escape(id)}`);
    if (!defsEl) return '';

    const tag = defsEl.tagName ? defsEl.tagName.toLowerCase() : '';
    if (tag.includes('gradient')) {
      const stop = defsEl.querySelector('stop');
      const stopColor = stop?.getAttribute('stop-color') || stop?.style?.stopColor || '';
      const hex = this.parseCssColorToHex(stopColor);
      if (hex) return hex;
    }

    return '';
  }

  getResolvedAttributeForInput(element, attrName, propType) {
    let currentValue = element.getAttribute(attrName) || '';

    if (typeof currentValue === 'string' && currentValue.trim().startsWith('url(')) {
      const resolved = this.resolvePaintUrlToHex(currentValue.trim());
      if (resolved) currentValue = resolved;
    }

    if (propType === 'color') {
      const hex = this.parseCssColorToHex(currentValue);
      if (hex) currentValue = hex;
      if (!currentValue) currentValue = '#000000';
    }

    currentValue = this.ensurePxIfLength(attrName, currentValue);
    return currentValue;
  }

  handleAnimationTypeSelect() {
    const propName = this.DOM.animationType.value;

    if (!propName || !this.state.selectedElement) {
      this.DOM.animationValues.style.display = 'none';
      this.DOM.addAnimationBtn.disabled = true;
      return;
    }

    const tagName = this.state.selectedElement.tagName;
    const props = ANIMATION_PROPERTIES[tagName] || ANIMATION_PROPERTIES.default;
    const prop = props.properties.find((p) => p.name === propName);
    if (!prop) return;

    const currentValue = this.getResolvedAttributeForInput(
      this.state.selectedElement.element,
      propName,
      prop.type
    );

    this.DOM.valueInputs.innerHTML = '';

    if (prop.type === 'select') {
      const fromRow = document.createElement('div');
      fromRow.className = 'value-input-row';
      fromRow.innerHTML = `
        <label>От:</label>
        <select class="form-select" id="valueFrom" style="height: 30px; font-size: 0.75rem;" disabled>
          ${prop.options
            .map((opt) => `<option value="${opt}" ${currentValue === opt ? 'selected' : ''}>${opt}</option>`)
            .join('')}
        </select>
      `;
      this.DOM.valueInputs.appendChild(fromRow);

      const toRow = document.createElement('div');
      toRow.className = 'value-input-row';
      toRow.innerHTML = `
        <label>До:</label>
        <select class="form-select" id="valueTo" style="height: 30px; font-size: 0.75rem;">
          ${prop.options.map((opt) => `<option value="${opt}">${opt}</option>`).join('')}
        </select>
      `;
      this.DOM.valueInputs.appendChild(toRow);
    } else if (prop.type === 'color') {
      const safeColor = (currentValue && currentValue.startsWith('#') ? currentValue : '#000000');

      const fromRow = document.createElement('div');
      fromRow.className = 'value-input-row color-row';
      fromRow.innerHTML = `
        <label>От:</label>
        <input type="color" id="valueFrom" value="${safeColor}" disabled>
        <input type="text" id="valueFromText" value="${safeColor}" style="flex: 1;" disabled>
      `;
      this.DOM.valueInputs.appendChild(fromRow);

      const toRow = document.createElement('div');
      toRow.className = 'value-input-row color-row';
      toRow.innerHTML = `
        <label>До:</label>
        <input type="color" id="valueTo" value="#ffffff">
        <input type="text" id="valueToText" value="#ffffff" style="flex: 1;">
      `;
      this.DOM.valueInputs.appendChild(toRow);

      setTimeout(() => {
        const colorTo = document.getElementById('valueTo');
        const textTo = document.getElementById('valueToText');

        colorTo?.addEventListener('input', () => (textTo.value = colorTo.value));
        textTo?.addEventListener('input', () => {
          if (/^#[0-9A-Fa-f]{6}$/.test(textTo.value)) colorTo.value = textTo.value;
        });
      }, 0);
    } else {
      const inputType = prop.type === 'range' ? 'number' : prop.type;

      // If it's a length prop, show number only in input (no px), but store px internally
      const parsedLen = this.isLengthProp(propName) ? this.parseNumberWithUnit(currentValue) : null;
      const displayFrom = (this.isLengthProp(propName) && parsedLen) ? String(parsedLen.num) : currentValue;

      const fromRow = document.createElement('div');
      fromRow.className = 'value-input-row';
      fromRow.innerHTML = `
        <label>От:</label>
        <input
          type="${inputType}"
          id="valueFrom"
          value="${displayFrom}"
          disabled
          ${prop.min !== undefined ? `min="${prop.min}"` : ''}
          ${prop.max !== undefined ? `max="${prop.max}"` : ''}
          ${prop.step !== undefined ? `step="${prop.step}"` : ''}
        >
      `;
      this.DOM.valueInputs.appendChild(fromRow);

      const toRow = document.createElement('div');
      toRow.className = 'value-input-row';
      toRow.innerHTML = `
        <label>До:</label>
        <input
          type="${inputType}"
          id="valueTo"
          value=""
          ${prop.min !== undefined ? `min="${prop.min}"` : ''}
          ${prop.max !== undefined ? `max="${prop.max}"` : ''}
          ${prop.step !== undefined ? `step="${prop.step}"` : ''}
        >
      `;
      this.DOM.valueInputs.appendChild(toRow);
    }

    this.DOM.animationValues.style.display = 'block';
    this.DOM.addAnimationBtn.disabled = this.state.isPlaying;
  }

  addOrUpdateAnimationStep() {
    if (this.state.isPlaying) {
      this.showToast('error', 'Спрете таймлайна, за да добавяте или редактирате стъпки.');
      return;
    }

    if (!this.state.selectedElement) return;

    const propName = this.DOM.animationType.value;
    const fromInput = document.getElementById('valueFrom');
    const toInput = document.getElementById('valueTo');

    if (!propName || !fromInput || !toInput) return;

    const tagName = this.state.selectedElement.tagName;
    const props = ANIMATION_PROPERTIES[tagName] || ANIMATION_PROPERTIES.default;
    const prop = props.properties.find((p) => p.name === propName);
    const propType = prop?.type || '';

    let resolvedFrom = this.getResolvedAttributeForInput(this.state.selectedElement.element, propName, propType);
    resolvedFrom = this.ensurePxIfLength(propName, resolvedFrom);

    if (!String(toInput.value || '').trim()) {
      this.showToast('error', 'Моля, въведете стойност за "До".');
      return;
    }

    const rawTo = toInput.value;
    const normalizedTo = this.normalizeToValueWithFromUnit(propName, resolvedFrom, rawTo);

    let startTime = parseFloat(this.DOM.animationStartTime.value) || 0;
    let duration = parseFloat(this.DOM.animationDuration.value) || 1;

    duration = this.clamp(duration, 0.05, MAX_SECONDS);
    startTime = this.clamp(startTime, 0, Math.max(0, MAX_SECONDS - duration));

    const easing = this.sanitizeEasing(this.DOM.animationEasing.value);

    const stepObj = {
      id: 0,

      elementPath: this.state.selectedElement.path,
      elementUid: this.state.selectedElement.uid,
      elementTag: this.state.selectedElement.tagName,
      elementId: this.state.selectedElement.id,

      property: propName,
      propertyLabel: this.DOM.animationType.options[this.DOM.animationType.selectedIndex].text,

      fromValue: resolvedFrom,
      toValue: normalizedTo,

      startTime,
      duration,
      easing
    };

    if (this.state.editingStepIndex !== null && this.state.editingStepIndex >= 0) {
      const idx = this.state.editingStepIndex;
      const existing = this.state.steps[idx];
      if (!existing) return;

      stepObj.id = existing.id;
      this.state.steps[idx] = stepObj;
      this.state.currentStepIndex = idx;
      this.state.editingStepIndex = null;

      this.DOM.addAnimationBtn.textContent = 'Добави стъпка';
      this.showToast('success', 'Стъпката е обновена');
    } else {
      this.state.stepCounter = (this.state.stepCounter || 0) + 1;
      stepObj.id = this.state.stepCounter;

      this.state.steps.push(stepObj);
      this.state.currentStepIndex = this.state.steps.length - 1;

      this.showToast('success', 'Стъпката е добавена');
    }

    this.state.stepGroupsDirty = true;

    this.markAsChanged();
    this.renderSteps();
    this.updateTimeline();
    this.updateStepNavigation();

    this.DOM.animationType.value = '';
    this.DOM.animationValues.style.display = 'none';
    this.DOM.valueInputs.innerHTML = '';
    this.DOM.addAnimationBtn.disabled = true;
  }

  // ===========================
  // Steps table
  // ===========================
  renderSteps() {
    if (this.state.steps.length === 0) {
      this.DOM.stepsList.innerHTML = `
        <div class="steps-placeholder">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="20" cy="28" r="4" stroke="currentColor" stroke-width="1.5"/>
            <path d="M20 16V24" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>
          </svg>
          <p>Няма добавени стъпки</p>
        </div>
      `;
      return;
    }

    this.DOM.stepsList.innerHTML = `
      <div class="steps-table">
        <div class="steps-table-header">
          <span class="col-id">#</span>
          <span class="col-element">Елемент</span>
          <span class="col-anim">Анимация</span>
          <span class="col-from">От</span>
          <span class="col-to">До</span>
          <span class="col-time">Време</span>
          <span class="col-easing">Easing</span>
          <span class="col-actions">Действия</span>
        </div>
        ${this.state.steps
          .map((step, index) => {
            const end = (step.startTime + step.duration).toFixed(1);
            return `
              <div class="steps-table-row ${index === this.state.currentStepIndex ? 'active' : ''}" data-index="${index}">
                <span class="col-id">#${step.id}</span>
                <span class="col-element">#${step.elementUid} &lt;${step.elementTag}&gt;${step.elementId ? ' #' + step.elementId : ''}</span>
                <span class="col-anim">${step.propertyLabel}</span>
                <span class="col-from">${step.fromValue}</span>
                <span class="col-to">${step.toValue}</span>
                <span class="col-time">${step.startTime}s - ${end}s</span>
                <span class="col-easing">${step.easing}</span>
                <span class="col-actions">
                  <button class="step-action-btn edit" type="button" onclick="editStep(${index})">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M10.5 1.5L12.5 3.5L4 12H2V10L10.5 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button class="step-action-btn delete" type="button" onclick="deleteStep(${index})">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 4H12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                      <path d="M10.5 4V11.5C10.5 12.0523 10.0523 12.5 9.5 12.5H4.5C3.94772 12.5 3.5 12.0523 3.5 11.5V4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                      <path d="M5.5 2H8.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    </svg>
                  </button>
                </span>
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    this.DOM.stepsList.querySelectorAll('.steps-table-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.step-action-btn')) return;
        this.state.currentStepIndex = parseInt(row.dataset.index, 10);
        this.renderSteps();
        this.updateStepNavigation();
      });
    });

    if (this.state.isPlaying) this.setEditorLocked(true);
  }

  deleteStep(index) {
    if (this.state.isPlaying) {
      this.showToast('error', 'Спрете таймлайна, за да триете стъпки.');
      return;
    }

    this.state.steps.splice(index, 1);

    if (this.state.currentStepIndex >= this.state.steps.length) {
      this.state.currentStepIndex = this.state.steps.length - 1;
    }

    if (this.state.editingStepIndex === index) {
      this.state.editingStepIndex = null;
      this.DOM.addAnimationBtn.textContent = 'Добави стъпка';
    }

    this.state.stepGroupsDirty = true;

    this.markAsChanged();
    this.renderSteps();
    this.updateTimeline();
    this.updateStepNavigation();
  }

  editStep(index) {
    if (this.state.isPlaying) {
      this.showToast('error', 'Спрете таймлайна, за да редактирате стъпки.');
      return;
    }

    const step = this.state.steps[index];
    if (!step) return;

    this.DOM.targetElement.value = step.elementPath;
    this.handleElementSelect();

    this.state.editingStepIndex = index;
    this.state.currentStepIndex = index;

    this.DOM.animationStartTime.value = step.startTime;
    this.DOM.animationDuration.value = step.duration;
    this.DOM.animationEasing.value = step.easing;

    setTimeout(() => {
      this.DOM.animationType.value = step.property;
      this.handleAnimationTypeSelect();

      setTimeout(() => {
        const toInput = document.getElementById('valueTo');
        if (toInput) {
          if (toInput.type === 'number') {
            const parsed = this.parseNumberWithUnit(step.toValue);
            toInput.value = parsed ? String(parsed.num) : step.toValue;
          } else {
            toInput.value = step.toValue;
          }
        }

        this.DOM.addAnimationBtn.disabled = false;
        this.DOM.addAnimationBtn.textContent = 'Запази промени';
        this.renderSteps();
        this.updateTimeline();
      }, 10);
    }, 10);
  }

  navigateStep(direction) {
    const newIndex = this.state.currentStepIndex + direction;
    if (newIndex >= 0 && newIndex < this.state.steps.length) {
      this.state.currentStepIndex = newIndex;
      this.renderSteps();
      this.updateStepNavigation();
    }
  }

  updateStepNavigation() {
    const total = this.state.steps.length;
    const current = this.state.currentStepIndex + 1;

    this.DOM.stepIndicator.textContent = total > 0 ? `${current} / ${total}` : '0 / 0';
    this.DOM.prevStep.disabled = this.state.currentStepIndex <= 0;
    this.DOM.nextStep.disabled = this.state.currentStepIndex >= total - 1;
  }

  // ===========================
  // Timeline
  // ===========================
  generateTimelineRuler() {
    const spacer = `<div class="ruler-spacer"></div>`;
    let marks = '';
    for (let i = 0; i <= MAX_SECONDS; i++) {
      marks += `<div class="ruler-mark ${i % 5 === 0 ? 'major' : ''}">${i}s</div>`;
    }
    this.DOM.timelineRuler.innerHTML = `${spacer}<div class="ruler-marks">${marks}</div>`;
  }

  updateTimeline() {
    const totalDuration = this.state.steps.reduce((max, step) => {
      const endTime = step.startTime + step.duration;
      return endTime > max ? endTime : max;
    }, 0);

    this.state.totalFrames = Math.ceil(totalDuration * this.state.settings.fps) || 0;
    this.DOM.totalTime.textContent = this.formatTime(totalDuration);

    const trackWidth = (MAX_SECONDS + 1) * PX_PER_SECOND;
    if (this.DOM.timelineTracks) this.DOM.timelineTracks.style.minWidth = `${trackWidth}px`;
    if (this.DOM.timelineRuler) this.DOM.timelineRuler.style.minWidth = `${trackWidth + 120}px`;

    let labelsHTML = '';
    let tracksHTML = '';

    if (this.state.steps.length === 0) {
      labelsHTML = '';
      tracksHTML = '<div class="timeline-tracks-empty">Добавете анимации</div>';
    } else {
      this.state.steps.forEach((step, index) => {
        const startX = step.startTime * PX_PER_SECOND;
        const width = step.duration * PX_PER_SECOND;

        labelsHTML += `
          <div class="track-label" title="#${step.id} #${step.elementUid} <${step.elementTag}> - ${step.propertyLabel}">
            <span class="track-id">#${step.id}</span>
          </div>
        `;

        tracksHTML += `
          <div class="timeline-track-row" data-track="${index}">
            <div class="frame-block ${index === this.state.currentStepIndex ? 'selected' : ''}"
                 style="left: ${startX}px; width: ${width}px;"
                 data-step="${index}"
                 draggable="false"></div>
          </div>
        `;
      });
    }

    this.DOM.timelineLabels.innerHTML = labelsHTML;
    this.DOM.timelineTracks.innerHTML = tracksHTML;

    const rowCount = Math.max(1, this.state.steps.length);
    const rowsHeight = rowCount * 32;
    this.DOM.timelineTracks.style.height = `${rowsHeight}px`;
    this.DOM.timelineLabels.style.height = `${rowsHeight}px`;
    if (this.DOM.timelineTracksArea) this.DOM.timelineTracksArea.style.minHeight = `${rowsHeight}px`;

    this.DOM.timelineTracks.querySelectorAll('.frame-block').forEach((block) => {
      block.addEventListener('pointerdown', this.onTimelinePointerDown);
    });

    this.state.stepGroupsDirty = true;
    this.updatePlayhead();
  }

  onTimelinePointerDown(e) {
    if (this.state.isPlaying) {
      this.showToast('error', 'Спрете таймлайна, за да местите сегменти по таймлайна.');
      return;
    }

    const block = e.currentTarget;
    const stepIndex = parseInt(block.dataset.step, 10);
    if (Number.isNaN(stepIndex)) return;

    this.state.drag.active = true;
    this.state.drag.stepIndex = stepIndex;
    this.state.drag.startPointerX = e.clientX;

    this.state.drag.startScrollLeft = this.DOM.timelineWrapper.scrollLeft;

    const rect = block.getBoundingClientRect();
    const parentRect = this.DOM.timelineTracks.getBoundingClientRect();
    const currentLeft = rect.left - parentRect.left;
    this.state.drag.startLeftPx = currentLeft;

    block.classList.add('dragging');
    block.setPointerCapture?.(e.pointerId);

    document.addEventListener('pointermove', this.onTimelinePointerMove);
    document.addEventListener('pointerup', this.onTimelinePointerUp);
  }

  onTimelinePointerMove(e) {
    if (!this.state.drag.active) return;
    const idx = this.state.drag.stepIndex;
    const step = this.state.steps[idx];
    if (!step) return;

    const scrollNow = this.DOM.timelineWrapper.scrollLeft;
    const scrollDelta = scrollNow - (this.state.drag.startScrollLeft || 0);

    const dx = (e.clientX - this.state.drag.startPointerX) + scrollDelta;
    let newLeft = this.state.drag.startLeftPx + dx;

    const maxStartLeft = Math.max(0, (MAX_SECONDS - (step.duration || 0)) * PX_PER_SECOND);
    newLeft = this.clamp(newLeft, 0, maxStartLeft);

    const newStartTime = newLeft / PX_PER_SECOND;
    step.startTime = Math.round(this.clamp(newStartTime, 0, MAX_SECONDS) * 10) / 10;

    const block = this.DOM.timelineTracks.querySelector(`.frame-block[data-step="${idx}"]`);
    if (block) block.style.left = `${step.startTime * PX_PER_SECOND}px`;

    this.state.stepGroupsDirty = true;
    this.renderSteps();
  }

  onTimelinePointerUp() {
    if (!this.state.drag.active) return;

    const idx = this.state.drag.stepIndex;
    const block = this.DOM.timelineTracks.querySelector(`.frame-block[data-step="${idx}"]`);
    if (block) block.classList.remove('dragging');

    this.state.drag.active = false;
    this.state.drag.stepIndex = null;

    document.removeEventListener('pointermove', this.onTimelinePointerMove);
    document.removeEventListener('pointerup', this.onTimelinePointerUp);

    this.state.stepGroupsDirty = true;

    this.markAsChanged();
    this.updateTimeline();
    this.renderSteps();
    this.updateStepNavigation();
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ===========================
  // Playback
  // ===========================
  togglePlayback() {
    if (this.state.isPlaying) this.stopPlayback();
    else this.startPlayback();
  }

  startPlayback() {
    if (this.state.steps.length === 0) return;

    this.setEditorLocked(true);
    this.state.isPlaying = true;
    this.DOM.playPause.classList.add('playing');

    const totalDuration = this.state.steps.reduce((max, step) => {
      const endTime = step.startTime + step.duration;
      return endTime > max ? endTime : max;
    }, 0);

    const safeTotal = Math.max(0.0001, totalDuration);
    const fps = this.state.settings.fps;
    this.state.totalFrames = Math.max(1, Math.ceil(safeTotal * fps));

    const startPerf = performance.now();

    const animate = (now) => {
      if (!this.state.isPlaying) return;

      const elapsed = (now - startPerf) / 1000;
      const t = elapsed % safeTotal;

      this.state.currentFrame = Math.round(t * fps);
      this.updatePlayheadFromTime(t);
      this.applyAnimations(t);

      this.state.rafId = requestAnimationFrame(animate);
    };

    this.state.rafId = requestAnimationFrame(animate);
  }

  stopPlayback() {
    this.state.isPlaying = false;
    this.DOM.playPause.classList.remove('playing');

    if (this.state.rafId) {
      cancelAnimationFrame(this.state.rafId);
      this.state.rafId = null;
    }

    this.setEditorLocked(false);
  }

  seekToFrame(frame) {
    if (this.state.totalFrames <= 0) return;

    this.state.currentFrame = Math.max(0, Math.min(frame, this.state.totalFrames - 1));
    this.updatePlayhead();

    const time = this.state.currentFrame / this.state.settings.fps;
    this.applyAnimations(time);
  }

  updatePlayheadFromTime(time) {
    const position = time * PX_PER_SECOND;
    this.DOM.playhead.style.left = `${position}px`;
    this.DOM.currentTime.textContent = this.formatTime(time);
  }

  updatePlayhead() {
    const time = this.state.settings.fps ? this.state.currentFrame / this.state.settings.fps : 0;
    this.updatePlayheadFromTime(time);
  }

  // ===========================
  // Group steps: key = elementPath||property
  // ===========================
  rebuildStepGroupsIfNeeded() {
    if (!this.state.stepGroupsDirty) return;

    const groups = new Map();
    for (const step of this.state.steps) {
      const key = `${step.elementPath}||${step.property}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(step);
    }

    for (const arr of groups.values()) {
      arr.sort((a, b) => (a.startTime - b.startTime) || (a.id - b.id));
    }

    this.state.stepGroups = groups;
    this.state.stepGroupsDirty = false;
  }

  applyAnimations(currentTime) {
    if (this.state.steps.length === 0) return;

    this.rebuildStepGroupsIfNeeded();

    for (const [key, groupSteps] of this.state.stepGroups.entries()) {
      const [elementPath, property] = key.split('||');

      const elementData = this.state.elements.find((el) => el.path === elementPath);
      if (!elementData) continue;

      // find latest step that started
      let prev = null;
      for (const st of groupSteps) {
        if (currentTime < st.startTime) break;
        prev = st;
      }

      if (!prev) {
        const first = groupSteps[0];
        elementData.element.setAttribute(property, first.fromValue);
        continue;
      }

      const stepStart = prev.startTime;
      const stepEnd = stepStart + prev.duration;

      if (currentTime >= stepStart && currentTime < stepEnd) {
        const progress = (currentTime - stepStart) / prev.duration;
        const eased = this.applyEasing(progress, prev.easing);
        this.interpolateValue(elementData.element, property, prev.fromValue, prev.toValue, eased);
      } else {
        elementData.element.setAttribute(property, prev.toValue);
      }
    }
  }

  interpolateValue(element, property, from, to, progress) {
    const numWithUnit = this.interpolateNumberWithUnit(property, from, to, progress);
    if (numWithUnit !== null) {
      element.setAttribute(property, numWithUnit);
      return;
    }

    const fromNum = parseFloat(from);
    const toNum = parseFloat(to);
    const fromIsNum = !Number.isNaN(fromNum) && String(from).trim() !== '';
    const toIsNum = !Number.isNaN(toNum) && String(to).trim() !== '';

    if (fromIsNum && toIsNum) {
      const value = fromNum + (toNum - fromNum) * progress;
      if (this.isLengthProp(property)) element.setAttribute(property, `${value}px`);
      else element.setAttribute(property, value);
      return;
    }

    const fromHex = this.parseCssColorToHex(from) || this.resolvePaintUrlToHex(from) || '';
    const toHex = this.parseCssColorToHex(to) || this.resolvePaintUrlToHex(to) || '';

    if (fromHex && toHex) {
      element.setAttribute(property, this.interpolateColor(fromHex, toHex, progress));
      return;
    }

    element.setAttribute(property, progress < 0.5 ? from : to);
  }

  interpolateColor(color1, color2, progress) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * progress);
    const g = Math.round(g1 + (g2 - g1) * progress);
    const b = Math.round(b1 + (b2 - b1) * progress);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // ===========================
  // Proper CSS-like easings via cubic-bezier
  // ===========================
  cubicBezier(p1x, p1y, p2x, p2y) {
    const cx = 3 * p1x;
    const bx = 3 * (p2x - p1x) - cx;
    const ax = 1 - cx - bx;

    const cy = 3 * p1y;
    const by = 3 * (p2y - p1y) - cy;
    const ay = 1 - cy - by;

    const sampleCurveX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleCurveY = (t) => ((ay * t + by) * t + cy) * t;
    const sampleCurveDerivativeX = (t) => (3 * ax * t + 2 * bx) * t + cx;

    const solveCurveX = (x) => {
      let t2 = x;

      // Newton-Raphson
      for (let i = 0; i < 8; i++) {
        const x2 = sampleCurveX(t2) - x;
        const d2 = sampleCurveDerivativeX(t2);
        if (Math.abs(x2) < 1e-7) return t2;
        if (Math.abs(d2) < 1e-7) break;
        t2 = t2 - x2 / d2;
      }

      // fallback binary subdivision
      let t0 = 0;
      let t1 = 1;
      t2 = x;

      while (t0 < t1) {
        const x2 = sampleCurveX(t2);
        if (Math.abs(x2 - x) < 1e-7) return t2;
        if (x > x2) t0 = t2;
        else t1 = t2;
        t2 = (t1 + t0) / 2;
      }

      return t2;
    };

    return (x) => {
      const t = solveCurveX(x);
      return sampleCurveY(t);
    };
  }

  applyEasing(t, easing) {
    const x = Math.max(0, Math.min(1, t));
    const e = this.sanitizeEasing(easing);

    switch (e) {
      case 'linear':
        return x;

      case 'ease': {
        const f = this.cubicBezier(0.25, 0.1, 0.25, 1.0);
        return f(x);
      }

      case 'ease-in': {
        const f = this.cubicBezier(0.42, 0.0, 1.0, 1.0);
        return f(x);
      }

      case 'ease-out': {
        const f = this.cubicBezier(0.0, 0.0, 0.58, 1.0);
        return f(x);
      }

      case 'ease-in-out': {
        const f = this.cubicBezier(0.42, 0.0, 0.58, 1.0);
        return f(x);
      }

      default:
        return x;
    }
  }

  // ===========================
  // Zoom
  // ===========================
  setZoom(value) {
    this.state.zoom = Math.max(25, Math.min(200, value));
    this.DOM.zoomLevel.textContent = `${this.state.zoom}%`;
    this.DOM.mainCanvas.style.transform = `scale(${this.state.zoom / 100})`;
  }

  // ===========================
  // Settings
  // ===========================
  openSettingsModal() {
    this.populateSettingsModal();
    this.showModal(this.DOM.settingsModal);
  }

  populateSettingsModal() {
    const currentFps = this.state.settings.fps;

    this.DOM.fpsOptions.forEach((option) => {
      option.classList.toggle('active', parseInt(option.dataset.fps, 10) === currentFps);
    });

    const presetValues = [24, 30, 60];
    if (!presetValues.includes(currentFps)) {
      this.DOM.fpsOptions.forEach((o) => o.classList.remove('active'));
      this.DOM.customFps.value = currentFps;
    } else {
      this.DOM.customFps.value = '';
    }

    this.DOM.useOriginalViewBox.checked = this.state.settings.useOriginalViewBox;
    this.DOM.viewboxInputs.classList.toggle('disabled', this.DOM.useOriginalViewBox.checked);

    this.DOM.viewboxMinX.value = this.state.settings.viewBox.minX;
    this.DOM.viewboxMinY.value = this.state.settings.viewBox.minY;
    this.DOM.viewboxWidth.value = this.state.settings.viewBox.width;
    this.DOM.viewboxHeight.value = this.state.settings.viewBox.height;

    this.DOM.keepCentered.checked = this.state.settings.keepCentered;

    this.DOM.canvasBgColor.value = this.state.settings.canvasBgColor;
    this.DOM.canvasBgColorText.value = this.state.settings.canvasBgColor;
    this.DOM.transparentBgBtn.classList.toggle('active', this.state.settings.transparentBg);
  }

  applySettings() {
    let newFps = this.state.settings.fps || DEFAULT_FPS;

    const activeOption = this.DOM.settingsModal.querySelector('.fps-option.active');
    if (activeOption) {
      newFps = parseInt(activeOption.dataset.fps, 10);
    } else if (this.DOM.customFps.value) {
      newFps = Math.max(1, Math.min(120, parseInt(this.DOM.customFps.value, 10) || newFps));
    }

    const useOriginal = this.DOM.useOriginalViewBox.checked;

    const newViewBox = {
      minX: parseFloat(this.DOM.viewboxMinX.value) || 0,
      minY: parseFloat(this.DOM.viewboxMinY.value) || 0,
      width: parseFloat(this.DOM.viewboxWidth.value) || 800,
      height: parseFloat(this.DOM.viewboxHeight.value) || 600
    };

    const viewBoxChanged =
      !useOriginal &&
      (this.state.settings.viewBox.width !== newViewBox.width || this.state.settings.viewBox.height !== newViewBox.height);

    this.state.settings.fps = newFps;
    this.state.settings.useOriginalViewBox = useOriginal;
    this.state.settings.keepCentered = this.DOM.keepCentered.checked;
    this.state.settings.transparentBg = this.DOM.transparentBgBtn.classList.contains('active');
    this.state.settings.canvasBgColor = this.DOM.canvasBgColorText.value;

    if (useOriginal && this.state.settings.originalViewBox) {
      this.state.settings.viewBox = { ...this.state.settings.originalViewBox };
    } else {
      if (viewBoxChanged && this.state.settings.keepCentered) {
        this.centerSvgContent(this.state.settings.viewBox, newViewBox);
      }
      this.state.settings.viewBox = newViewBox;
    }

    this.applyViewBox();
    this.applyCanvasBackground();
    this.updateFpsDisplay();
    this.updateTimeline();

    this.markAsChanged();
    this.hideModal(this.DOM.settingsModal);
    this.showToast('success', 'Настройките са приложени');
  }

  resetSettings() {
    this.state.settings = {
      fps: DEFAULT_FPS,
      useOriginalViewBox: true,
      viewBox: this.state.settings.originalViewBox
        ? { ...this.state.settings.originalViewBox }
        : { minX: 0, minY: 0, width: 800, height: 600 },
      originalViewBox: this.state.settings.originalViewBox,
      keepCentered: true,
      canvasBgColor: '#0a0a12',
      transparentBg: false
    };

    this.populateSettingsModal();
    this.applyViewBox();
    this.applyCanvasBackground();
    this.updateFpsDisplay();
    this.updateTimeline();
    this.showToast('success', 'Настройките са върнати');
  }

  centerSvgContent(oldVB, newVB) {
    if (!oldVB || !newVB) return;
    const oldCx = oldVB.minX + oldVB.width / 2;
    const oldCy = oldVB.minY + oldVB.height / 2;

    const newMinX = oldCx - newVB.width / 2;
    const newMinY = oldCy - newVB.height / 2;

    newVB.minX = newMinX;
    newVB.minY = newMinY;
  }

  applyViewBox() {
    if (!this.DOM.mainCanvas || this.DOM.mainCanvas.style.display === 'none') return;
    const { minX, minY, width, height } = this.state.settings.viewBox;
    this.DOM.mainCanvas.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
  }

  applyCanvasBackground() {
    const container = this.DOM.canvasContainer;
    if (!container) return;

    if (this.state.settings.transparentBg) {
      container.style.background = `
        repeating-conic-gradient(#2a2a3a 0% 25%, #1a1a2a 0% 50%)
        50% / 20px 20px
      `;
    } else {
      container.style.background = this.state.settings.canvasBgColor;
    }
  }

  updateFpsDisplay() {
    if (this.DOM.timelineFps) {
      this.DOM.timelineFps.textContent = `${this.state.settings.fps} FPS`;
    }
  }

  // ===========================
  // Keyboard
  // ===========================
  handleKeydown(e) {
    // Space toggles play/pause
    if (e.code === 'Space') {
      // avoid messing with typing
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      e.preventDefault();
      this.togglePlayback();
      return;
    }

    // Left/Right arrows seek frames (when not typing)
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      e.preventDefault();
      const delta = e.code === 'ArrowLeft' ? -1 : 1;
      this.seekToFrame(this.state.currentFrame + delta);
      return;
    }
  }

  // ===========================
  // Timeline utilities
  // ===========================
  updatePlayheadFromSeconds(seconds) {
    this.updatePlayheadFromTime(seconds);
  }

  // ===========================
  // Export (placeholder safe)
  // ===========================
  async handleExportVideo() {
    this.showToast('error', 'Export Video не е имплементиран в този файл (ако имаш отделен exporter модул, кажи и ще го вържа).');
  }

  async handleExportFrames() {
    this.showToast('error', 'Export Frames не е имплементиран в този файл (ако имаш отделен exporter модул, кажи и ще го вържа).');
  }

  // ===========================
  // Save / Load from backend
  // ===========================
  normalizeLoadedSettings(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const out = {
      fps: DEFAULT_FPS,
      useOriginalViewBox: true,
      viewBox: { minX: 0, minY: 0, width: 800, height: 600 },
      originalViewBox: null,
      keepCentered: true,
      canvasBgColor: '#0a0a12',
      transparentBg: false
    };

    if (Number.isFinite(Number(raw.fps))) out.fps = Math.max(1, Math.min(120, Number(raw.fps)));
    if (typeof raw.useOriginalViewBox === 'boolean') out.useOriginalViewBox = raw.useOriginalViewBox;

    if (raw.viewBox && typeof raw.viewBox === 'object') {
      out.viewBox = {
        minX: Number(raw.viewBox.minX ?? 0) || 0,
        minY: Number(raw.viewBox.minY ?? 0) || 0,
        width: Math.max(1, Number(raw.viewBox.width ?? 800) || 800),
        height: Math.max(1, Number(raw.viewBox.height ?? 600) || 600)
      };
    }

    if (raw.originalViewBox && typeof raw.originalViewBox === 'object') {
      out.originalViewBox = {
        minX: Number(raw.originalViewBox.minX ?? 0) || 0,
        minY: Number(raw.originalViewBox.minY ?? 0) || 0,
        width: Math.max(1, Number(raw.originalViewBox.width ?? out.viewBox.width) || out.viewBox.width),
        height: Math.max(1, Number(raw.originalViewBox.height ?? out.viewBox.height) || out.viewBox.height)
      };
    }

    if (typeof raw.keepCentered === 'boolean') out.keepCentered = raw.keepCentered;

    if (typeof raw.canvasBgColor === 'string' && raw.canvasBgColor.trim()) {
      out.canvasBgColor = raw.canvasBgColor.trim();
    }

    if (typeof raw.transparentBg === 'boolean') out.transparentBg = raw.transparentBg;

    return out;
  }

  applyLoadedSettingsFromBackend(animationSettingsStr) {
    const parsed = typeof animationSettingsStr === 'string' ? this.safeParseJson(animationSettingsStr) : null;
    const normalized = this.normalizeLoadedSettings(parsed);
    if (!normalized) return false;

    const keepOriginalVB = this.state.settings.originalViewBox;
    this.state.settings = {
      ...this.state.settings,
      ...normalized,
      originalViewBox: keepOriginalVB
    };

    return true;
  }

  async loadAnimationById(animationId) {
    try {
      const res = await getAnimationRequest({ animationId });

      if (!res?.success || !res.animation) {
        this.showToast('error', 'Неуспешно зареждане на анимацията.');
        return;
      }

      const anim = res.animation;

      if (anim.name) this.DOM.projectName.value = anim.name;

      if (anim.animation_settings) {
        this.applyLoadedSettingsFromBackend(anim.animation_settings);
      }

      if (anim.starting_svg) {
        this.loadSVG(anim.starting_svg);
      } else {
        this.showToast('error', 'Анимацията няма starting_svg.');
        return;
      }

      if (Array.isArray(anim.animation_segments)) {
        this.applyLoadedAnimation(anim);
      }

      this.applyViewBox();
      this.applyCanvasBackground();
      this.updateFpsDisplay();
      this.updateTimeline();

      this.state.hasUnsavedChanges = false;
      this.showToast('success', 'Анимацията е заредена');
    } catch (e) {
      console.error(e);
      this.showToast('error', 'Грешка при зареждане на анимацията.');
    }
  }

  extractPropertyAndToValue(animObj) {
    if (!animObj || typeof animObj !== 'object') return { property: null, toValue: null };
    const keys = Object.keys(animObj);
    if (!keys.length) return { property: null, toValue: null };
    const property = keys[0];
    return { property, toValue: animObj[property] };
  }

  applyLoadedAnimation(anim) {
    const segments = Array.isArray(anim.animation_segments) ? anim.animation_segments : [];
    const sorted = [...segments].sort((a, b) => (a.step ?? 0) - (b.step ?? 0));

    const steps = [];
    let maxStepId = 0;

    for (const seg of sorted) {
      let elementData = null;

      const elementUid = Number(seg.element_id ?? seg.element_uid);
      if (!Number.isNaN(elementUid)) {
        elementData = this.state.elements.find((el) => el.uid === elementUid) || null;
      }

      if (!elementData && seg.element_selector) {
        const node = this.DOM.mainCanvas.querySelector(seg.element_selector);
        if (node) elementData = this.state.elements.find((el) => el.element === node) || null;
      }

      if (!elementData && this.state.elements.length === 1) {
        elementData = this.state.elements[0];
      }

      if (!elementData) {
        console.warn('[load] Segment skipped: missing element mapping', seg);
        continue;
      }

      const animData = this.safeParseJson(seg.animation_data) || {};
      const { property, toValue } = this.extractPropertyAndToValue(animData);
      if (!property) continue;

      const tagName = elementData.tagName;
      const props = ANIMATION_PROPERTIES[tagName] || ANIMATION_PROPERTIES.default;
      const propMeta = props.properties.find((p) => p.name === property);
      const propertyLabel = propMeta?.label || property;

      const startTime = Number(seg.start_at ?? 0) || 0;
      const duration =
        Number(seg.duration ?? 0) ||
        Math.max(0, (Number(seg.end_at ?? 0) || 0) - startTime);

      const stepId = Number(seg.step ?? seg.id ?? 0) || 0;
      maxStepId = Math.max(maxStepId, stepId);

      let fromResolved = this.getResolvedAttributeForInput(elementData.element, property, propMeta?.type || '');
      fromResolved = this.ensurePxIfLength(property, fromResolved);

      const rawTo = String(toValue);
      const normalizedTo = this.normalizeToValueWithFromUnit(property, fromResolved, rawTo);

      const easing = this.sanitizeEasing(seg.easing || 'linear');

      steps.push({
        id: stepId || (steps.length + 1),

        elementPath: elementData.path,
        elementUid: elementData.uid,
        elementTag: elementData.tagName,
        elementId: elementData.id,

        property,
        propertyLabel,

        fromValue: fromResolved,
        toValue: normalizedTo,

        startTime,
        duration: Math.max(0.05, duration),
        easing
      });
    }

    this.state.steps = steps;
    this.state.stepCounter = maxStepId || steps.length;
    this.state.currentStepIndex = steps.length ? 0 : -1;
    this.state.editingStepIndex = null;

    this.state.stepGroupsDirty = true;

    this.renderSteps();
    this.updateTimeline();
    this.updateStepNavigation();
    this.updatePlayhead();
  }

  buildStartingSvgString() {
    // serialize current <svg> (mainCanvas) as string
    const svg = this.DOM.mainCanvas;
    if (!svg) return '';
    return svg.outerHTML;
  }

  buildSegmentsPayload() {
    // Convert UI steps to backend segments
    return this.state.steps.map((s) => {
      const toValue = this.isLengthProp(s.property) ? this.ensurePxIfLength(s.property, s.toValue) : s.toValue;

      return {
        step: s.id,
        element_id: s.elementUid, // using uid as element_id (matches your current mapping)
        element_selector: null,
        start_at: s.startTime,
        duration: s.duration,
        easing: this.sanitizeEasing(s.easing),
        animation_data: JSON.stringify({ [s.property]: toValue })
      };
    });
  }

  async handleSave() {
    try {
      const name = (this.DOM.projectName?.value || '').trim() || 'Untitled animation';
      const startingSvg = this.buildStartingSvgString();

      const animationSettings = JSON.stringify({
        fps: this.state.settings.fps,
        useOriginalViewBox: this.state.settings.useOriginalViewBox,
        viewBox: this.state.settings.viewBox,
        keepCentered: this.state.settings.keepCentered,
        canvasBgColor: this.state.settings.canvasBgColor,
        transparentBg: this.state.settings.transparentBg
      });

      const segments = this.buildSegmentsPayload();

      if (!startingSvg || !startingSvg.includes('<svg')) {
        this.showToast('error', 'Няма валиден SVG за запис.');
        return;
      }

      if (!this.state.animationId) {
        const res = await createAnimationRequest({
          name,
          starting_svg: startingSvg,
          animation_settings: animationSettings,
          animation_segments: segments
        });

        if (!res?.success || !res?.animation_id) {
          this.showToast('error', 'Неуспешно създаване на анимацията.');
          return;
        }

        this.state.animationId = Number(res.animation_id);
        this.setAnimationIdToUrl(this.state.animationId);
        this.state.hasUnsavedChanges = false;
        this.showToast('success', 'Анимацията е създадена и записана');
      } else {
        const res = await saveAnimationRequest({
          animationId: this.state.animationId,
          name,
          starting_svg: startingSvg,
          animation_settings: animationSettings,
          animation_segments: segments
        });

        if (!res?.success) {
          this.showToast('error', 'Неуспешен запис на анимацията.');
          return;
        }

        this.state.hasUnsavedChanges = false;
        this.showToast('success', 'Записано');
      }
    } catch (e) {
      console.error(e);
      this.showToast('error', 'Грешка при запис.');
    }
  }

  // ===========================
  // Settings/time UI
  // ===========================
  updateTotalTimeLabel() {
    const totalDuration = this.state.steps.reduce((max, step) => {
      const endTime = step.startTime + step.duration;
      return endTime > max ? endTime : max;
    }, 0);
    this.DOM.totalTime.textContent = this.formatTime(totalDuration);
  }

  // ===========================
  // Canvas background
  // ===========================
  applyCanvasStyles() {
    this.applyCanvasBackground();
  }

  // ===========================
  // Editor UI
  // ===========================
  formatStepTime(step) {
    const end = step.startTime + step.duration;
    return `${step.startTime.toFixed(2)}s - ${end.toFixed(2)}s`;
  }

  // ===========================
  // Timeline ruler values
  // ===========================
  secondsToPx(sec) {
    return sec * PX_PER_SECOND;
  }

  // ===========================
  // Element selection helpers
  // ===========================
  enableControlsIfSvgLoaded() {
    const loaded = !!this.state.svgContent;
    if (!loaded) return;

    this.DOM.targetElement.disabled = false;
  }

  // ===========================
  // Background apply
  // ===========================
  applyBg() {
    this.applyCanvasBackground();
  }

  // ===========================
  // Misc UI
  // ===========================
  updateCurrentTimeLabel(timeSeconds) {
    this.DOM.currentTime.textContent = this.formatTime(timeSeconds);
  }

  // ===========================
  // Default initialization when no project loaded
  // ===========================
  initEmpty() {
    this.resetForNewSvg();
  }

  // ===========================
  // Table/time formatting
  // ===========================
  formatSeconds(s) {
    return this.formatTime(s);
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  const app = new SvgAnimatorEditor();
  app.init();
});
