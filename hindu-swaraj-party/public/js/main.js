// Hindu Swaraj Party — Main JS

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 60) {
    navbar.style.borderBottomColor = '#FF9933';
    navbar.style.boxShadow = '0 4px 20px rgba(255,153,51,0.15)';
  } else {
    navbar.style.boxShadow = 'none';
  }
});

// Mobile menu toggle
function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('open');
}

// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 90;
    if (window.scrollY >= top) current = section.getAttribute('id');
  });
  navLinks.forEach(link => {
    link.style.color = link.getAttribute('href') === '#' + current ? '#FFD700' : '';
  });
});

// Scroll reveal animation
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.ideology-card, .value-card, .agenda-item, .contact-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// Form validation
const joinForm = document.getElementById('joinForm');
if (joinForm) {
  joinForm.addEventListener('submit', (e) => {
    const phone = joinForm.querySelector('[name="phone"]').value;
    if (phone.replace(/\D/g, '').length < 10) {
      e.preventDefault();
      alert('Please enter a valid 10-digit phone number.');
    }
  });
}

// Smooth scrolling for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Counter animation for stats
function animateCounter(el, target) {
  let current = 0;
  const step = Math.ceil(target / 60);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current + '+';
    if (current >= target) clearInterval(timer);
  }, 30);
}

const heroCount = document.getElementById('memberCountHero');
if (heroCount) {
  const targetNum = parseInt(heroCount.textContent) || 0;
  const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && targetNum > 0) {
        animateCounter(heroCount, targetNum);
        heroObserver.disconnect();
      }
    });
  });
  heroObserver.observe(heroCount);
}

/* ================================================================
   FEATURE/UI-UPGRADE — Community APIs & Admin Status Pings
   ================================================================ */

// Fetch community stats from APIs and update UI
async function loadCommunityStats() {
  try {
    const res  = await fetch('/api/community/all');
    const data = await res.json();

    const waEl = document.getElementById('wa-members');
    const tgEl = document.getElementById('tg-members');
    const ytEl = document.getElementById('yt-members');

    if (waEl) waEl.textContent = '👥 ' + (data.whatsapp?.members || '2,400+') + ' Members';
    if (tgEl) tgEl.textContent = '👥 ' + (data.telegram?.members || '5,100+') + ' Subscribers';
    if (ytEl) ytEl.textContent = '👥 ' + (data.youtube?.members  || '1,800+') + ' Subscribers';
  } catch (e) {
    console.warn('Community stats API error:', e);
  }
}

// Join community handler — hits API then redirects
async function joinCommunity(platform) {
  const btnId  = platform === 'whatsapp' ? 'waJoinBtn'  : platform === 'telegram' ? 'tgJoinBtn'  : 'ytJoinBtn';
  const spinId = platform === 'whatsapp' ? 'wa-spinner' : platform === 'telegram' ? 'tg-spinner' : 'yt-spinner';
  const statId = platform === 'whatsapp' ? 'wa-status'  : platform === 'telegram' ? 'tg-status'  : 'yt-status';

  const btn  = document.getElementById(btnId);
  const spin = document.getElementById(spinId);
  const stat = document.getElementById(statId);

  if (btn)  btn.disabled = true;
  if (spin) spin.style.display = 'inline-block';

  try {
    let apiUrl, redirectUrl;
    if (platform === 'whatsapp') {
      const r = await fetch('/api/community/whatsapp/join');
      const d = await r.json();
      redirectUrl = d.redirectUrl;
    } else if (platform === 'telegram') {
      const r = await fetch('/api/community/telegram/join');
      const d = await r.json();
      redirectUrl = d.redirectUrl;
    } else {
      const r = await fetch('/api/community/youtube');
      const d = await r.json();
      redirectUrl = d.channelUrl;
    }

    if (stat) { stat.textContent = '✅ Redirecting…'; stat.style.color = '#22c55e'; }
    setTimeout(() => {
      if (redirectUrl) window.open(redirectUrl, '_blank');
      if (btn)  btn.disabled  = false;
      if (spin) spin.style.display = 'none';
      if (stat) { stat.textContent = '✅ Link opened in new tab!'; }
    }, 800);

  } catch (e) {
    if (stat) { stat.textContent = '⚠️ Error. Try again.'; stat.style.color = '#ef4444'; }
    if (btn)  btn.disabled  = false;
    if (spin) spin.style.display = 'none';
    console.warn('Community join error:', e);
  }
}

// API status dashboard on homepage
async function pingApiStatus() {
  const apis = [
    { id: 'api-health',   url: '/health',                    label: 'Health Check' },
    { id: 'api-members',  url: '/api/members/count',         label: 'Members API'  },
    { id: 'api-wa',       url: '/api/community/whatsapp',    label: 'WhatsApp API' },
    { id: 'api-tg',       url: '/api/community/telegram',    label: 'Telegram API' },
  ];
  for (const api of apis) {
    const el = document.getElementById(api.id);
    if (!el) continue;
    try {
      const r  = await fetch(api.url);
      const ok = r.ok;
      const dot = el.querySelector('.api-dot');
      if (dot) dot.className = 'api-dot ' + (ok ? 'green' : 'red');
      el.childNodes[1].textContent = ' ' + api.label + (ok ? ' ✓' : ' ✗');
    } catch {
      const dot = el.querySelector('.api-dot');
      if (dot) dot.className = 'api-dot red';
      if (el.childNodes[1]) el.childNodes[1].textContent = ' ' + api.label + ' ✗';
    }
  }
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadCommunityStats();
  pingApiStatus();
  setInterval(pingApiStatus, 30000);
});
