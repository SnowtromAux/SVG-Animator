import { ANIMATION_PROPERTIES } from '../../../constants/animation-properties.js';
import { DEFAULT_FPS, PX_PER_SECOND, MAX_SECONDS } from '../../../constants/default-settings.js';
import { isAnimatableNode } from '../../../utils/svg-animatable.js';

import {
  getAnimationRequest,
  createAnimationRequest,
  saveAnimationRequest
} from '../../../services/animations.js';

// ===== App =====
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

      // Drag state for timeline
      drag: {
        active: false,
        stepIndex: null,
        startPointerX: 0,
        startLeftPx: 0
      },

      // Settings
      settings: {
        fps: DEFAULT_FPS,
        useOriginalViewBox: true,
        viewBox: { minX: 0, minY: 0, width: 800, height: 600 },
        originalViewBox: null,
        keepCentered: true,
        canvasBgColor: '#0a0a12',
        transparentBg: false
      }
    };

    this.DOM = {};

    // bind methods used as listeners
    this.handleFileUpload = this.handleFileUpload.bind(this);
    this.refreshElementsTree = this.refreshElementsTree.bind(this);
    this.handleClose = this.handleClose.bind(this);
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

    // Timeline drag handlers
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

    // expose for inline onclick handlers
    window.editStep = (index) => this.editStep(index);
    window.deleteStep = (index) => this.deleteStep(index);

    // ✅ Load by URL param if exists
    const urlAnimId = this.getAnimationIdFromUrl();
    if (urlAnimId) {
      this.state.animationId = urlAnimId;
      this.loadAnimationById(urlAnimId);
    }
  }

  // ===== URL helpers =====
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

  // ===== Load animation from API =====
  async loadAnimationById(animationId) {
    try {
      const res = await getAnimationRequest({ animationId });

      if (!res?.success || !res.animation) {
        this.showToast('error', 'Неуспешно зареждане на анимацията.');
        return;
      }

      const anim = res.animation;

      // name
      if (anim.name) this.DOM.projectName.value = anim.name;

      // load SVG first (this also rebuilds elements tree)
      if (anim.starting_svg) {
        this.loadSVG(anim.starting_svg);
      } else {
        this.showToast('error', 'Анимацията няма starting_svg.');
        return;
      }

      // apply steps from backend segments
      if (Array.isArray(anim.animation_segments)) {
        this.applyLoadedAnimation(anim);
      }

      this.state.hasUnsavedChanges = false;
      this.showToast('success', 'Анимацията е заредена');
    } catch (e) {
      console.error(e);
      this.showToast('error', 'Грешка при зареждане на анимацията.');
    }
  }

  safeParseJson(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  // backend: animation_data може да има много пропъртита.
  // за момента: взимаме първото (както ти беше) – ако искаш split, кажи.
  extractPropertyAndToValue(animObj) {
    if (!animObj || typeof animObj !== 'object') return { property: null, toValue: null };
    const keys = Object.keys(animObj);
    if (!keys.length) return { property: null, toValue: null };
    const property = keys[0];
    return { property, toValue: animObj[property] };
  }

  // Convert backend animation -> UI steps
  applyLoadedAnimation(anim) {
    const segments = Array.isArray(anim.animation_segments) ? anim.animation_segments : [];
    const sorted = [...segments].sort((a, b) => (a.step ?? 0) - (b.step ?? 0));

    const steps = [];
    let maxStepId = 0;

    for (const seg of sorted) {
      let elementData = null;

      // 1) normal mapping (ако backend дава element_id / element_uid)
      const elementUid = Number(seg.element_id ?? seg.element_uid);
      if (!Number.isNaN(elementUid)) {
        elementData = this.state.elements.find((el) => el.uid === elementUid) || null;
      }

      // 2) optional selector mapping
      if (!elementData && seg.element_selector) {
        const node = this.DOM.mainCanvas.querySelector(seg.element_selector);
        if (node) elementData = this.state.elements.find((el) => el.element === node) || null;
      }

      // 3) fallback ако има точно 1 елемент
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

      // find label/type (best effort)
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

      steps.push({
        id: stepId || (steps.length + 1),

        elementPath: elementData.path,
        elementUid: elementData.uid,
        elementTag: elementData.tagName,
        elementId: elementData.id,

        property,
        propertyLabel,

        // FROM ще се резолвне live при playback, но за UI оставяме placeholder
        fromValue: this.getResolvedAttributeForInput(elementData.element, property, propMeta?.type || ''),
        toValue: String(toValue),

        startTime,
        duration: Math.max(0.05, duration),
        easing: seg.easing || 'linear'
      });
    }

    this.state.steps = steps;
    this.state.stepCounter = maxStepId || steps.length;
    this.state.currentStepIndex = steps.length ? 0 : -1;
    this.state.editingStepIndex = null;

    this.renderSteps();
    this.updateTimeline();
    this.updateStepNavigation();
    this.updatePlayhead();
  }

  // ===== DOM Cache =====
  cacheDOMElements() {
    const d = document;

    // Top bar
    this.DOM.projectName = d.getElementById('projectName');
    this.DOM.closeBtn = d.getElementById('closeBtn');
    this.DOM.saveBtn = d.getElementById('saveBtn');
    this.DOM.settingsBtn = d.getElementById('settingsBtn');
    this.DOM.exportBtn = d.getElementById('exportBtn');

    // Elements panel
    this.DOM.elementsTree = d.getElementById('elementsTree');
    this.DOM.refreshTree = d.getElementById('refreshTree');
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

    // Export modal
    this.DOM.exportModal = d.getElementById('exportModal');
    this.DOM.closeExportModal = d.getElementById('closeExportModal');
    this.DOM.exportVideoBtn = d.getElementById('exportVideoBtn');
    this.DOM.exportFramesBtn = d.getElementById('exportFramesBtn');
    this.DOM.exportProgress = d.getElementById('exportProgress');
    this.DOM.exportProgressFill = d.getElementById('exportProgressFill');
    this.DOM.exportProgressText = d.getElementById('exportProgressText');
  }

  // ===== Toasts =====
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

  // ===== Listeners =====
  setupEventListeners() {
    // File upload
    this.DOM.uploadSvgBtn.addEventListener('click', () => this.DOM.svgFileInput.click());
    this.DOM.svgFileInput.addEventListener('change', this.handleFileUpload);
    this.DOM.refreshTree.addEventListener('click', this.refreshElementsTree);

    // Top bar
    this.DOM.projectName.addEventListener('input', () => this.markAsChanged());
    this.DOM.closeBtn.addEventListener('click', this.handleClose);
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

    // Unsaved modal
    this.DOM.discardBtn.addEventListener('click', () => {
      this.hideModal(this.DOM.unsavedModal);
      window.location.href = 'my-projects';
    });
    this.DOM.saveAndCloseBtn.addEventListener('click', async () => {
      await this.handleSave();
      this.hideModal(this.DOM.unsavedModal);
      window.location.href = 'my-projects';
    });

    // Import URL modal
    this.DOM.importUrlBtn.addEventListener('click', () => this.showModal(this.DOM.importUrlModal));
    this.DOM.closeUrlModal.addEventListener('click', () => this.hideModal(this.DOM.importUrlModal));
    this.DOM.cancelUrlImport.addEventListener('click', () => this.hideModal(this.DOM.importUrlModal));
    this.DOM.confirmUrlImport.addEventListener('click', this.handleUrlImport);
    this.DOM.svgUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleUrlImport();
    });

    // Import Code modal
    this.DOM.importCodeBtn.addEventListener('click', () => this.showModal(this.DOM.importCodeModal));
    this.DOM.closeCodeModal.addEventListener('click', () => this.hideModal(this.DOM.importCodeModal));
    this.DOM.cancelCodeImport.addEventListener('click', () => this.hideModal(this.DOM.importCodeModal));
    this.DOM.confirmCodeImport.addEventListener('click', this.handleCodeImport);

    // Settings modal
    this.DOM.settingsBtn.addEventListener('click', this.openSettingsModal);
    this.DOM.closeSettingsModal.addEventListener('click', () => this.hideModal(this.DOM.settingsModal));
    this.DOM.applySettingsBtn.addEventListener('click', this.applySettings);
    this.DOM.resetSettingsBtn.addEventListener('click', this.resetSettings);

    // FPS options
    this.DOM.fpsOptions.forEach((option) => {
      option.addEventListener('click', () => {
        this.DOM.fpsOptions.forEach((o) => o.classList.remove('active'));
        option.classList.add('active');
        this.DOM.customFps.value = '';
      });
    });
    this.DOM.customFps.addEventListener('input', () => {
      if (this.DOM.customFps.value) {
        this.DOM.fpsOptions.forEach((o) => o.classList.remove('active'));
      }
    });

    // ViewBox checkbox
    this.DOM.useOriginalViewBox.addEventListener('change', () => {
      this.DOM.viewboxInputs.classList.toggle('disabled', this.DOM.useOriginalViewBox.checked);
    });

    // Color pickers sync
    this.DOM.canvasBgColor.addEventListener('input', () => {
      this.DOM.canvasBgColorText.value = this.DOM.canvasBgColor.value;
      this.DOM.transparentBgBtn.classList.remove('active');
    });

    this.DOM.canvasBgColorText.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(this.DOM.canvasBgColorText.value)) {
        this.DOM.canvasBgColor.value = this.DOM.canvasBgColorText.value;
      }
      this.DOM.transparentBgBtn.classList.remove('active');
    });

    this.DOM.transparentBgBtn.addEventListener('click', () => {
      this.DOM.transparentBgBtn.classList.toggle('active');
    });

    // Timeline resize handle
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
        const dy = startY - ev.clientY; // drag up => bigger
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

    // Export modal
    this.DOM.exportBtn.addEventListener('click', () => this.showModal(this.DOM.exportModal));
    this.DOM.closeExportModal.addEventListener('click', () => this.hideModal(this.DOM.exportModal));
    this.DOM.exportVideoBtn.addEventListener('click', this.handleExportVideo);
    this.DOM.exportFramesBtn.addEventListener('click', this.handleExportFrames);

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown);
  }

  // ===== Utility: lock/unlock editor while playing =====
  setEditorLocked(isLocked) {
    this.state.isEditorLocked = !!isLocked;

    // Disable add/edit form
    this.DOM.targetElement.disabled = isLocked;
    this.DOM.animationType.disabled = isLocked || !this.DOM.targetElement.value;
    this.DOM.animationStartTime.disabled = isLocked;
    this.DOM.animationDuration.disabled = isLocked;
    this.DOM.animationEasing.disabled = isLocked;

    // button enabled only when type selected and not locked
    this.DOM.addAnimationBtn.disabled = isLocked || !this.DOM.animationType.value;

    // Disable step action buttons (rendered after renderSteps)
    this.DOM.stepsList.querySelectorAll('.step-action-btn').forEach((btn) => {
      btn.disabled = isLocked;
      btn.style.pointerEvents = isLocked ? 'none' : '';
      btn.style.opacity = isLocked ? '0.5' : '';
    });
  }

  // ===== File Upload =====
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

  // ===== URL Import =====
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

  // ===== Code Import =====
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

  // ===== Reset all editor state on new SVG =====
  resetForNewSvg() {
    // stop playback if running
    if (this.state.isPlaying) this.stopPlayback();

    // reset steps/timeline
    this.state.steps = [];
    this.state.currentStepIndex = -1;
    this.state.editingStepIndex = null;
    this.state.stepCounter = 0;

    this.state.currentFrame = 0;
    this.state.totalFrames = 0;

    // reset selections/UI
    this.state.selectedElement = null;

    this.DOM.targetElement.innerHTML = '<option value="">Изберете елемент</option>';
    this.DOM.targetElement.value = '';
    this.DOM.targetElement.disabled = true;

    this.DOM.animationType.innerHTML = '<option value="">Изберете анимация</option>';
    this.DOM.animationType.value = '';
    this.DOM.animationType.disabled = true;

    this.DOM.animationValues.style.display = 'none';
    this.DOM.valueInputs.innerHTML = '';
    this.DOM.addAnimationBtn.disabled = true;
    this.DOM.addAnimationBtn.textContent = 'Добави стъпка';

    this.DOM.animationStartTime.value = 0;
    this.DOM.animationDuration.value = 1;
    this.DOM.animationEasing.value = 'ease-in-out';

    // reset visuals
    this.renderSteps();
    this.updateTimeline();
    this.updateStepNavigation();
    this.updatePlayhead();

    // unlock editor (will be re-enabled after load)
    this.setEditorLocked(false);
  }

  // ===== Load SVG =====
  loadSVG(svgString) {
    // reset state when switching SVG
    this.resetForNewSvg();

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    if (!svgElement) {
      this.showToast('error', 'Невалиден SVG файл.');
      return;
    }

    // Store SVG content (original document element)
    this.state.svgContent = svgElement;

    // Store original viewBox
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
        }
      }
    }

    // Display SVG in canvas
    this.DOM.mainCanvas.innerHTML = svgElement.innerHTML;

    // Copy attributes
    Array.from(svgElement.attributes).forEach((attr) => {
      if (attr.name !== 'xmlns') {
        this.DOM.mainCanvas.setAttribute(attr.name, attr.value);
      }
    });

    // Apply viewBox + background
    this.applyViewBox();
    this.applyCanvasBackground();

    // Show canvas, hide placeholder
    this.DOM.canvasPlaceholder.style.display = 'none';
    this.DOM.mainCanvas.style.display = 'block';

    // Build elements tree (animatable only)
    this.buildElementsTree();

    // Enable controls
    this.enableAddPanel();

    // Update UI
    this.updateFpsDisplay();
    this.updateTimeline();

    this.showToast('success', 'SVG е зареден');
  }

  // ===== Elements Tree =====
  buildElementsTree() {
    this.state.elements = [];
    this.state.elementCounter = 0;
    this.DOM.elementsTree.innerHTML = '';

    const svgElement = this.DOM.mainCanvas;
    const treeHTML = this.buildTreeHTML(svgElement, 0);
    this.DOM.elementsTree.innerHTML = treeHTML;

    // Click handlers
    this.DOM.elementsTree.querySelectorAll('.tree-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectElement(item.dataset.path);
      });

      item.addEventListener('mouseenter', () => this.highlightElement(item.dataset.path, true));
      item.addEventListener('mouseleave', () => this.highlightElement(item.dataset.path, false));
    });

    // Toggle handlers
    this.DOM.elementsTree.querySelectorAll('.tree-toggle').forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTreeItem(toggle);
      });
    });

    // Populate select
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

  highlightElement(path, isHovering) {
    const elementData = this.state.elements.find((el) => el.path === path);
    if (!elementData || !elementData.element) return;

    const element = elementData.element;

    if (isHovering) {
      element.classList.add('svg-element-highlight');

      element._originalOutline = element.style.outline;
      element._originalOutlineOffset = element.style.outlineOffset;

      element.style.outline = '2px solid rgba(99, 102, 241, 0.8)';
      element.style.outlineOffset = '2px';
    } else {
      element.classList.remove('svg-element-highlight');
      element.style.outline = element._originalOutline || '';
      element.style.outlineOffset = element._originalOutlineOffset || '';
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

  // ===== Add Animation Panel =====
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

  // --- Color helpers (resolve url(#gradient) -> actual color)
  clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

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

    // named colors / other: try browser to resolve
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

    // linearGradient / radialGradient
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

    // If fill/stroke is url(#...), try convert to first stop color
    if (typeof currentValue === 'string' && currentValue.trim().startsWith('url(')) {
      const resolved = this.resolvePaintUrlToHex(currentValue.trim());
      if (resolved) currentValue = resolved;
    }

    // If it is a color in rgb(), convert to hex for UI
    if (propType === 'color') {
      const hex = this.parseCssColorToHex(currentValue);
      if (hex) currentValue = hex;
      if (!currentValue) currentValue = '#000000';
    }

    return currentValue;
  }

  // --- Build inputs: "От" is locked (always taken from SVG attribute), user edits only "До"
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

    // We always render FROM + TO, but FROM is disabled (locked)
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
      // numeric/text
      const inputType = prop.type === 'range' ? 'number' : prop.type;

      const fromRow = document.createElement('div');
      fromRow.className = 'value-input-row';
      fromRow.innerHTML = `
        <label>От:</label>
        <input
          type="${inputType}"
          id="valueFrom"
          value="${currentValue}"
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

  // Add or update step (editing mode supported)
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

    // Always re-take FROM from SVG attribute at the moment of saving
    const resolvedFrom = this.getResolvedAttributeForInput(this.state.selectedElement.element, propName, propType);

    // If To empty -> error
    if (!String(toInput.value || '').trim()) {
      this.showToast('error', 'Моля, въведете стойност за "До".');
      return;
    }

    const stepObj = {
      id: 0,
      elementPath: this.state.selectedElement.path,
      elementUid: this.state.selectedElement.uid,
      elementTag: this.state.selectedElement.tagName,
      elementId: this.state.selectedElement.id,
      property: propName,
      propertyLabel: this.DOM.animationType.options[this.DOM.animationType.selectedIndex].text,
      fromValue: resolvedFrom,
      toValue: toInput.value,
      startTime: parseFloat(this.DOM.animationStartTime.value) || 0,
      duration: parseFloat(this.DOM.animationDuration.value) || 1,
      easing: this.DOM.animationEasing.value
    };

    // clamp times
    stepObj.startTime = this.clamp(stepObj.startTime, 0, MAX_SECONDS);
    stepObj.duration = this.clamp(stepObj.duration, 0.05, MAX_SECONDS);

    if (this.state.editingStepIndex !== null && this.state.editingStepIndex >= 0) {
      // Update existing
      const idx = this.state.editingStepIndex;
      const existing = this.state.steps[idx];
      if (!existing) return;

      stepObj.id = existing.id; // keep id stable
      this.state.steps[idx] = stepObj;
      this.state.currentStepIndex = idx;
      this.state.editingStepIndex = null;

      this.DOM.addAnimationBtn.textContent = 'Добави стъпка';
      this.showToast('success', 'Стъпката е обновена');
    } else {
      // New step
      this.state.stepCounter = (this.state.stepCounter || 0) + 1;
      stepObj.id = this.state.stepCounter;

      this.state.steps.push(stepObj);
      this.state.currentStepIndex = this.state.steps.length - 1;

      this.showToast('success', 'Стъпката е добавена');
    }

    this.markAsChanged();
    this.renderSteps();
    this.updateTimeline();
    this.updateStepNavigation();

    // reset (keep selected element)
    this.DOM.animationType.value = '';
    this.DOM.animationValues.style.display = 'none';
    this.DOM.valueInputs.innerHTML = '';
    this.DOM.addAnimationBtn.disabled = true;
  }

  // ===== Steps =====
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
                  <button class="step-action-btn edit" title="Редактирай" onclick="editStep(${index})">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M10.5 1.5L12.5 3.5L4 12H2V10L10.5 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button class="step-action-btn delete" title="Изтрий" onclick="deleteStep(${index})">
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

    // re-apply lock state after re-render
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

    // select element
    this.DOM.targetElement.value = step.elementPath;
    this.handleElementSelect();

    // set editing mode
    this.state.editingStepIndex = index;
    this.state.currentStepIndex = index;

    // fill timing/easing
    this.DOM.animationStartTime.value = step.startTime;
    this.DOM.animationDuration.value = step.duration;
    this.DOM.animationEasing.value = step.easing;

    // select animation prop & rebuild inputs
    setTimeout(() => {
      this.DOM.animationType.value = step.property;
      this.handleAnimationTypeSelect();

      // Now set only TO (FROM is locked and auto-resolved by handleAnimationTypeSelect)
      setTimeout(() => {
        const toInput = document.getElementById('valueTo');
        if (toInput) toInput.value = step.toValue;

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

  // ===== Timeline =====
  generateTimelineRuler() {
    let html = '';
    for (let i = 0; i <= MAX_SECONDS; i++) {
      html += `<div class="ruler-mark ${i % 5 === 0 ? 'major' : ''}">${i}s</div>`;
    }
    this.DOM.timelineRuler.innerHTML = html;
  }

  updateTimeline() {
    const totalDuration = this.state.steps.reduce((max, step) => {
      const endTime = step.startTime + step.duration;
      return endTime > max ? endTime : max;
    }, 0);

    this.state.totalFrames = Math.ceil(totalDuration * this.state.settings.fps) || 0;
    this.DOM.totalTime.textContent = this.formatTime(totalDuration);

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

    // Attach drag handlers to blocks
    this.DOM.timelineTracks.querySelectorAll('.frame-block').forEach((block) => {
      block.addEventListener('pointerdown', this.onTimelinePointerDown);
    });

    // Ensure playhead position is consistent after updates
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

    // Start drag
    this.state.drag.active = true;
    this.state.drag.stepIndex = stepIndex;
    this.state.drag.startPointerX = e.clientX;

    const rect = block.getBoundingClientRect();
    const parentRect = this.DOM.timelineTracks.getBoundingClientRect();
    const currentLeft = rect.left - parentRect.left + this.DOM.timelineWrapper.scrollLeft;
    this.state.drag.startLeftPx = currentLeft;

    block.classList.add('dragging');

    // capture pointer
    block.setPointerCapture?.(e.pointerId);

    document.addEventListener('pointermove', this.onTimelinePointerMove);
    document.addEventListener('pointerup', this.onTimelinePointerUp);
  }

  onTimelinePointerMove(e) {
    if (!this.state.drag.active) return;
    const idx = this.state.drag.stepIndex;
    const step = this.state.steps[idx];
    if (!step) return;

    const dx = e.clientX - this.state.drag.startPointerX;
    let newLeft = this.state.drag.startLeftPx + dx;

    // clamp to 0..MAX_SECONDS
    const minLeft = 0;
    const maxLeft = MAX_SECONDS * PX_PER_SECOND;
    newLeft = this.clamp(newLeft, minLeft, maxLeft);

    // convert to time
    const newStartTime = this.clamp(newLeft / PX_PER_SECOND, 0, MAX_SECONDS);
    step.startTime = Math.round(newStartTime * 10) / 10; // 0.1s snap

    // update UI quickly without full rebuild
    const block = this.DOM.timelineTracks.querySelector(`.frame-block[data-step="${idx}"]`);
    if (block) {
      block.style.left = `${step.startTime * PX_PER_SECOND}px`;
    }

    // Update steps table time live
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

    // after drag end, rebuild timeline to ensure selection visuals and totals
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

  // ===== Playback =====
  togglePlayback() {
    if (this.state.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
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

    this.state.totalFrames = Math.ceil(totalDuration * this.state.settings.fps) || 1;

    const frameDuration = 1000 / this.state.settings.fps;
    let startTime = performance.now() - this.state.currentFrame * frameDuration;

    const animate = (currentTime) => {
      if (!this.state.isPlaying) return;

      const elapsedMs = currentTime - startTime;
      this.state.currentFrame = Math.floor(elapsedMs / frameDuration);

      if (this.state.currentFrame >= this.state.totalFrames) {
        this.state.currentFrame = 0;
        startTime = currentTime;
      }

      const t = this.state.currentFrame / this.state.settings.fps;
      this.updatePlayhead();
      this.applyAnimations(t);

      this.state.animationId = requestAnimationFrame(animate);
    };

    this.state.animationId = requestAnimationFrame(animate);
  }

  stopPlayback() {
    this.state.isPlaying = false;
    this.DOM.playPause.classList.remove('playing');

    if (this.state.animationId) {
      cancelAnimationFrame(this.state.animationId);
      this.state.animationId = null;
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

  updatePlayhead() {
    const time = this.state.settings.fps ? this.state.currentFrame / this.state.settings.fps : 0;
    const position = time * PX_PER_SECOND;

    this.DOM.playhead.style.left = `${position}px`;
    this.DOM.currentTime.textContent = this.formatTime(time);
  }

  // ===== Smooth interpolation helpers =====
  parseNumberWithUnit(v) {
    const s = String(v ?? '').trim();
    const m = s.match(/^(-?\d+(\.\d+)?)([a-z%]*)$/i);
    if (!m) return null;
    return { num: parseFloat(m[1]), unit: m[3] || '' };
  }

  interpolateNumberWithUnit(from, to, progress) {
    const a = this.parseNumberWithUnit(from);
    const b = this.parseNumberWithUnit(to);
    if (!a || !b) return null;
    if (a.unit !== b.unit) return null;
    const value = a.num + (b.num - a.num) * progress;
    return `${value}${a.unit}`;
  }

  applyAnimations(currentTime) {
    if (this.state.steps.length === 0) return;

    for (const step of this.state.steps) {
      const stepStart = step.startTime;
      const stepEnd = stepStart + step.duration;

      const elementData = this.state.elements.find((el) => el.path === step.elementPath);
      if (!elementData) continue;

      if (currentTime >= stepStart && currentTime < stepEnd) {
        const progress = (currentTime - stepStart) / step.duration;
        const eased = this.applyEasing(progress, step.easing);

        // ensure FROM stays correct if SVG attr changed externally
        const tagName = elementData.tagName;
        const props = ANIMATION_PROPERTIES[tagName] || ANIMATION_PROPERTIES.default;
        const meta = props.properties.find((p) => p.name === step.property);
        const propType = meta?.type || '';

        const liveFrom = this.getResolvedAttributeForInput(elementData.element, step.property, propType) || step.fromValue;
        this.interpolateValue(elementData.element, step.property, liveFrom, step.toValue, eased);
      } else if (currentTime >= stepEnd) {
        elementData.element.setAttribute(step.property, step.toValue);
      } else {
        elementData.element.setAttribute(step.property, step.fromValue);
      }
    }
  }

  interpolateValue(element, property, from, to, progress) {
    // numeric (including units)
    const numWithUnit = this.interpolateNumberWithUnit(from, to, progress);
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
      element.setAttribute(property, value);
      return;
    }

    // colors
    const fromHex = this.parseCssColorToHex(from) || this.resolvePaintUrlToHex(from) || '';
    const toHex = this.parseCssColorToHex(to) || this.resolvePaintUrlToHex(to) || '';

    if (fromHex && toHex) {
      element.setAttribute(property, this.interpolateColor(fromHex, toHex, progress));
      return;
    }

    // fallback discrete
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

  applyEasing(t, easing) {
    switch (easing) {
      case 'linear':
        return t;
      case 'ease':
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return 1 - (1 - t) * (1 - t);
      case 'cubic-bezier(0.68, -0.55, 0.265, 1.55)': // Elastic
        return t < 0.5
          ? (Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2
          : (2 - Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2;
      case 'cubic-bezier(0.175, 0.885, 0.98, 0.335)': // Back
        {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c3 + 1) * 2 * t - c3)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c3 + 1) * (t * 2 - 2) + c3) + 2) / 2;
        }
      case 'cubic-bezier(0.6, 0.04, 0.98, 0.335)': // Expo
        return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
      default:
        return t;
    }
  }

  // ===== Zoom =====
  setZoom(value) {
    this.state.zoom = Math.max(25, Math.min(200, value));
    this.DOM.zoomLevel.textContent = `${this.state.zoom}%`;
    this.DOM.mainCanvas.style.transform = `scale(${this.state.zoom / 100})`;
  }

  // ===== Settings =====
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
    this.DOM.viewboxInputs.classList.toggle('disabled', this.state.settings.useOriginalViewBox);

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
    let newFps = 30;
    const activeOption = document.querySelector('.fps-option.active');

    if (activeOption) {
      newFps = parseInt(activeOption.dataset.fps, 10);
    } else if (this.DOM.customFps.value) {
      newFps = Math.max(1, Math.min(120, parseInt(this.DOM.customFps.value, 10) || 30));
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
      fps: 30,
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

  applyViewBox() {
    if (!this.DOM.mainCanvas || this.DOM.mainCanvas.style.display === 'none') return;
    const { minX, minY, width, height } = this.state.settings.viewBox;
    this.DOM.mainCanvas.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
  }

  applyCanvasBackground() {
    const container = this.DOM.canvasContainer;

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

  centerSvgContent(oldViewBox, newViewBox) {
    const offsetX = (newViewBox.width - oldViewBox.width) / 2;
    const offsetY = (newViewBox.height - oldViewBox.height) / 2;

    this.state.elements.forEach(({ element }) => {
      if (!element) return;

      const tagName = element.tagName.toLowerCase();

      switch (tagName) {
        case 'rect':
        case 'text':
        case 'image':
          this.adjustAttribute(element, 'x', offsetX);
          this.adjustAttribute(element, 'y', offsetY);
          break;
        case 'circle':
        case 'ellipse':
          this.adjustAttribute(element, 'cx', offsetX);
          this.adjustAttribute(element, 'cy', offsetY);
          break;
        case 'line':
          this.adjustAttribute(element, 'x1', offsetX);
          this.adjustAttribute(element, 'y1', offsetY);
          this.adjustAttribute(element, 'x2', offsetX);
          this.adjustAttribute(element, 'y2', offsetY);
          break;
        case 'path':
        case 'polygon':
        case 'polyline':
        case 'g':
          this.adjustTransform(element, offsetX, offsetY);
          break;
      }
    });
  }

  adjustAttribute(element, attr, offset) {
    const current = parseFloat(element.getAttribute(attr)) || 0;
    element.setAttribute(attr, current + offset);
  }

  adjustTransform(element, offsetX, offsetY) {
    const currentTransform = element.getAttribute('transform') || '';
    const newTranslate = `translate(${offsetX}, ${offsetY})`;

    if (currentTransform) {
      element.setAttribute('transform', `${newTranslate} ${currentTransform}`);
    } else {
      element.setAttribute('transform', newTranslate);
    }
  }

  // ===== Save / Close =====
  markAsChanged() {
    this.state.hasUnsavedChanges = true;
  }

  // CREATE settings payload shape (както искаш)
  buildCreateSettingsPayload() {
    const s = this.state.settings;
    return {
      fps: s.fps,
      viewbox: {
        original: !!s.useOriginalViewBox,
        minX: s.viewBox.minX,
        minY: s.viewBox.minY,
        width: s.viewBox.width,
        height: s.viewBox.height
      },
      "center-positioning": !!s.keepCentered,
      "canvas-background": s.transparentBg ? "transparent" : s.canvasBgColor
    };
  }

  // steps -> backend segments
  buildSaveSegmentsPayload() {
    return this.state.steps.map((step, idx) => {
      const animObj = { [step.property]: step.toValue };
      const start = Number(step.startTime) || 0;
      const dur = Number(step.duration) || 0;

      return {
        step: step.id ?? (idx + 1),
        element_id: step.elementUid ?? null,
        animation_data: JSON.stringify(animObj),
        easing: step.easing || 'linear',
        duration: dur,
        start_at: start,
        end_at: start + dur
      };
    });
  }

  async handleSave() {
    try {
      const svgText = this.DOM.mainCanvas?.outerHTML || '';
      if (!svgText || this.DOM.mainCanvas.style.display === 'none') {
        this.showToast('error', 'Няма зареден SVG за запазване.');
        return;
      }

      // 1) Ако няма animationId -> CREATE
      if (!this.state.animationId) {
        const createRes = await createAnimationRequest({
          name: this.DOM.projectName.value || 'Untitled',
          svgText,
          settings: this.buildCreateSettingsPayload()
        });

        if (!createRes?.success || !createRes?.id) {
          this.showToast('error', 'Неуспешно създаване на анимацията');
          return;
        }

        this.state.animationId = Number(createRes.id);
        this.setAnimationIdToUrl(this.state.animationId);
        this.showToast('success', 'Анимацията е създадена');
      }

      // 2) SAVE (PUT)
      const savePayload = {
        animation_id: this.state.animationId,
        animation_name: this.DOM.projectName.value || 'Untitled',
        animation_settings: JSON.stringify(this.state.settings),
        animation_segments: this.buildSaveSegmentsPayload()
      };

      const saveRes = await saveAnimationRequest(savePayload);

      if (!saveRes?.success) {
        this.showToast('error', 'Грешка при запазване.');
        return;
      }

      this.state.hasUnsavedChanges = false;

      this.showToast('success', 'Запаметено успешно');

      this.DOM.saveBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M16.6667 5L7.5 14.1667L3.33333 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Запазено!</span>
      `;

      setTimeout(() => {
        this.DOM.saveBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15.8333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H13.3333L17.5 6.66667V15.8333C17.5 16.2754 17.3244 16.6993 17.0118 17.0118C16.6993 17.3244 16.2754 17.5 15.8333 17.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14.1667 17.5V10.8333H5.83333V17.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5.83333 2.5V6.66667H12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Запази</span>
        `;
      }, 2000);
    } catch (e) {
      console.error(e);
      this.showToast('error', 'Грешка при запазване.');
    }
  }

  handleClose() {
    if (this.state.hasUnsavedChanges) {
      this.showModal(this.DOM.unsavedModal);
    } else {
      window.location.href = 'my-projects';
    }
  }

  showModal(modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
  }

  hideModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => (modal.style.display = 'none'), 300);
  }

  // ===== Keyboard =====
  handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        this.togglePlayback();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.seekToFrame(this.state.currentFrame - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.seekToFrame(this.state.currentFrame + 1);
        break;
      case 's':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.handleSave();
        }
        break;
      case 'Home':
        e.preventDefault();
        this.seekToFrame(0);
        break;
      case 'End':
        e.preventDefault();
        this.seekToFrame(this.state.totalFrames - 1);
        break;
    }
  }

  // ===== Export helpers =====
  // ✅ NEW: export-safe SVG root (correct viewBox + size + xmlns + preserveAspectRatio + optional background)
  getExportSvgString(exportWidth, exportHeight) {
    const vb = this.state.settings?.viewBox || { minX: 0, minY: 0, width: 800, height: 600 };

    const clone = this.DOM.mainCanvas.cloneNode(true);
    clone.removeAttribute('style');

    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(exportWidth));
    clone.setAttribute('height', String(exportHeight));
    clone.setAttribute('viewBox', `${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`);
    clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    if (!this.state.settings.transparentBg) {
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', vb.minX);
      bg.setAttribute('y', vb.minY);
      bg.setAttribute('width', vb.width);
      bg.setAttribute('height', vb.height);
      bg.setAttribute('fill', this.state.settings.canvasBgColor || '#0a0a12');
      clone.insertBefore(bg, clone.firstChild);
    }

    return new XMLSerializer().serializeToString(clone);
  }

  // ===== Export =====
  // ✅ UPDATED: correct duration + full SVG shown (canvas matches viewBox)
  async handleExportVideo() {
    if (this.state.steps.length === 0) {
      this.showToast('error', 'Няма стъпки за експортиране.');
      return;
    }

    this.DOM.exportProgress.style.display = 'flex';
    this.DOM.exportProgressFill.style.width = '0%';
    this.DOM.exportProgressText.textContent = '0%';

    try {
      const fps = this.state.settings.fps;
      const frameDurationMs = 1000 / fps;

      const vb = this.state.settings?.viewBox || { minX: 0, minY: 0, width: 800, height: 600 };
      const exportW = Math.max(1, Math.round(vb.width || 800));
      const exportH = Math.max(1, Math.round(vb.height || 600));

      const canvas = document.createElement('canvas');
      canvas.width = exportW;
      canvas.height = exportH;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm'
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const totalDuration = this.state.steps.reduce((max, step) => Math.max(max, step.startTime + step.duration), 0);
      const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));

      mediaRecorder.start();

      const track = stream.getVideoTracks?.()[0];
      const requestFrame =
        track && typeof track.requestFrame === 'function' ? () => track.requestFrame() : null;

      for (let frame = 0; frame < totalFrames; frame++) {
        const currentTime = frame / fps;
        this.applyAnimations(currentTime);

        const svgData = this.getExportSvgString(exportW, exportH);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve) => {
          img.onload = () => {
            ctx.clearRect(0, 0, exportW, exportH);
            ctx.drawImage(img, 0, 0, exportW, exportH);
            if (requestFrame) requestFrame();
            resolve();
          };
          img.onerror = () => resolve();
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        });

        const progress = Math.round(((frame + 1) / totalFrames) * 100);
        this.DOM.exportProgressFill.style.width = `${progress}%`;
        this.DOM.exportProgressText.textContent = `${progress}%`;

        // ✅ real-time pacing => correct duration
        await new Promise((r) => setTimeout(r, frameDurationMs));
      }

      await new Promise((r) => setTimeout(r, frameDurationMs));

      mediaRecorder.stop();
      await new Promise((resolve) => {
        mediaRecorder.onstop = resolve;
      });

      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.DOM.projectName.value || 'animation'}.webm`;
      a.click();

      URL.revokeObjectURL(url);

      this.DOM.exportProgressFill.style.width = '100%';
      this.DOM.exportProgressText.textContent = '100%';

      setTimeout(() => {
        this.DOM.exportProgress.style.display = 'none';
        this.hideModal(this.DOM.exportModal);
      }, 700);

      this.showToast('success', 'Експортът е готов');
    } catch (err) {
      console.error(err);
      this.showToast('error', 'Грешка при експортирането на видео.');
      this.DOM.exportProgress.style.display = 'none';
    }
  }

  async handleExportFrames() {
    if (this.state.steps.length === 0) {
      this.showToast('error', 'Няма стъпки за експортиране.');
      return;
    }

    this.DOM.exportProgress.style.display = 'flex';
    this.DOM.exportProgressFill.style.width = '0%';
    this.DOM.exportProgressText.textContent = '0%';

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      const totalDuration = this.state.steps.reduce((max, step) => Math.max(max, step.startTime + step.duration), 0);
      const totalFrames = Math.ceil(totalDuration * this.state.settings.fps);

      const frames = [];

      for (let frame = 0; frame <= totalFrames; frame++) {
        const currentTime = frame / this.state.settings.fps;
        this.applyAnimations(currentTime);

        const svgData = new XMLSerializer().serializeToString(this.DOM.mainCanvas);
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve) => {
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
              (blob) => {
                frames.push({ name: `frame_${String(frame).padStart(5, '0')}.png`, blob });
                resolve();
              },
              'image/png',
              1
            );
          };
          img.onerror = resolve;
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        });

        const progress = Math.round((frame / totalFrames) * 100);
        this.DOM.exportProgressFill.style.width = `${progress}%`;
        this.DOM.exportProgressText.textContent = `${progress}%`;

        await new Promise((r) => setTimeout(r, 1));
      }

      for (const frame of frames) {
        const url = URL.createObjectURL(frame.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = frame.name;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 30));
      }

      this.DOM.exportProgressFill.style.width = '100%';
      this.DOM.exportProgressText.textContent = '100%';

      setTimeout(() => {
        this.DOM.exportProgress.style.display = 'none';
        this.hideModal(this.DOM.exportModal);
      }, 1000);

      this.showToast('success', 'Кадрите са експортирани');
    } catch {
      this.showToast('error', 'Грешка при експортирането на кадри.');
      this.DOM.exportProgress.style.display = 'none';
    }
  }
}

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => {
  const app = new SvgAnimatorEditor();
  app.init();
});
