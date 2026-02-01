/* ========================================
   NAVBAR.JS - Navigation Bar Logic (Config-driven)
   ======================================== */

class Navbar {
  constructor() {
    this.BASE = '/svganimator/frontend';

    this.navbarContainer = null;

    this.currentUser = {
      name: 'Потребител',
      avatar: '',
      role: 'Animator'
    };

    // ✅ IMPORTANT:
    // These routes must exist as:
    // /svganimator/frontend/src/views/<route>/index.html
    // Example: /dashboard/create -> src/views/dashboard/create/index.html
    this.navItems = [
      {
        id: "my-projects",
        label: "Моите проекти",
        href: `${this.BASE}/platform/my-projects`,
        keys: [
          "platform/my-projects",
          `${this.BASE}/platform/my-projects`
        ],
        active: true,
        svg: `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2.5" y="2.5" width="6.25" height="6.25" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="11.25" y="2.5" width="6.25" height="6.25" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="2.5" y="11.25" width="6.25" height="6.25" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <rect x="11.25" y="11.25" width="6.25" height="6.25" rx="1" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        `
      },
      {
        id: "menu-2",
        label: "Създай",
        href: `${this.BASE}/dashboard/create`,
        keys: [
          "dashboard/create",
          `${this.BASE}/dashboard/create`
        ],
        active: false,
        svg: `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 6.66667V13.3333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M6.66667 10H13.3333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        `
      },
      {
        id: "menu-3",
        label: "Шаблони",
        href: `${this.BASE}/dashboard/templates`,
        keys: [
          "dashboard/templates",
          `${this.BASE}/dashboard/templates`
        ],
        active: false,
        svg: `
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M16.6667 2.5H3.33333C2.8731 2.5 2.5 2.8731 2.5 3.33333V16.6667C2.5 17.1269 2.8731 17.5 3.33333 17.5H16.6667C17.1269 17.5 17.5 17.1269 17.5 16.6667V3.33333C17.5 2.8731 17.1269 2.5 16.6667 2.5Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M2.5 7.5H17.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7.5 17.5V7.5" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        `
      }
    ];

    // DOM refs
    this.navbarEl = null;
    this.navbarLinksEl = null;
    this.dropdownNavListEl = null;

    this.userMenuBtn = null;
    this.userDropdown = null;
    this.userMenuWrap = null;

    this.userNameEl = null;
    this.userRoleEl = null;

    // handlers
    this.onDocClick = null;
    this.onDocKeydown = null;
    this.onResize = null;
  }

  async init() {
    await this.loadNavbar();

    this.cacheElements();
    this.renderNav();
    this.applyActiveFromKeys();

    this.bindEvents();
    this.loadUserData();

    this.updateNavCollapse();
  }

  async loadNavbar() {
    try {
      const response = await fetch(`${this.BASE}/src/components/Layout/Navbar/index.html`);
      const html = await response.text();

      this.navbarContainer = document.createElement('div');
      this.navbarContainer.id = 'navbar-container';
      this.navbarContainer.innerHTML = html;

      const mount = document.getElementById('navbar-mount');
      if (mount) mount.appendChild(this.navbarContainer);
      else document.body.insertBefore(this.navbarContainer, document.body.firstChild);

      document.body.style.paddingTop = '72px';
    } catch (error) {
      console.error('Failed to load navbar:', error);
    }
  }

  cacheElements() {
    this.navbarEl = document.getElementById('appNavbar');
    this.navbarLinksEl = document.getElementById('navbarLinks');
    this.dropdownNavListEl = document.getElementById('dropdownNavList');

    this.userMenuBtn = document.getElementById('userMenuBtn');
    this.userDropdown = document.getElementById('userDropdown');
    this.userMenuWrap = document.getElementById('userMenu');

    this.userNameEl = document.getElementById('userName');
    this.userRoleEl = document.getElementById('userRole');
  }

  createNavLink(item, variant) {
    const a = document.createElement('a');

    a.href = item.href;
    a.setAttribute('data-nav-id', item.id);

    if (variant === "center") {
      a.className = 'nav-link';
      a.innerHTML = `${item.svg}<span>${this.escapeHtml(item.label)}</span>`;
    } else {
      a.className = 'dropdown-item nav-item';
      a.setAttribute('role', 'menuitem');
      a.innerHTML = `${item.svg}<span class="dropdown-item-label">${this.escapeHtml(item.label)}</span>`;
    }

    if (item.active === false) {
      a.classList.add('disabled');
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('tabindex', '-1');
    }

    return a;
  }

  renderNav() {
    if (!this.navbarLinksEl || !this.dropdownNavListEl) return;

    this.navbarLinksEl.innerHTML = '';
    this.dropdownNavListEl.innerHTML = '';

    for (const item of this.navItems) {
      const centerLink = this.createNavLink(item, "center");
      const dropLink = this.createNavLink(item, "dropdown");

      this.navbarLinksEl.appendChild(centerLink);
      this.dropdownNavListEl.appendChild(dropLink);
    }
  }

  escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  normalizePath(p) {
    if (!p) return '';
    let s = String(p).trim();

    try {
      if (s.startsWith('http://') || s.startsWith('https://')) {
        s = new URL(s).pathname;
      }
    } catch (_) {}

    s = s.split('?')[0].split('#')[0];
    s = s.replace(/\/+$/, '');
    return s;
  }

  pathMatchesKey(currentPath, key) {
    const cp = this.normalizePath(currentPath);
    const k = this.normalizePath(key);
    if (!cp || !k) return false;

    if (cp === k) return true;

    const kWithSlash = k.startsWith('/') ? k : '/' + k;
    if (cp.endsWith(k)) return true;
    if (cp.endsWith(kWithSlash)) return true;

    return false;
  }

  clearActive() {
    const all = document.querySelectorAll('[data-nav-id]');
    all.forEach(el => {
      el.classList.remove('active');
      el.removeAttribute('aria-current');
    });
  }

  setActiveById(navId) {
    const els = document.querySelectorAll(`[data-nav-id="${navId}"]`);
    els.forEach(el => {
      const isDisabled = el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
      if (isDisabled) return;

      el.classList.add('active');
      el.setAttribute('aria-current', 'page');
    });
  }

  applyActiveFromKeys() {
    const currentPath = window.location.pathname;
    this.clearActive();

    let match = null;
    for (const item of this.navItems) {
      const keys = Array.isArray(item.keys) ? item.keys : [];
      for (const k of keys) {
        if (this.pathMatchesKey(currentPath, k)) {
          match = item;
          break;
        }
      }
      if (match) break;
    }

    if (!match) return;
    this.setActiveById(match.id);
  }

  updateNavCollapse() {
    if (!this.navbarEl || !this.navbarLinksEl) return;

    const desiredGap = 40;

    const wasCollapsed = this.navbarEl.classList.contains('nav-collapsed');
    if (wasCollapsed) this.navbarEl.classList.remove('nav-collapsed');

    const container = this.navbarEl.querySelector('.navbar-container');
    const brand = this.navbarEl.querySelector('.navbar-brand');
    const user = this.navbarEl.querySelector('.navbar-user');
    const links = this.navbarLinksEl;

    if (!container || !brand || !user || !links) return;

    const containerWidth = container.clientWidth;
    const brandWidth = brand.getBoundingClientRect().width;
    const userWidth = user.getBoundingClientRect().width;
    const linksWidth = links.scrollWidth;

    const freeSpace = containerWidth - brandWidth - linksWidth - userWidth;
    const minFreeSpace = desiredGap * 2;

    const shouldCollapse = freeSpace < minFreeSpace;

    if (shouldCollapse) this.navbarEl.classList.add('nav-collapsed');
    else this.navbarEl.classList.remove('nav-collapsed');
  }

  openDropdown() {
    if (!this.userDropdown || !this.userMenuBtn) return;
    this.userDropdown.classList.add('open');
    this.userMenuBtn.setAttribute('aria-expanded', 'true');
  }

  closeDropdown() {
    if (!this.userDropdown || !this.userMenuBtn) return;
    this.userDropdown.classList.remove('open');
    this.userMenuBtn.setAttribute('aria-expanded', 'false');
  }

  toggleDropdown() {
    if (!this.userDropdown) return;
    const isOpen = this.userDropdown.classList.contains('open');
    if (isOpen) this.closeDropdown();
    else this.openDropdown();
  }

  bindEvents() {
    if (this.userMenuBtn) {
      this.userMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown();
      });
    }

    this.onDocClick = (e) => {
      if (!this.userMenuWrap) return;
      if (!this.userMenuWrap.contains(e.target)) this.closeDropdown();
    };
    document.addEventListener('click', this.onDocClick);

    this.onDocKeydown = (e) => {
      if (e.key === 'Escape') this.closeDropdown();
    };
    document.addEventListener('keydown', this.onDocKeydown);

    document.addEventListener('click', (e) => {
      const target = e.target.closest('.disabled,[aria-disabled="true"]');
      if (!target) return;
      if (target.tagName === 'A' || target.tagName === 'BUTTON') {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('svg_animator_user');
        window.location.href = `${this.BASE}/login`;
      });
    }

    this.onResize = () => this.updateNavCollapse();
    window.addEventListener('resize', this.onResize);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this.updateNavCollapse()).catch(() => {});
    }
  }

  loadUserData() {
    const savedUser = localStorage.getItem('svg_animator_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    this.updateUserUI();
  }

  updateUserUI() {
    const userAvatarEl = document.getElementById('userAvatar');

    if (this.userNameEl) this.userNameEl.textContent = this.currentUser.name;
    if (this.userRoleEl) this.userRoleEl.textContent = this.currentUser.role || 'Animator';

    if (userAvatarEl) {
      if (this.currentUser.avatar) userAvatarEl.src = this.currentUser.avatar;
      else userAvatarEl.removeAttribute('src');
    }
  }

  setUser(userData) {
    this.currentUser = { ...this.currentUser, ...userData };
    localStorage.setItem('svg_animator_user', JSON.stringify(this.currentUser));
    this.updateUserUI();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.navbar = new Navbar();
  window.navbar.init();
});
