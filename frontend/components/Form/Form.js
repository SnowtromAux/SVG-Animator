(() => {
  const mountId = 'dynamic-form-modal-mount';

  window.DynamicFormModalReady = (async () => {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    const res = await fetch('../../components/Form/Form.html');
    const html = await res.text();
    mount.innerHTML = html;

    const overlay = document.getElementById('dfmOverlay');
    const closeBtn = document.getElementById('dfmClose');
    const titleEl = document.getElementById('dfmTitle');
    const fieldsEl = document.getElementById('dfmFields');
    const footerEl = document.getElementById('dfmFooter');
    const formEl = document.getElementById('dfmForm');

    let currentConfig = null;

    const normalizeExt = (ext) => String(ext).replace(/^\./, '').toLowerCase().trim();

    const formatBytes = (bytes) => {
      if (!Number.isFinite(bytes)) return '';
      const units = ['B', 'KB', 'MB', 'GB'];
      let v = bytes;
      let i = 0;
      while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
      }
      const rounded = i === 0 ? Math.round(v) : Math.round(v * 10) / 10;
      return `${rounded} ${units[i]}`;
    };

    const setOpenState = (isOpen) => {
      if (isOpen) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      } else {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    };

    const close = () => {
      currentConfig = null;
      fieldsEl.innerHTML = '';
      footerEl.innerHTML = '';
      titleEl.textContent = 'Форма';
      setOpenState(false);
    };

    const showFieldError = (fieldWrap, message) => {
      fieldWrap.classList.add('invalid');
      const err = fieldWrap.querySelector('.dfm-error');
      if (err) err.textContent = message || 'Невалидна стойност';
    };

    const clearFieldError = (fieldWrap) => {
      fieldWrap.classList.remove('invalid');
      const err = fieldWrap.querySelector('.dfm-error');
      if (err) err.textContent = '';
    };

    const getFileConstraints = (settings = {}) => {
      const allowed = (settings.allowed_extensions || settings.allowedExtensions || [])
        .map(normalizeExt)
        .filter(Boolean);

      const maxMB =
        typeof settings.max_size_mb === 'number'
          ? settings.max_size_mb
          : (typeof settings.maxSizeMB === 'number' ? settings.maxSizeMB : null);

      return { allowed, maxMB };
    };

    const validate = (options) => {
      let ok = true;

      options.forEach((opt) => {
        const key = opt.option_name;
        const wrap = fieldsEl.querySelector(`[data-field="${CSS.escape(key)}"]`);
        if (!wrap) return;

        clearFieldError(wrap);

        const settings = opt.options_settings || {};
        const required = !!settings.required;

        const input = wrap.querySelector('[data-input="1"]');
        if (!input) return;

        if (opt.type === 'string') {
          const val = String(input.value || '').trim();
          if (required && !val) {
            ok = false;
            showFieldError(wrap, 'Полето е задължително.');
          }
          const minLen = typeof settings.minLength === 'number' ? settings.minLength : null;
          const maxLen = typeof settings.maxLength === 'number' ? settings.maxLength : null;
          if (val && minLen !== null && val.length < minLen) {
            ok = false;
            showFieldError(wrap, `Минимална дължина: ${minLen}`);
          }
          if (val && maxLen !== null && val.length > maxLen) {
            ok = false;
            showFieldError(wrap, `Максимална дължина: ${maxLen}`);
          }
        }

        if (opt.type === 'number') {
          const raw = String(input.value || '').trim();
          if (required && raw === '') {
            ok = false;
            showFieldError(wrap, 'Полето е задължително.');
          }
          if (raw !== '') {
            const num = Number(raw);
            if (Number.isNaN(num)) {
              ok = false;
              showFieldError(wrap, 'Моля въведи число.');
            } else {
              const min = typeof settings.min === 'number' ? settings.min : null;
              const max = typeof settings.max === 'number' ? settings.max : null;
              if (min !== null && num < min) {
                ok = false;
                showFieldError(wrap, `Минимална стойност: ${min}`);
              }
              if (max !== null && num > max) {
                ok = false;
                showFieldError(wrap, `Максимална стойност: ${max}`);
              }
            }
          }
        }

        if (opt.type === 'options') {
          const val = String(input.value || '').trim();
          if (required && !val) {
            ok = false;
            showFieldError(wrap, 'Моля избери опция.');
          }
        }

        if (opt.type === 'file') {
          const file = input.files && input.files[0] ? input.files[0] : null;

          if (required && !file) {
            ok = false;
            showFieldError(wrap, 'Моля избери файл.');
          }

          if (file) {
            const { allowed, maxMB } = getFileConstraints(settings);

            if (allowed.length) {
              const fileExt = normalizeExt(file.name.split('.').pop() || '');
              if (!allowed.includes(fileExt)) {
                ok = false;
                showFieldError(wrap, `Разрешени: ${allowed.join(', ')}`);
              }
            }

            if (maxMB !== null) {
              const maxBytes = maxMB * 1024 * 1024;
              if (file.size > maxBytes) {
                ok = false;
                showFieldError(wrap, `Макс. размер: ${maxMB} MB`);
              }
            }
          }
        }
      });

      return ok;
    };

    const collectValues = (options) => {
      const values = {};

      options.forEach((opt) => {
        const key = opt.option_name;
        const wrap = fieldsEl.querySelector(`[data-field="${CSS.escape(key)}"]`);
        if (!wrap) return;

        const input = wrap.querySelector('[data-input="1"]');
        if (!input) return;

        if (opt.type === 'string') {
          values[key] = String(input.value || '');
        }

        if (opt.type === 'number') {
          const raw = String(input.value || '').trim();
          values[key] = raw === '' ? null : Number(raw);
        }

        if (opt.type === 'options') {
          values[key] = String(input.value || '');
        }

        if (opt.type === 'file') {
          values[key] = input.files && input.files[0] ? input.files[0] : null;
        }
      });

      return values;
    };

    const renderFileHelp = (settings = {}) => {
      const { allowed, maxMB } = getFileConstraints(settings);

      const chips = [];
      if (allowed.length) chips.push(`<span class="dfm-help-chip">Разширения: ${allowed.join(', ')}</span>`);
      if (maxMB !== null) chips.push(`<span class="dfm-help-chip">Макс размер: ${maxMB} MB</span>`);

      if (!chips.length) return '';

      return `
        <div class="dfm-help-chips" data-file-help="1">
          ${chips.join('')}
        </div>
      `;
    };

    const renderField = (opt) => {
      const key = opt.option_name;
      const settings = opt.options_settings || {};
      const required = !!settings.required;

      let inputHTML = '';
      let helpBelowInputHTML = '';

      if (opt.type === 'string') {
        const placeholder = settings.placeholder || '';
        const def = (settings.default ?? '');
        inputHTML = `
          <input
            class="dfm-input"
            data-input="1"
            type="text"
            ${required ? 'required' : ''}
            placeholder="${String(placeholder).replace(/"/g, '&quot;')}"
            value="${String(def).replace(/"/g, '&quot;')}"
          />
        `;
        if (settings.hint) {
          helpBelowInputHTML = `<div class="dfm-help">${settings.hint}</div>`;
        }
      }

      if (opt.type === 'number') {
        const def = (settings.default ?? '');
        const min = typeof settings.min === 'number' ? `min="${settings.min}"` : '';
        const max = typeof settings.max === 'number' ? `max="${settings.max}"` : '';
        const step = typeof settings.step === 'number' ? `step="${settings.step}"` : '';
        inputHTML = `
          <input
            class="dfm-input"
            data-input="1"
            type="number"
            ${required ? 'required' : ''}
            ${min} ${max} ${step}
            value="${String(def).replace(/"/g, '&quot;')}"
          />
        `;
        if (settings.hint) {
          helpBelowInputHTML = `<div class="dfm-help">${settings.hint}</div>`;
        }
      }

      if (opt.type === 'file') {
        const { allowed } = getFileConstraints(settings);
        const accept = allowed.length ? `accept="${allowed.map(a => '.' + a).join(',')}"` : '';
        inputHTML = `
          <input
            class="dfm-input"
            data-input="1"
            type="file"
            ${required ? 'required' : ''}
            ${accept}
          />
          ${renderFileHelp(settings)}
          <div class="dfm-file-selected" data-file-selected="1">
            <div class="dfm-file-meta">
              <div class="dfm-file-name" data-file-name="1"></div>
              <div class="dfm-file-size" data-file-size="1"></div>
            </div>
            <button class="dfm-file-clear" type="button" data-file-clear="1">Премахни</button>
          </div>
        `;
        if (settings.hint) {
          // hint-а, ако имаш, ще стои под chips-а (втори ред helper)
          helpBelowInputHTML = `<div class="dfm-help">${settings.hint}</div>`;
        }
      }

      if (opt.type === 'options') {
        const choices = settings.choices || settings.options || [];
        const def = settings.default ?? settings.initial ?? '';

        const normalized = Array.isArray(choices)
          ? choices.map((c) => {
              if (typeof c === 'string') return { label: c, value: c };
              if (c && typeof c === 'object') {
                return { label: c.label ?? c.value ?? 'Опция', value: c.value ?? c.label ?? '' };
              }
              return { label: 'Опция', value: '' };
            })
          : [];

        const optionsHtml = normalized.map((c) => {
          const selected = String(c.value) === String(def) ? 'selected' : '';
          return `<option value="${String(c.value).replace(/"/g, '&quot;')}" ${selected}>${String(c.label)}</option>`;
        }).join('');

        inputHTML = `
          <select class="dfm-select" data-input="1" ${required ? 'required' : ''}>
            ${required ? '' : '<option value="">-- Избери --</option>'}
            ${optionsHtml}
          </select>
        `;
        if (settings.hint) {
          helpBelowInputHTML = `<div class="dfm-help">${settings.hint}</div>`;
        }
      }

      return `
        <div class="dfm-field" data-field="${String(key).replace(/"/g, '&quot;')}">
          <label class="dfm-label">${key}${required ? ' *' : ''}</label>
          ${inputHTML}
          ${helpBelowInputHTML}
          <div class="dfm-error"></div>
        </div>
      `;
    };

    const renderButtons = (buttons, options) => {
      footerEl.innerHTML = '';

      (buttons || []).forEach((btn) => {
        const variant = btn.variant || 'secondary';
        const className =
          variant === 'primary'
            ? 'dfm-btn dfm-btn-primary'
            : variant === 'danger'
              ? 'dfm-btn dfm-btn-danger'
              : 'dfm-btn dfm-btn-secondary';

        const el = document.createElement('button');
        el.type = 'button';
        el.className = className;
        el.textContent = btn.name || 'Бутон';

        el.addEventListener('click', () => {
          const ok = validate(options || []);
          if (!ok) return;

          const values = collectValues(options || []);
          const api = { close, values };
          const fn = btn.onClick || btn.function || btn.fn;

          if (typeof fn === 'function') {
            fn(values, api);
          }
        });

        footerEl.appendChild(el);
      });
    };

    const wireFileUi = (opt) => {
      const key = opt.option_name;
      const wrap = fieldsEl.querySelector(`[data-field="${CSS.escape(key)}"]`);
      if (!wrap) return;

      const input = wrap.querySelector('[data-input="1"]');
      const selected = wrap.querySelector('[data-file-selected="1"]');
      const nameEl = wrap.querySelector('[data-file-name="1"]');
      const sizeEl = wrap.querySelector('[data-file-size="1"]');
      const clearBtn = wrap.querySelector('[data-file-clear="1"]');

      if (!input || !selected || !nameEl || !sizeEl || !clearBtn) return;

      const updateSelected = () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        if (!file) {
          selected.classList.remove('active');
          nameEl.textContent = '';
          sizeEl.textContent = '';
          return;
        }
        selected.classList.add('active');
        nameEl.textContent = file.name;
        sizeEl.textContent = formatBytes(file.size);
      };

      clearBtn.addEventListener('click', () => {
        input.value = '';
        updateSelected();
        clearFieldError(wrap);
      });

      input.addEventListener('change', () => {
        updateSelected();

        // “меко” валидиране при избор (за по-добър UX)
        clearFieldError(wrap);
        const settings = opt.options_settings || {};
        const file = input.files && input.files[0] ? input.files[0] : null;
        if (!file) return;

        const { allowed, maxMB } = getFileConstraints(settings);

        if (allowed.length) {
          const fileExt = normalizeExt(file.name.split('.').pop() || '');
          if (!allowed.includes(fileExt)) {
            showFieldError(wrap, `Невалидно разширение. Разрешени: ${allowed.join(', ')}`);
            return;
          }
        }

        if (maxMB !== null) {
          const maxBytes = maxMB * 1024 * 1024;
          if (file.size > maxBytes) {
            showFieldError(wrap, `Файлът е прекалено голям. Макс: ${maxMB} MB`);
            return;
          }
        }
      });

      updateSelected();
    };

    const open = (config = {}) => {
      currentConfig = config;

      const title = config.name || config.title || 'Форма';
      const options = Array.isArray(config.options) ? config.options : [];
      const buttons = Array.isArray(config.buttons) ? config.buttons : [];

      titleEl.textContent = title;
      fieldsEl.innerHTML = options.map(renderField).join('');

      // live clear errors on input change
      options.forEach((opt) => {
        const key = opt.option_name;
        const wrap = fieldsEl.querySelector(`[data-field="${CSS.escape(key)}"]`);
        if (!wrap) return;

        const input = wrap.querySelector('[data-input="1"]');
        if (!input) return;

        input.addEventListener('input', () => clearFieldError(wrap));
        input.addEventListener('change', () => clearFieldError(wrap));

        if (opt.type === 'file') {
          wireFileUi(opt);
        }
      });

      renderButtons(buttons, options);
      setOpenState(true);
    };

    closeBtn.addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      const allow = currentConfig?.allowOverlayClose !== false;
      if (allow && e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) close();
    });

    // prevent default submit on Enter
    formEl.addEventListener('submit', (e) => e.preventDefault());

    window.DynamicFormModal = { open, close };
  })();
})();
