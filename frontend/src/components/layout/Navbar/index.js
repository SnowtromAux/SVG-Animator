import { logoutRequest } from "../../../services/auth.js";

class Navbar {
  constructor() {
    this.BASE = '/svganimator/frontend';

    this.navbarContainer = null;

    this.currentUser = {
      name: 'Потребител',
      avatar: '',
      role: 'Animator'
    };

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
        id: "posts",
        label: "Постове",
        href: `${this.BASE}/platform/posts`,
        keys: [
          "platform/posts",
          `${this.BASE}/platform/posts`
        ],
        active: true,
        svg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 14.5C20 15.8807 18.8807 17 17.5 17H9L5 21V6.5C5 5.11929 6.11929 4 7.5 4H17.5C18.8807 4 20 5.11929 20 6.5V14.5Z"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8.5 8.5H16.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M8.5 11.5H14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        `
      },

      {
        id: "my-posts",
        label: "Моите постове",
        href: `${this.BASE}/platform/my-posts`,
        keys: [
          "platform/my-posts",
          `${this.BASE}/platform/my-posts`
        ],
        active: true,
        svg: `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <!-- user -->
            <path d="M8.5 11.5C10.1569 11.5 11.5 10.1569 11.5 8.5C11.5 6.84315 10.1569 5.5 8.5 5.5C6.84315 5.5 5.5 6.84315 5.5 8.5C5.5 10.1569 6.84315 11.5 8.5 11.5Z"
                  stroke="currentColor" stroke-width="1.5"/>
            <path d="M3.75 18.5C4.6 15.9 6.4 14.5 8.5 14.5C10.6 14.5 12.4 15.9 13.25 18.5"
                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <!-- post card -->
            <rect x="13.5" y="6.5" width="7" height="11" rx="2"
                  stroke="currentColor" stroke-width="1.5"/>
            <path d="M15.5 9H19.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M15.5 11.5H18.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
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
      logoutBtn.addEventListener('click', async () => {
        try {
          await logoutRequest();
        } catch (_) {
          // silent
        }

        // clear both old and new keys
        localStorage.removeItem('svg_animator_user');
        localStorage.removeItem('user.username');
        localStorage.removeItem('user.email');

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
    const lsUsername = localStorage.getItem('user.username');
    const lsEmail = localStorage.getItem('user.email');

    if (lsUsername) {
      this.currentUser.name = lsUsername;
    }

    if (!lsUsername) {
      const savedUser = localStorage.getItem('svg_animator_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.name) this.currentUser.name = parsed.name;
          if (parsed?.avatar) this.currentUser.avatar = parsed.avatar;
          if (parsed?.role) this.currentUser.role = parsed.role;
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      }
    }

    this.currentUser.email = lsEmail || this.currentUser.email || '';
    this.updateUserUI();
  }

  updateUserUI() {
    const userAvatarEl = document.getElementById('userAvatar');

    if (this.userNameEl) this.userNameEl.textContent = this.currentUser.name || 'Потребител';
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
