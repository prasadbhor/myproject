# 🕉 Hindu Swaraj Party — Official Website

> **हिंदू स्वराज पार्टी** | Party President: **Prasad Harishchandra Bhor**

A full-stack Node.js website for Hindu Swaraj Party with membership registration, built with Express + EJS + SQLite.

---

## 🚀 Quick Start

### Local Development
```bash
npm install
npm start
# Visit http://localhost:3000
```

### Docker
```bash
docker-compose up --build
# Visit http://localhost:3000
```

### Docker (manual)
```bash
docker build -t hindu-swaraj-party .
docker run -p 3000:3000 -v $(pwd)/data:/app/data hindu-swaraj-party
```

---

## 📁 Project Structure
```
hindu-swaraj-party/
├── server.js           # Express app + SQLite routes
├── views/
│   ├── index.ejs       # Main website template
│   └── admin.ejs       # Admin members view
├── public/
│   ├── css/style.css   # Full stylesheet
│   ├── js/main.js      # Frontend JavaScript
│   └── images/         # President photo & assets
├── data/               # SQLite DB (auto-created)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 🔐 Admin Panel
View all registered members at:
```
http://localhost:3000/admin/members?token=hsp-admin-2024
```
Change `ADMIN_TOKEN` in `docker-compose.yml` for production.

---

## 🌐 Deploy to GitHub Pages / Render / Railway

### Render.com (free)
1. Push to GitHub
2. New Web Service → connect repo
3. Build: `npm install` | Start: `node server.js`
4. Add env var `ADMIN_TOKEN=your-secret`

### Railway
1. Connect GitHub repo
2. Auto-detects Node.js
3. Done ✅

---

## 🛕 Features
- ✅ Full Hindu-themed UI (Saffron + Maroon + Gold)
- ✅ Party President profile with photo
- ✅ Membership registration form with validation
- ✅ SQLite database (no external DB needed)
- ✅ Admin panel to view all members
- ✅ Mobile responsive
- ✅ Docker ready
- ✅ Scroll animations

---

**जय हिंद 🇮🇳 | हर हर महादेव 🕉**
