import { registerRequest } from "../../services/auth.js";

// ===== Particle Animation =====
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let mouseX = 0;
let mouseY = 0;
let animationId;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticles() {
  particles = [];
  const particleCount = Math.floor((canvas.width * canvas.height) / 15000);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.2
    });
  }
}

function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach((particle, index) => {
    particle.x += particle.speedX;
    particle.y += particle.speedY;

    const dx = mouseX - particle.x;
    const dy = mouseY - particle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 150) {
      const force = (150 - distance) / 150;
      particle.x -= dx * force * 0.02;
      particle.y -= dy * force * 0.02;
    }

    if (particle.x < 0) particle.x = canvas.width;
    if (particle.x > canvas.width) particle.x = 0;
    if (particle.y < 0) particle.y = canvas.height;
    if (particle.y > canvas.height) particle.y = 0;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(99, 102, 241, ${particle.opacity})`;
    ctx.fill();

    particles.slice(index + 1).forEach(otherParticle => {
      const dx2 = particle.x - otherParticle.x;
      const dy2 = particle.y - otherParticle.y;
      const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(otherParticle.x, otherParticle.y);
        ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 * (1 - dist / 120)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });
  });

  animationId = requestAnimationFrame(drawParticles);
}

resizeCanvas();
createParticles();
drawParticles();

window.addEventListener('resize', () => {
  resizeCanvas();
  createParticles();
});

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// ===== Form Elements =====
const registerForm = document.getElementById('registerForm');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const termsCheckbox = document.getElementById('terms');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');

// ===== Toggle Password Visibility =====
document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    const eyeIcon = btn.querySelector('.eye-icon');
    const eyeOffIcon = btn.querySelector('.eye-off-icon');

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    eyeIcon.classList.toggle('hidden', !isPassword);
    eyeOffIcon.classList.toggle('hidden', isPassword);

    btn.setAttribute('aria-label', isPassword ? 'Скрий парола' : 'Покажи парола');
  });
});

// ===== Password Strength Checker =====
function checkPasswordStrength(password) {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const score = Object.values(checks).filter(Boolean).length;
  return { score, checks };
}

function updatePasswordStrength() {
  const result = checkPasswordStrength(passwordInput.value);
  const percentage = (result.score / 5) * 100;

  strengthFill.style.width = `${percentage}%`;

  let color, text;
  if (result.score === 0) {
    color = 'transparent';
    text = 'Сила на паролата';
  } else if (result.score <= 2) {
    color = '#EF4444';
    text = 'Слаба парола';
  } else if (result.score <= 3) {
    color = '#F59E0B';
    text = 'Средна парола';
  } else if (result.score <= 4) {
    color = '#22C55E';
    text = 'Добра парола';
  } else {
    color = '#10B981';
    text = 'Отлична парола';
  }

  strengthFill.style.background = color;
  strengthText.textContent = text;
  strengthText.style.color = color === 'transparent' ? 'var(--text-muted)' : color;
}

passwordInput.addEventListener('input', updatePasswordStrength);

// ===== UI Helpers =====
function getWrapper(input) {
  return input.closest('.input-wrapper');
}
function getFormGroup(input) {
  return input.closest('.form-group');
}

function removeErrorMessage(input) {
  const group = getFormGroup(input);
  const existingError = group.querySelector('.error-message');
  if (existingError) existingError.remove();
}

function clearState(input) {
  const wrapper = getWrapper(input);
  removeErrorMessage(input);
  wrapper.classList.remove('error', 'success');
}

function setError(input, message) {
  const wrapper = getWrapper(input);
  removeErrorMessage(input);

  wrapper.classList.remove('success');
  wrapper.classList.add('error');

  const errorMsg = document.createElement('span');
  errorMsg.className = 'error-message';
  errorMsg.textContent = message;

  const formGroup = getFormGroup(input);
  const passwordStrength = formGroup.querySelector('.password-strength');
  if (passwordStrength) {
    // за password полето - да е над strength индикатора
    formGroup.insertBefore(errorMsg, passwordStrength);
  } else {
    formGroup.appendChild(errorMsg);
  }
}

function setErrorStateOnly(input) {
  const wrapper = getWrapper(input);
  wrapper.classList.remove('success');
  wrapper.classList.add('error');
}

function setSuccess(input) {
  const wrapper = getWrapper(input);
  removeErrorMessage(input);
  wrapper.classList.remove('error');
  wrapper.classList.add('success');
}

// Clear states while typing (removes red/green + messages like login)
[usernameInput, emailInput, passwordInput, confirmPasswordInput].forEach((inp) => {
  inp.addEventListener('input', () => clearState(inp));
});

// Terms checkbox visual error clear
termsCheckbox.addEventListener('change', () => {
  termsCheckbox.closest('.checkbox-wrapper').classList.remove('error');
});

// ===== Client Validation (NO success state) =====
const validators = {
  username: (value) => {
    if (value.trim().length < 3) return { valid: false, message: 'Минимум 3 символа' };
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return { valid: false, message: 'Само букви, цифри и _' };
    return { valid: true };
  },
  email: (value) => {
    if (!value.trim()) return { valid: false, message: 'Имейлът е задължителен' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { valid: false, message: 'Невалиден имейл адрес' };
    return { valid: true };
  },
  password: (value) => {
    if (value.length < 8) return { valid: false, message: 'Минимум 8 символа' };
    const strength = checkPasswordStrength(value);
    if (strength.score < 3) return { valid: false, message: 'Паролата е твърде слаба' };
    return { valid: true };
  },
  confirmPassword: (value) => {
    if (!value) return { valid: false, message: 'Моля, потвърдете паролата' };
    if (value !== passwordInput.value) return { valid: false, message: 'Паролите не съвпадат' };
    return { valid: true };
  }
};

function validateFieldNoSuccess(input, validatorFn) {
  clearState(input);

  const result = validatorFn(input.value);
  if (!result.valid) {
    setError(input, result.message);
    return false;
  }
  return true;
}

// ===== Form Submit Handler =====
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = registerForm.querySelector('.submit-btn');
  const btnTextEl = submitBtn.querySelector('.btn-text');

  // Clear old states before validating
  [usernameInput, emailInput, passwordInput, confirmPasswordInput].forEach(clearState);

  const okUser = validateFieldNoSuccess(usernameInput, validators.username);
  const okEmail = validateFieldNoSuccess(emailInput, validators.email);
  const okPass = validateFieldNoSuccess(passwordInput, validators.password);
  const okConfirm = validateFieldNoSuccess(confirmPasswordInput, validators.confirmPassword);

  if (!termsCheckbox.checked) {
    termsCheckbox.closest('.checkbox-wrapper').classList.add('error');
    submitBtn.style.animation = 'shake 0.5s ease';
    setTimeout(() => submitBtn.style.animation = '', 500);
    return;
  }

  if (!okUser || !okEmail || !okPass || !okConfirm) {
    submitBtn.style.animation = 'shake 0.5s ease';
    setTimeout(() => submitBtn.style.animation = '', 500);
    return;
  }

  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    const payload = {
      email: emailInput.value.trim(),
      username: usernameInput.value.trim(),
      password: passwordInput.value
    };

    const result = await registerRequest(payload);

    if (result?.success) {
      // Green ONLY when server says success
      setSuccess(usernameInput);
      setSuccess(emailInput);
      setSuccess(passwordInput);
      setSuccess(confirmPasswordInput);

      submitBtn.style.background = 'var(--gradient-success)';
      btnTextEl.textContent = result.message || 'Регистрацията е успешна.';

      setTimeout(() => {
        window.location.href = "/w25/day3_20260211_306/6MI0800241_8MI0800229_svganimator/frontend/login";
      }, 1200);

      return;
    }

    // ❌ Server error: all red, message ONLY at the bottom (under confirmPassword)
    const msg = result?.error?.message || "Възникна грешка. Моля, опитайте отново.";

    // remove any client messages first (only final one remains)
    removeErrorMessage(usernameInput);
    removeErrorMessage(emailInput);
    removeErrorMessage(passwordInput);
    removeErrorMessage(confirmPasswordInput);

    setErrorStateOnly(usernameInput);
    setErrorStateOnly(emailInput);
    setErrorStateOnly(passwordInput);
    setError(confirmPasswordInput, msg);

    submitBtn.style.animation = 'shake 0.5s ease';
    setTimeout(() => submitBtn.style.animation = '', 500);

  } catch (error) {
    console.error('Registration error:', error);

    const msg = "Възникна грешка. Моля, опитайте отново.";

    removeErrorMessage(usernameInput);
    removeErrorMessage(emailInput);
    removeErrorMessage(passwordInput);
    removeErrorMessage(confirmPasswordInput);

    setErrorStateOnly(usernameInput);
    setErrorStateOnly(emailInput);
    setErrorStateOnly(passwordInput);
    setError(confirmPasswordInput, msg);

  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

// ===== Input Focus Animations =====
const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
inputs.forEach(input => {
  input.addEventListener('focus', () => {
    input.closest('.form-group').style.transform = 'scale(1.02)';
    input.closest('.form-group').style.transition = 'transform 0.3s ease';
  });

  input.addEventListener('blur', () => {
    input.closest('.form-group').style.transform = 'scale(1)';
  });
});

// ===== Shake Animation =====
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(style);
