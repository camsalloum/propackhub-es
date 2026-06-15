# ProPackHub Estimation Studio

Flexible Packaging Cost Estimator - Standalone SaaS application.

## 🚀 Quick Start

### First Time Setup
1. **Setup Database** (one time only)
   - Double-click: `SETUP-DATABASE.bat`
   - Enter PostgreSQL password when asked

2. **Start Application**
   - Double-click: `RUN-ES.bat`
   - Opens http://localhost:5000 automatically

### Daily Use
- **Start:** Double-click `RUN-ES.bat`
- **Save to GitHub:** Double-click `GIT-SAVE.bat`

---

## 📦 What's Inside

### Backend (Complete ✅)
- PostgreSQL database (12 tables)
- Fastify API server
- JWT authentication with tenant isolation
- Materials library (USD pricing)
- Estimates with calculation engine
- Port: 5001

### Frontend (Auth Complete ✅)
- React SPA with Tailwind CSS
- Login/Register pages
- Protected routes
- Dashboard, Library, Settings pages
- Port: 5000

### Next Steps
- Wire UI pages to real API data
- Add PDF generation
- Implement re-quote feature

---

## 📚 Documentation

- **SETUP.md** - Detailed setup guide
- **IMPLEMENTATION_COMPLETE.md** - Technical overview
- **DATABASE_READY.md** - Database status
- **docs/ES_MEMORY.md** - Project decisions
- **docs/LIVE_STATE.md** - Current status

---

## 🔗 Links

- **Repository:** https://github.com/camsalloum/propackhub-es.git
- **Web:** http://localhost:5000
- **API:** http://localhost:5001/api/v1

---

## 🛠️ Manual Commands

```bash
# Install dependencies
npm install

# Start servers
npm run start:servers

# Database
cd packages/server
npm run db:push

# Git
git add .
git commit -m "message"
git push origin main
```

---

## 📋 Requirements

- Node.js 22+
- PostgreSQL 17 or 18
- Windows (batch files)

---

**Status:** Backend operational, frontend auth complete, ready for data integration.
