/* ============================================================
   SimuLab — Main JavaScript
   Add/edit interactivity here. Separated for easy editing.
   ============================================================ */

// ── Navbar scroll effect ──────────────────────────────────────
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Active nav link highlighting ──────────────────────────────
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('section[id]');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const activeLink = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
      if (activeLink) activeLink.classList.add('active');
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => observer.observe(s));

// ── Fade-in on scroll ─────────────────────────────────────────
const fadeEls = document.querySelectorAll('[data-fade]');
const fadeObs = new IntersectionObserver(entries => {
  entries.forEach(el => {
    if (el.isIntersecting) {
      el.target.style.animationPlayState = 'running';
      el.target.classList.add('visible');
      fadeObs.unobserve(el.target);
    }
  });
}, { threshold: 0.1 });

fadeEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  fadeObs.observe(el);
});

// When element enters view, animate it

// ── Simulated sensor data updates ─────────────────────────────
function randomInRange(min, max) {
  return (Math.random() * (max - min) + min).toFixed(1);
}

function updateSensorValues() {
  const sensorValues = {
    'sensor-temp':    () => `${randomInRange(24.0, 28.5)}°C`,
    'sensor-humid':   () => `${randomInRange(55, 72)}%`,
    'sensor-light':   () => `${Math.floor(randomInRange(300, 800))} lx`,
    'sensor-pir':     () => Math.random() > 0.7 ? 'ACTIVE' : 'IDLE',
    'sensor-sound':   () => `${Math.floor(randomInRange(35, 80))} dB`,
  };

  Object.entries(sensorValues).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = fn();
      el.classList.add('blink');
      setTimeout(() => el.classList.remove('blink'), 300);
    }
  });

  // Update stat values too
  const statEls = document.querySelectorAll('.live-stat');
  statEls.forEach(el => {
    const base = parseFloat(el.dataset.base || 0);
    const variance = parseFloat(el.dataset.variance || 0.5);
    const suffix = el.dataset.suffix || '';
    el.textContent = (base + (Math.random() - 0.5) * variance).toFixed(1) + suffix;
  });
}

// Update every 2.5 seconds
setInterval(updateSensorValues, 2500);
updateSensorValues(); // Run immediately

// ── Waitlist form ─────────────────────────────────────────────
const waitlistForms = document.querySelectorAll('.waitlist-form');
waitlistForms.forEach(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn   = form.querySelector('.btn-primary');
    if (!input || !input.value) return;

    btn.textContent = '✓ You\'re in!';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    input.value = '';
    input.placeholder = 'Welcome aboard!';

    setTimeout(() => {
      btn.textContent = 'Join Waitlist';
      btn.style.background = '';
      input.placeholder = 'Your email';
    }, 3000);
  });
});

