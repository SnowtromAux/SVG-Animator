const sampleProjects = [
  {
    id: 1,
    name: 'Анимирано лого',
    image: '',
    fps: 60,
    duration: '3.5s',
    createdAt: '2024-01-15',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '1920x1080' },
      { name: 'Кадри', value: '210' },
      { name: 'Файлов размер', value: '45 KB' },
      { name: 'Easing', value: 'ease-in-out' },
      { name: 'Цикличност', value: 'Да' }
    ]
  },
  {
    id: 2,
    name: 'Loading спинер',
    image: '',
    fps: 30,
    duration: '2s',
    createdAt: '2024-01-14',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '200x200' },
      { name: 'Кадри', value: '60' },
      { name: 'Файлов размер', value: '12 KB' },
      { name: 'Easing', value: 'linear' },
      { name: 'Цикличност', value: 'Да' }
    ]
  },
  {
    id: 3,
    name: 'Иконка меню',
    image: '',
    fps: 60,
    duration: '0.5s',
    createdAt: '2024-01-13',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '24x24' },
      { name: 'Кадри', value: '30' },
      { name: 'Файлов размер', value: '8 KB' },
      { name: 'Easing', value: 'cubic-bezier' },
      { name: 'Цикличност', value: 'Не' }
    ]
  },
  {
    id: 4,
    name: 'Вълнова анимация',
    image: '',
    fps: 60,
    duration: '4s',
    createdAt: '2024-01-12',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '1920x400' },
      { name: 'Кадри', value: '240' },
      { name: 'Файлов размер', value: '28 KB' },
      { name: 'Easing', value: 'sine' },
      { name: 'Цикличност', value: 'Да' }
    ]
  },
  {
    id: 5,
    name: 'Прогрес бар',
    image: '',
    fps: 30,
    duration: '1.5s',
    createdAt: '2024-01-11',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '400x20' },
      { name: 'Кадри', value: '45' },
      { name: 'Файлов размер', value: '6 KB' },
      { name: 'Easing', value: 'ease-out' },
      { name: 'Цикличност', value: 'Не' }
    ]
  },
  {
    id: 6,
    name: 'Пулсиращ бутон',
    image: '',
    fps: 60,
    duration: '2s',
    createdAt: '2024-01-10',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '200x60' },
      { name: 'Кадри', value: '120' },
      { name: 'Файлов размер', value: '15 KB' },
      { name: 'Easing', value: 'ease-in-out' },
      { name: 'Цикличност', value: 'Да' }
    ]
  },
  {
    id: 7,
    name: 'Летящи частици',
    image: '',
    fps: 60,
    duration: '5s',
    createdAt: '2024-01-09',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '1920x1080' },
      { name: 'Кадри', value: '300' },
      { name: 'Файлов размер', value: '85 KB' },
      { name: 'Easing', value: 'linear' },
      { name: 'Цикличност', value: 'Да' }
    ]
  },
  {
    id: 8,
    name: 'Морфинг форми',
    image: '',
    fps: 60,
    duration: '3s',
    createdAt: '2024-01-08',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '400x400' },
      { name: 'Кадри', value: '180' },
      { name: 'Файлов размер', value: '32 KB' },
      { name: 'Easing', value: 'ease-in-out' },
      { name: 'Цикличност', value: 'Да' }
    ]
  },
  {
    id: 9,
    name: 'Текстов ефект',
    image: '',
    fps: 30,
    duration: '2.5s',
    createdAt: '2024-01-07',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '600x100' },
      { name: 'Кадри', value: '75' },
      { name: 'Файлов размер', value: '18 KB' },
      { name: 'Easing', value: 'cubic-bezier' },
      { name: 'Цикличност', value: 'Не' }
    ]
  },
  {
    id: 10,
    name: 'Инфографика',
    image: '',
    fps: 60,
    duration: '4s',
    createdAt: '2024-01-06',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '800x600' },
      { name: 'Кадри', value: '240' },
      { name: 'Файлов размер', value: '56 KB' },
      { name: 'Easing', value: 'ease-out' },
      { name: 'Цикличност', value: 'Не' }
    ]
  },
  {
    id: 11,
    name: 'Социална икона',
    image: '',
    fps: 60,
    duration: '1s',
    createdAt: '2024-01-05',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '48x48' },
      { name: 'Кадри', value: '60' },
      { name: 'Файлов размер', value: '10 KB' },
      { name: 'Easing', value: 'spring' },
      { name: 'Цикличност', value: 'Не' }
    ]
  },
  {
    id: 12,
    name: 'Hero анимация',
    image: '',
    fps: 60,
    duration: '6s',
    createdAt: '2024-01-04',
    info: [
      { name: 'Формат', value: 'SVG' },
      { name: 'Размер', value: '1920x800' },
      { name: 'Кадри', value: '360' },
      { name: 'Файлов размер', value: '120 KB' },
      { name: 'Easing', value: 'ease-in-out' },
      { name: 'Цикличност', value: 'Да' }
    ]
  }
];

