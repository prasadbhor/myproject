const express = require('express');
const bodyParser = require('body-parser');
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Ensure data dir exists
if (!fs.existsSync('./data')) fs.mkdirSync('./data');

// NeDB setup
const db = new Datastore({ filename: './data/members.db', autoload: true });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Admin auth middleware ──────────────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'hsp-admin-2024';
const requireAdmin = (req, res, next) => {
  const token = req.query.token || req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) return res.status(403).send('Access Denied');
  next();
};

// ── Routes ─────────────────────────────────────────────────────────────────

// Health check (used by Docker HEALTHCHECK & Jenkins smoke test)
app.get('/health', (req, res) => {
  db.count({}, (err, count) => {
    if (err) return res.status(503).json({ status: 'error', message: err.message });
    res.json({
      status: 'ok',
      members: count,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
});

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

// Admin — view members
app.get('/admin/members', requireAdmin, (req, res) => {
  db.find({}).sort({ createdAt: -1 }).exec((err, docs) => {
    res.render('admin', { members: docs || [], token: ADMIN_TOKEN });
  });
});

// Admin — CSV export
app.get('/admin/members/export', requireAdmin, (req, res) => {
  db.find({}).sort({ createdAt: -1 }).exec((err, docs) => {
    if (err) return res.status(500).send('Export failed');
    const header = 'Name,Email,Phone,City,State,Occupation,Message,Registered\n';
    const rows = docs.map(m =>
      [m.full_name, m.email, m.phone, m.city, m.state, m.occupation, m.message, new Date(m.createdAt).toISOString()]
        .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hsp-members-${Date.now()}.csv"`);
    res.send(header + rows);
  });
});

// API — member count
app.get('/api/members/count', (req, res) => {
  db.count({}, (err, count) => res.json({ count: count || 0 }));
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('<h1 style="font-family:sans-serif;text-align:center;margin-top:4rem;">404 — Page not found<br><a href="/">← Go Home</a></h1>');
});

app.listen(PORT, () => {
  console.log(`🕉  Hindu Swaraj Party running → http://localhost:${PORT}`);
});