// ── Sidebar nav in dashboard ───────────────────────────────────
const sidebarItems = document.querySelectorAll('.sidebar-item');
sidebarItems.forEach(item => {
  item.addEventListener('click', () => {
    sidebarItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

// ── Hamburger menu ─────────────────────────────────────────────
const hamburger = document.querySelector('.hamburger');
const navLinksEl = document.querySelector('.nav-links');

if (hamburger && navLinksEl) {
  hamburger.addEventListener('click', () => {
    navLinksEl.style.display = navLinksEl.style.display === 'flex' ? 'none' : 'flex';
    navLinksEl.style.flexDirection = 'column';
    navLinksEl.style.position = 'absolute';
    navLinksEl.style.top = '60px';
    navLinksEl.style.left = '0';
    navLinksEl.style.right = '0';
    navLinksEl.style.background = 'rgba(13, 10, 26, 0.98)';
    navLinksEl.style.padding = '16px';
    navLinksEl.style.borderRadius = '0 0 16px 16px';
    navLinksEl.style.borderTop = '1px solid rgba(138, 99, 255, 0.18)';
  });
}

// ── Mini SVG chart lines animation ────────────────────────────
function generateChartPath(points, w, h) {
  const step = w / (points.length - 1);
  const max  = Math.max(...points);
  const min  = Math.min(...points);
  const range = max - min || 1;

  return points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 10) - 5;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
}

// Animate the chart paths in dashboard
const chartEls = document.querySelectorAll('.chart-line');
chartEls.forEach(path => {
  const len = path.getTotalLength?.() || 200;
  path.style.strokeDasharray  = len;
  path.style.strokeDashoffset = len;
  path.style.transition = 'stroke-dashoffset 1.5s ease';
  setTimeout(() => { path.style.strokeDashoffset = 0; }, 400);
});

// Blink style for live updates
const style = document.createElement('style');
style.textContent = `
  .blink { animation: value-blink 0.3s ease; }
  @keyframes value-blink {
    0%   { color: var(--color-primary-light); }
    50%  { color: var(--color-accent-green);  }
    100% { color: var(--color-primary-light); }
  }
`;
document.head.appendChild(style);

// ── Board switcher ─────────────────────────────────────────────
const BOARDS = {
  esp32:   { name: 'ESP32 DevKit v1',    freq: '240 MHz', cores: '2',   ram: '320KB' },
  uno:     { name: 'Arduino Uno R3',     freq: '16 MHz',  cores: '1',   ram: '2KB'   },
  nano:    { name: 'Arduino Nano',       freq: '16 MHz',  cores: '1',   ram: '2KB'   },
  esp8266: { name: 'ESP8266 NodeMCU',    freq: '80 MHz',  cores: '1',   ram: '80KB'  },
  mega:    { name: 'Arduino Mega 2560',  freq: '16 MHz',  cores: '1',   ram: '8KB'   },
  pico:    { name: 'Raspberry Pi Pico',  freq: '133 MHz', cores: '2',   ram: '264KB' },
  stm32:   { name: 'STM32 BluePill',     freq: '72 MHz',  cores: '1',   ram: '20KB'  },
  attiny:  { name: 'ATtiny85',           freq: '8 MHz',   cores: '1',   ram: '0.5KB' },
};

window.switchBoard = function(name, key) {
  // Update board name in dashboard header
  const bn = document.getElementById('board-name');
  if (bn) bn.textContent = BOARDS[key]?.name || name;

  // Update chip card
  const chipTitle = document.querySelector('.chip-title');
  if (chipTitle) chipTitle.textContent = `${BOARDS[key]?.name || name} — GPIO Live`;
  const chipMeta = document.querySelector('.chip-meta');
  if (chipMeta) {
    const b = BOARDS[key] || {};
    chipMeta.innerHTML = `Freq: <span>${b.freq||'?'}</span> &nbsp;|&nbsp; Cores: <span>${b.cores||'?'}</span> &nbsp;|&nbsp; RAM: <span>${b.ram||'?'}</span>`;
  }

  // Sidebar active state
  document.querySelectorAll('.dash-sidebar .sidebar-item').forEach(i => i.classList.remove('active'));
  const target = document.getElementById('board-' + key);
  if (target) target.classList.add('active');
};

// ── Extra live sensor IDs ──────────────────────────────────────
const extraSensors = {
  'sensor-ultra': () => `${(Math.random()*80+5).toFixed(1)} cm`,
  'sensor-gas':   () => `${Math.floor(Math.random()*300+80)} ppm`,
  'sensor-soil':  () => `${Math.floor(Math.random()*40+45)}%`,
  'sensor-imu':   () => `X:${((Math.random()-0.5)*0.1).toFixed(2)} g`,
  'sensor-baro':  () => `${(1013 + (Math.random()-0.5)*4).toFixed(0)} hPa`,
  'sensor-ir':    () => Math.random() > 0.8 ? 'BLOCKED' : 'CLEAR',
};

setInterval(() => {
  Object.entries(extraSensors).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = fn();
      el.classList.add('blink');
      setTimeout(() => el.classList.remove('blink'), 300);
    }
  });
}, 2500);
