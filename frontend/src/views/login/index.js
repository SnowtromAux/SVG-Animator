import { loginRequest } from "../../services/auth.js";

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

// ===== Form Logic =====
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.querySelector('.toggle-password');
const eyeIcon = document.querySelector('.eye-icon');
const eyeOffIcon = document.querySelector('.eye-off-icon');

togglePasswordBtn.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';

  eyeIcon.classList.toggle('hidden', !isPassword);
  eyeOffIcon.classList.toggle('hidden', isPassword);

  togglePasswordBtn.setAttribute(
    'aria-label',
    isPassword ? 'Скрий парола' : 'Покажи парола'
  );
});

// Helpers
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

// Set ONLY visual error state (no message)
function setErrorStateOnly(input) {
  const wrapper = getWrapper(input);
  wrapper.classList.remove('success');
  wrapper.classList.add('error');
}

// Set error + message (use for password only)
function setErrorWithMessage(input, message) {
  const wrapper = getWrapper(input);
  removeErrorMessage(input);

  wrapper.classList.remove('success');
  wrapper.classList.add('error');

  const errorMsg = document.createElement('span');
  errorMsg.className = 'error-message';
  errorMsg.textContent = message;

  getFormGroup(input).appendChild(errorMsg);
}

function setSuccess(input) {
  const wrapper = getWrapper(input);
  removeErrorMessage(input);
  wrapper.classList.remove('error');
  wrapper.classList.add('success');
}

// Client validation: ONLY sets error (never success)
function validateRequiredMin(input, minLength, emptyMsg, minMsg) {
  const value = input.value.trim();

  clearState(input);

  if (value.length === 0) {
    setErrorWithMessage(input, emptyMsg);
    return false;
  }
  if (value.length < minLength) {
    setErrorWithMessage(input, minMsg);
    return false;
  }
  return true;
}

// Clear states while typing
usernameInput.addEventListener('input', () => clearState(usernameInput));
passwordInput.addEventListener('input', () => clearState(passwordInput));

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = loginForm.querySelector('.submit-btn');
  const btnTextEl = submitBtn.querySelector('.btn-text');

  // Clear old states before validating
  clearState(usernameInput);
  clearState(passwordInput);

  const okUser = validateRequiredMin(
    usernameInput,
    3,
    'Това поле е задължително',
    'Минимум 3 символа'
  );

  const okPass = validateRequiredMin(
    passwordInput,
    6,
    'Това поле е задължително',
    'Минимум 6 символа'
  );

  if (!okUser || !okPass) {
    submitBtn.style.animation = 'shake 0.5s ease';
    setTimeout(() => { submitBtn.style.animation = ''; }, 500);
    return;
  }

  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    const login = usernameInput.value.trim();
    const password = passwordInput.value;

    const result = await loginRequest({ login, password });

    if (result?.success) {
      setSuccess(usernameInput);
      setSuccess(passwordInput);

      submitBtn.style.background = 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)';
      btnTextEl.textContent = 'Успешен вход!';

      setTimeout(() => {
        window.location.href = "/w25/day3_20260211_306/6MI0800241_8MI0800229_svganimator/frontend/platform/my-projects";
      }, 700);

      return;
    }

    const message =
      result?.error?.message ||
      'Възникна грешка. Моля, опитайте отново.';

    removeErrorMessage(usernameInput);
    removeErrorMessage(passwordInput);

    setErrorStateOnly(usernameInput);
    setErrorWithMessage(passwordInput, message);

    submitBtn.style.animation = 'shake 0.5s ease';
    setTimeout(() => { submitBtn.style.animation = ''; }, 500);

  } catch (error) {
    console.error('Login error:', error);

    const message = 'Възникна грешка. Моля, опитайте отново.';

    removeErrorMessage(usernameInput);
    removeErrorMessage(passwordInput);

    setErrorStateOnly(usernameInput);
    setErrorWithMessage(passwordInput, message);

  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

// ===== Form Animations =====
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(style);

const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
  input.addEventListener('focus', () => {
    input.closest('.form-group').style.transform = 'scale(1.02)';
    input.closest('.form-group').style.transition = 'transform 0.3s ease';
  });

  input.addEventListener('blur', () => {
    input.closest('.form-group').style.transform = 'scale(1)';
  });
});
