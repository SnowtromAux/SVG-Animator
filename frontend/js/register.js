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
  let strength = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  strength = Object.values(checks).filter(Boolean).length;
  
  return {
    score: strength,
    checks
  };
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

// ===== Form Validation =====
function validateField(input, validator) {
  const wrapper = input.closest('.input-wrapper');
  const formGroup = wrapper.parentElement;
  const existingError = formGroup.querySelector('.error-message');
  
  if (existingError) {
    existingError.remove();
  }
  
  wrapper.classList.remove('error', 'success');
  
  const result = validator(input.value);
  
  if (!result.valid) {
    wrapper.classList.add('error');
    
    const errorMsg = document.createElement('span');
    errorMsg.className = 'error-message';
    errorMsg.textContent = result.message;
    
    const passwordStrength = formGroup.querySelector('.password-strength');
    if (passwordStrength) {
      formGroup.insertBefore(errorMsg, passwordStrength);
    } else {
      formGroup.appendChild(errorMsg);
    }
    return false;
  }
  
  wrapper.classList.add('success');
  return true;
}

const validators = {
  username: (value) => {
    if (value.trim().length < 3) {
      return { valid: false, message: 'Минимум 3 символа' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return { valid: false, message: 'Само букви, цифри и _' };
    }
    return { valid: true };
  },
  email: (value) => {
    if (!value.trim()) {
      return { valid: false, message: 'Имейлът е задължителен' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { valid: false, message: 'Невалиден имейл адрес' };
    }
    return { valid: true };
  },
  password: (value) => {
    if (value.length < 8) {
      return { valid: false, message: 'Минимум 8 символа' };
    }
    const strength = checkPasswordStrength(value);
    if (strength.score < 3) {
      return { valid: false, message: 'Паролата е твърде слаба' };
    }
    return { valid: true };
  },
  confirmPassword: (value) => {
    if (!value) {
      return { valid: false, message: 'Моля, потвърдете паролата' };
    }
    if (value !== passwordInput.value) {
      return { valid: false, message: 'Паролите не съвпадат' };
    }
    return { valid: true };
  }
};

// Clear errors on input
function clearError(input) {
  const wrapper = input.closest('.input-wrapper');
  const formGroup = wrapper.parentElement;
  const existingError = formGroup.querySelector('.error-message');
  
  if (existingError) {
    existingError.remove();
    wrapper.classList.remove('error');
  }
}

usernameInput.addEventListener('input', () => clearError(usernameInput));
emailInput.addEventListener('input', () => clearError(emailInput));
passwordInput.addEventListener('input', () => clearError(passwordInput));
confirmPasswordInput.addEventListener('input', () => clearError(confirmPasswordInput));

// ===== Form Submit Handler =====
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = registerForm.querySelector('.submit-btn');
  
  const isUsernameValid = validateField(usernameInput, validators.username);
  const isEmailValid = validateField(emailInput, validators.email);
  const isPasswordValid = validateField(passwordInput, validators.password);
  const isConfirmValid = validateField(confirmPasswordInput, validators.confirmPassword);
  
  if (!termsCheckbox.checked) {
    termsCheckbox.closest('.checkbox-wrapper').classList.add('error');
    submitBtn.style.animation = 'shake 0.5s ease';
    setTimeout(() => submitBtn.style.animation = '', 500);
    return;
  }
  
  if (!isUsernameValid || !isEmailValid || !isPasswordValid || !isConfirmValid) {
    submitBtn.style.animation = 'shake 0.5s ease';
    setTimeout(() => submitBtn.style.animation = '', 500);
    return;
  }
  
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const formData = {
      username: usernameInput.value.trim(),
      email: emailInput.value.trim(),
      password: passwordInput.value
    };
    
    console.log('Registration attempt:', formData.username, formData.email);
    
    submitBtn.style.background = 'var(--gradient-success)';
    submitBtn.innerHTML = `
      <span class="btn-text">Акаунтът е създаден!</span>
      <span class="btn-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4.16667 10L8.33333 14.1667L15.8333 5.83333" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    `;
    
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
    
  } catch (error) {
    console.error('Registration error:', error);
    alert('Възникна грешка. Моля, опитайте отново.');
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

termsCheckbox.addEventListener('change', () => {
  termsCheckbox.closest('.checkbox-wrapper').classList.remove('error');
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
