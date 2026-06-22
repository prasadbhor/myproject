const express    = require('express');
const bodyParser = require('body-parser');
const Datastore  = require('nedb');
const path       = require('path');
const fs         = require('fs');
const session    = require('express-session');
const { body, validationResult } = require('express-validator');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── ENV / CONFIG ────────────────────────────────────────────────────────────
const ADMIN_TOKEN    = process.env.ADMIN_TOKEN    || 'hsp-admin-2024';
const ADMIN_USER     = process.env.ADMIN_USER     || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'HSP@Savarkar2024';
const SESSION_SECRET = process.env.SESSION_SECRET || 'hsp-secret-savarkar';

// Community group links — set via ENV or update these defaults
const WA_GROUP_LINK = process.env.WA_GROUP_LINK || 'https://chat.whatsapp.com/YOUR_WHATSAPP_INVITE_CODE';
const TG_GROUP_LINK = process.env.TG_GROUP_LINK || 'https://t.me/YOUR_TELEGRAM_CHANNEL';
const YT_CHANNEL    = process.env.YT_CHANNEL    || 'https://www.youtube.com/@HinduSwarajParty';

// ── SECURITY HEADERS ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── DATABASE ────────────────────────────────────────────────────────────────
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
const db = new Datastore({ filename: './data/members.db', autoload: true });
db.ensureIndex({ fieldName: 'email', unique: true }, () => {});

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 4 * 60 * 60 * 1000 }, // 4-hour session
}));

// ── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
const requireSession = (req, res, next) => {
  if (req.session && req.session.adminLoggedIn) return next();
  res.redirect('/admin/login');
};

// Legacy token auth (for backward-compat API calls / export)
const requireToken = (req, res, next) => {
  if (req.session && req.session.adminLoggedIn) return next();
  const token = req.query.token || req.headers['x-admin-token'];
  if (token === ADMIN_TOKEN) return next();
  return res.status(403).json({ error: 'Access Denied' });
};

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Home
app.get('/', (req, res) => {
  db.count({}, (err, count) => {
    res.render('index', { memberCount: count || 0, success: null, error: null });
  });
});

// Join form
app.post('/join', [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().isLength({ min: 10 }).isNumeric().withMessage('Valid 10-digit phone number required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return db.count({}, (err, count) => {
      res.render('index', { memberCount: count || 0, success: null, error: errors.array()[0].msg });
    });
  }
  const { full_name, email, phone, city, state, occupation, message } = req.body;
  db.findOne({ email }, (err, existing) => {
    if (existing) {
      return db.count({}, (err2, count) => {
        res.render('index', { memberCount: count || 0, success: null, error: 'This email is already registered as a member.' });
      });
    }
    db.insert(
      { full_name, email, phone, city, state, occupation: occupation || '', message: message || '', createdAt: new Date() },
      (err2, doc) => {
        if (err2) return res.render('index', { memberCount: 0, success: null, error: 'Registration failed. Please try again.' });
        db.count({}, (err3, count) => {
          res.render('index', {
            memberCount: count || 0,
            success: `🙏 Jay Shri Ram! Welcome, ${full_name}! You have successfully joined Hindu Swaraj Party.`,
            error: null,
          });
        });
      }
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLIC API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Health check
app.get('/health', (req, res) => {
  db.count({}, (err, count) => {
    if (err) return res.status(503).json({ status: 'error', message: err.message });
    res.json({ status: 'ok', members: count, uptime: process.uptime(), timestamp: new Date().toISOString() });
  });
});

// Member count
app.get('/api/members/count', (req, res) => {
  db.count({}, (err, count) => res.json({ count: count || 0, updatedAt: new Date().toISOString() }));
});

// Stats summary
app.get('/api/stats', (req, res) => {
  db.find({}, (err, docs) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const today = new Date(); today.setHours(0,0,0,0);
    const month = new Date(today.getFullYear(), today.getMonth(), 1);
    const states = new Set(docs.map(d => d.state).filter(Boolean));
    res.json({
      total:       docs.length,
      today:       docs.filter(d => new Date(d.createdAt) >= today).length,
      thisMonth:   docs.filter(d => new Date(d.createdAt) >= month).length,
      stateCount:  states.size,
      states:      [...states].sort(),
      updatedAt:   new Date().toISOString(),
    });
  });
});

// WhatsApp community API
app.get('/api/community/whatsapp', (req, res) => {
  res.json({
    platform:    'WhatsApp',
    status:      'active',
    groupName:   'Hindu Swaraj Party - Official',
    inviteLink:  WA_GROUP_LINK,
    members:     '2,400+',
    description: 'Official WhatsApp group for daily updates, rally info & party news',
    updatedAt:   new Date().toISOString(),
  });
});

// Join WhatsApp — redirect
app.get('/api/community/whatsapp/join', (req, res) => {
  // Log the join action
  console.log(`[${new Date().toISOString()}] WhatsApp join redirect triggered`);
  res.json({ success: true, redirectUrl: WA_GROUP_LINK, platform: 'WhatsApp' });
});

// Telegram community API
app.get('/api/community/telegram', (req, res) => {
  res.json({
    platform:    'Telegram',
    status:      'active',
    channelName: '@HinduSwarajParty',
    inviteLink:  TG_GROUP_LINK,
    subscribers: '5,100+',
    description: 'Official Telegram channel for news, ideology, and member content',
    updatedAt:   new Date().toISOString(),
  });
});

// Join Telegram — redirect
app.get('/api/community/telegram/join', (req, res) => {
  console.log(`[${new Date().toISOString()}] Telegram join redirect triggered`);
  res.json({ success: true, redirectUrl: TG_GROUP_LINK, platform: 'Telegram' });
});

// YouTube API
app.get('/api/community/youtube', (req, res) => {
  res.json({
    platform:    'YouTube',
    status:      'active',
    channelName: 'Hindu Swaraj Party',
    channelUrl:  YT_CHANNEL,
    subscribers: '1,800+',
    description: 'Speeches, documentaries & Veer Savarkar ideology videos',
    updatedAt:   new Date().toISOString(),
  });
});

// Combined community info
app.get('/api/community/all', (req, res) => {
  res.json({
    whatsapp: { platform:'WhatsApp', link: WA_GROUP_LINK, members:'2,400+', status:'active' },
    telegram: { platform:'Telegram', link: TG_GROUP_LINK, members:'5,100+', status:'active' },
    youtube:  { platform:'YouTube',  link: YT_CHANNEL,    members:'1,800+', status:'active' },
    updatedAt: new Date().toISOString(),
  });
});

// Savarkar facts API (public info)
app.get('/api/savarkar/facts', (req, res) => {
  res.json({
    name:       'Vinayak Damodar Savarkar',
    title:      'Veer Savarkar / Swatantryaveer',
    born:       '28 May 1883, Bhagur, Maharashtra',
    passed:     '26 February 1966, Mumbai',
    ideology:   'Hindutva, Hindu Nationalism, Social Reform',
    keyWork:    'Hindutva: Who is a Hindu? (1923)',
    prison:     'Cellular Jail (Kala Pani), Andaman — 11 years',
    award:      'Bharat Ratna 2024 (posthumous)',
    quote:      'If you cut my body into pieces, every piece would cry — Jai Hind! Jai Bharat!',
    pillars:    ['Hindutva', 'Armed Resistance', 'Social Reform', 'Scientific Temper', 'Hindu Rashtra', 'Absolute Independence'],
    updatedAt:  new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Show login page
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.adminLoggedIn) return res.redirect('/admin/members');
  res.render('admin-login', { error: null });
});

// Process login
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    req.session.adminLoggedIn = true;
    req.session.adminUser     = username;
    console.log(`[${new Date().toISOString()}] Admin login: ${username}`);
    return res.redirect('/admin/members');
  }
  res.render('admin-login', { error: 'Invalid username or password. Please try again.' });
});

// Logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// Redirect /admin → login
app.get('/admin', (req, res) => res.redirect('/admin/members'));

// ═══════════════════════════════════════════════════════════════════════════
//  PROTECTED ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════

app.get('/admin/members', requireSession, (req, res) => {
  db.find({}).sort({ createdAt: -1 }).exec((err, docs) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const month = new Date(today.getFullYear(), today.getMonth(), 1);
    const states = new Set(docs.map(d => d.state).filter(Boolean));
    res.render('admin', {
      members:    docs || [],
      adminUser:  req.session.adminUser || ADMIN_USER,
      todayCount: docs.filter(d => new Date(d.createdAt) >= today).length,
      monthCount: docs.filter(d => new Date(d.createdAt) >= month).length,
      stateCount: states.size,
    });
  });
});

// CSV export (session or token)
app.get('/admin/members/export', requireToken, (req, res) => {
  db.find({}).sort({ createdAt: -1 }).exec((err, docs) => {
    if (err) return res.status(500).send('Export failed');
    const header = 'Name,Email,Phone,City,State,Occupation,Message,Registered\n';
    const rows   = docs.map(m =>
      [m.full_name, m.email, m.phone, m.city, m.state, m.occupation, m.message, new Date(m.createdAt).toISOString()]
        .map(v => `"${String(v||'').replace(/"/g,'""')}"`)
        .join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hsp-members-${Date.now()}.csv"`);
    res.send(header + rows);
  });
});

// Admin stats API (protected)
app.get('/admin/api/stats', requireToken, (req, res) => {
  db.find({}, (err, docs) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    const today = new Date(); today.setHours(0,0,0,0);
    const month = new Date(today.getFullYear(), today.getMonth(), 1);
    const occ   = {};
    docs.forEach(d => { if (d.occupation) occ[d.occupation] = (occ[d.occupation]||0)+1; });
    res.json({ total: docs.length, today: docs.filter(d=>new Date(d.createdAt)>=today).length, thisMonth: docs.filter(d=>new Date(d.createdAt)>=month).length, occupations: occ });
  });
});

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send('<h1 style="font-family:sans-serif;text-align:center;margin-top:4rem;">404 — Page not found<br><a href="/">← Go Home</a></h1>');
});

app.listen(PORT, () => {
  console.log(`🕉  Hindu Swaraj Party → http://localhost:${PORT}`);
  console.log(`🔐  Admin login      → http://localhost:${PORT}/admin/login`);
  console.log(`📋  Member registry  → http://localhost:${PORT}/admin/members`);
  console.log(`🌐  Community APIs   → http://localhost:${PORT}/api/community/all`);
});