class ProjectsDashboard {
  constructor() {
    this.projects = [...sampleProjects];
    this.filteredProjects = [...this.projects];
    this.currentPage = 1;
    this.projectsPerPage = 6;

    this.init();
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.renderProjects();
    this.renderPagination();
    this.initParticles();
  }

  cacheElements() {
    this.projectsGrid = document.getElementById('projectsGrid');
    this.emptyState = document.getElementById('emptyState');
    this.pagination = document.getElementById('pagination');
    this.paginationNumbers = document.getElementById('paginationNumbers');
    this.prevPageBtn = document.getElementById('prevPage');
    this.nextPageBtn = document.getElementById('nextPage');
    this.searchInput = document.getElementById('searchInput');
    this.createNewBtn = document.getElementById('createNewBtn');
  }

  bindEvents() {
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

    this.prevPageBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderProjects();
        this.renderPagination();
      }
    });

    this.nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(this.filteredProjects.length / this.projectsPerPage);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.renderProjects();
        this.renderPagination();
      }
    });

    // ✅ Нов проект -> DynamicFormModal (конфиг от project.html)
    this.createNewBtn.addEventListener('click', () => {
      this.openNewProjectModal();
    });
  }

  // ✅ Четем конфигурацията от project.html (script#newProjectModalConfig)
  getNewProjectModalConfig() {
    const el = document.getElementById('newProjectModalConfig');
    if (!el) return null;

    try {
      const raw = el.textContent || el.innerText || '';
      return JSON.parse(raw);
    } catch (e) {
      console.error('Невалиден JSON в #newProjectModalConfig', e);
      return null;
    }
  }

  // ✅ Превръщаме buttons от HTML (action-based) в реални handlers (onClick functions)
  buildButtonsFromHtmlConfig(buttonDefs = []) {
    const actionMap = {
      close: (_values, api, _btnDef) => api.close(),

      create: (values, api, btnDef) => {
        const storageKey = btnDef.storageKey || 'newProjectDraft';
        const redirect = btnDef.redirect || '/dashboard/create.html';

        // Слагаме values, за да ги ползваш в create.html
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({
            values,
            createdAt: Date.now()
          }));
        } catch (e) {}

        api.close();
        window.location.href = redirect;
      }
    };

    return (buttonDefs || []).map((b) => {
      const action = b.action;
      const handler = actionMap[action];

      return {
        name: b.name || 'Бутон',
        variant: b.variant || 'secondary',
        onClick: (values, api) => {
          if (typeof handler === 'function') {
            handler(values, api, b);
          } else {
            // ако action не е разпознат -> просто затвори
            api.close();
          }
        }
      };
    });
  }

  openNewProjectModal() {
    if (!window.DynamicFormModal || typeof window.DynamicFormModal.open !== 'function') {
      alert('DynamicFormModal не е зареден.');
      return;
    }

    const cfg = this.getNewProjectModalConfig();

    if (!cfg) {
      // fallback ако нямаме конфиг
      window.DynamicFormModal.open({
        name: 'Нов проект',
        options: [
          { option_name: 'Име на проект', type: 'string', options_settings: { required: true } }
        ],
        buttons: [
          { name: 'Затвори', variant: 'secondary', onClick: (_v, api) => api.close() }
        ]
      });
      return;
    }

    const buttons = this.buildButtonsFromHtmlConfig(cfg.buttons);

    window.DynamicFormModal.open({
      name: cfg.name || 'Нов проект',
      options: Array.isArray(cfg.options) ? cfg.options : [],
      buttons
    });
  }

  handleSearch(query) {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
      this.filteredProjects = [...this.projects];
    } else {
      this.filteredProjects = this.projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm)
      );
    }

    this.currentPage = 1;
    this.renderProjects();
    this.renderPagination();
  }

  renderProjects() {
    const startIndex = (this.currentPage - 1) * this.projectsPerPage;
    const endIndex = startIndex + this.projectsPerPage;
    const projectsToShow = this.filteredProjects.slice(startIndex, endIndex);

    if (projectsToShow.length === 0) {
      this.projectsGrid.innerHTML = '';
      this.emptyState.style.display = 'flex';
      this.pagination.style.display = 'none';
      return;
    }

    this.emptyState.style.display = 'none';
    this.pagination.style.display = 'flex';

    this.projectsGrid.innerHTML = projectsToShow.map((project, index) => `
      <div class="project-card" data-id="${project.id}" style="animation-delay: ${index * 0.1}s">
        <div class="card-image">
          ${project.image
            ? `<img src="${project.image}" alt="${project.name}">`
            : `<div class="card-image-placeholder">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
                  <path d="M16 24L22 18L28 24L36 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="18" cy="18" r="2" fill="currentColor"/>
                </svg>
              </div>`
          }
          <div class="card-stats-overlay">
            <div class="stat-badge">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                <path d="M7 4V7.5L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>${project.duration}</span>
            </div>
            <div class="stat-badge">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 10V11.5C2 12.3284 2.67157 13 3.5 13H10.5C11.3284 13 12 12.3284 12 11.5V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M7 1V9M7 9L4 6M7 9L10 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>${project.fps} FPS</span>
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

          <p class="card-date">Създаден: ${this.formatDate(project.createdAt)}</p>

          <div class="card-actions">
            <button class="btn-card btn-card-delete" data-action="delete" data-id="${project.id}">
              Изтрий
            </button>
            <button class="btn-card btn-card-edit" data-action="edit" data-id="${project.id}">
              Редактирай
            </button>
          </div>
        </div>
      </div>
    `).join('');

    this.projectsGrid.querySelectorAll('.card-info-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const projectId = parseInt(btn.dataset.id);
        this.openInfo(projectId);
      });
    });

    this.projectsGrid.querySelectorAll('.btn-card[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const projectId = parseInt(btn.dataset.id);
        const action = btn.dataset.action;

        if (action === 'edit') {
          window.location.href = `/dashboard/edit?id=${projectId}`;
          return;
        }

        if (action === 'delete') {
          await this.deleteWithConfirmation(projectId);
          return;
        }
      });
    });

    this.projectsGrid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => {
        const projectId = parseInt(card.dataset.id);
        window.location.href = `/dashboard/edit?id=${projectId}`;
      });
    });
  }

  renderPagination() {
    const totalPages = Math.ceil(this.filteredProjects.length / this.projectsPerPage);

    this.prevPageBtn.disabled = this.currentPage === 1;
    this.nextPageBtn.disabled = this.currentPage === totalPages || totalPages === 0;

    let paginationHTML = '';

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        paginationHTML += `
          <button class="page-number ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
            ${i}
          </button>
        `;
      } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
        paginationHTML += `<span class="page-number" style="pointer-events: none;">...</span>`;
      }
    }

    this.paginationNumbers.innerHTML = paginationHTML;

    this.paginationNumbers.querySelectorAll('.page-number[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentPage = parseInt(btn.dataset.page);
        this.renderProjects();
        this.renderPagination();
      });
    });
  }

  openInfo(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    if (!window.InfoModal || typeof window.InfoModal.open !== 'function') {
      alert('InfoModal не е зареден.');
      return;
    }

    window.InfoModal.open({
      title: project.name,
      items: project.info
    });
  }

  async deleteWithConfirmation(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    if (!window.ConfirmationModal || typeof window.ConfirmationModal.open !== 'function') {
      const ok = window.confirm(`Сигурен ли си, че искаш да изтриеш "${project.name}"?`);
      if (ok) this.deleteProject(projectId);
      return;
    }

    const ok = await window.ConfirmationModal.open({
      title: 'Потвърждение',
      message: `Сигурен ли си, че искаш да изтриеш "${project.name}"?`,
      confirmText: 'Изтрий',
      cancelText: 'Откажи'
    });

    if (ok) this.deleteProject(projectId);
  }

  deleteProject(projectId) {
    this.projects = this.projects.filter(p => p.id !== projectId);

    const query = (this.searchInput?.value || '').toLowerCase().trim();
    if (!query) {
      this.filteredProjects = [...this.projects];
    } else {
      this.filteredProjects = this.projects.filter(p => p.name.toLowerCase().includes(query));
    }

    const totalPages = Math.max(1, Math.ceil(this.filteredProjects.length / this.projectsPerPage));
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    if (window.InfoModal && typeof window.InfoModal.close === 'function') {
      window.InfoModal.close();
    }

    this.renderProjects();
    this.renderPagination();
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
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
          opacity: Math.random() * 0.5 + 0.2
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          particle.x -= dx * 0.01;
          particle.y -= dy * 0.01;
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${particle.opacity})`;
        ctx.fill();

        particles.slice(i + 1).forEach(otherParticle => {
          const dx2 = particle.x - otherParticle.x;
          const dy2 = particle.y - otherParticle.y;
          const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (distance2 < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - distance2 / 120)})`;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(drawParticles);
    };

    resize();
    createParticles();
    drawParticles();

    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (window.InfoModalReady) await window.InfoModalReady;
    if (window.ConfirmationModalReady) await window.ConfirmationModalReady;
    if (window.DynamicFormModalReady) await window.DynamicFormModalReady;
  } catch (e) {}

  new ProjectsDashboard();
});
