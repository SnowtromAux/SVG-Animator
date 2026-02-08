const STORAGE_KEY = 'svganimator.animations.v1';

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function safeId(id) {
  return String(id || '').trim() || `anim-${Date.now()}`;
}

export class AnimationsService {
  constructor({ baseUrl = '/api' } = {}) {
    this.baseUrl = baseUrl;
  }

  /**
   * Save an animation.
   * Expected input:
   * {
   *   animation_id,
   *   name,
   *   settings,
   *   segments,
   *   svgContent
   * }
   *
   * Returns: { animation_id }
   */
  async saveAnimation(animationData) {
    const animation_id = safeId(animationData?.animation_id);

    // Try API first
    try {
      const res = await fetch(`${this.baseUrl}/animations/${encodeURIComponent(animation_id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...animationData, animation_id })
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return { animation_id: json.animation_id || animation_id };
      }

      // If API responds but not ok, throw to fallback
      throw new Error(`API save failed: ${res.status}`);
    } catch (err) {
      // Fallback to localStorage
      const store = loadStore();
      store[animation_id] = {
        ...animationData,
        animation_id,
        updatedAt: new Date().toISOString()
      };
      saveStore(store);
      return { animation_id };
    }
  }

  /**
   * Load an animation by id.
   * Returns the animation object or null.
   */
  async getAnimation(animation_id) {
    const id = safeId(animation_id);

    // Try API first
    try {
      const res = await fetch(`${this.baseUrl}/animations/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const json = await res.json();
        return json || null;
      }

      throw new Error(`API get failed: ${res.status}`);
    } catch {
      const store = loadStore();
      return store[id] || null;
    }
  }

  /**
   * List animations.
   * Returns array of { animation_id, name, updatedAt }
   */
  async listAnimations() {
    // Try API first
    try {
      const res = await fetch(`${this.baseUrl}/animations`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const json = await res.json();
        return Array.isArray(json) ? json : [];
      }

      throw new Error(`API list failed: ${res.status}`);
    } catch {
      const store = loadStore();
      return Object.values(store).map((a) => ({
        animation_id: a.animation_id,
        name: a.name || a.animation_id,
        updatedAt: a.updatedAt
      }));
    }
  }
}
