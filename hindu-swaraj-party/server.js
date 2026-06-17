const express = require('express');
const bodyParser = require('body-parser');
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data dir exists
if (!fs.existsSync('./data')) fs.mkdirSync('./data');

// NeDB setup (pure JS, no native compilation needed)
const db = new Datastore({ filename: './data/members.db', autoload: true });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  db.count({}, (err, count) => {
    res.render('index', { memberCount: count || 0, success: null, error: null });
  });
});

app.post('/join', [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Valid 10-digit phone number required'),
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

    db.insert({ full_name, email, phone, city, state, occupation, message, createdAt: new Date() }, (err2, doc) => {
      if (err2) return res.render('index', { memberCount: 0, success: null, error: 'Registration failed. Please try again.' });
      db.count({}, (err3, count) => {
        res.render('index', {
          memberCount: count || 0,
          success: `🙏 Jay Shri Ram! Welcome, ${full_name}! You have successfully joined Hindu Swaraj Party.`,
          error: null
        });
      });
    });
  });
});

// Admin panel
app.get('/admin/members', (req, res) => {
  const token = req.query.token;
  if (token !== (process.env.ADMIN_TOKEN || 'hsp-admin-2024')) return res.status(403).send('Access Denied');
  db.find({}).sort({ createdAt: -1 }).exec((err, docs) => {
    res.render('admin', { members: docs || [] });
  });
});

// API count
app.get('/api/members/count', (req, res) => {
  db.count({}, (err, count) => res.json({ count: count || 0 }));
});

app.listen(PORT, () => {
  console.log(`🕉  Hindu Swaraj Party running → http://localhost:${PORT}`);
});
