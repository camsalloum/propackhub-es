# Estimation Studio - Shortcuts Guide

## 🎯 Two Essential Shortcuts

### 1️⃣ RUN-ES.bat
**What:** Starts both servers (web + API)  
**When:** Every time you work on the project  
**Does:**
- Installs dependencies (first time only)
- Starts web server on port 5000
- Starts API server on port 5001
- Opens browser automatically

**Usage:** Double-click → wait 3 seconds → browser opens

---

### 2️⃣ GIT-SAVE.bat
**What:** Saves all changes to GitHub  
**When:** End of work session or after significant changes  
**Does:**
- Stages all changed files
- Commits with your message
- Pushes to GitHub

**Usage:** Double-click → enter message → done

---

### 3️⃣ SETUP-DATABASE.bat (One-Time Only)
**What:** Creates PostgreSQL database and tables  
**When:** First time setup ONLY  
**Does:**
- Creates database: estimation_studio
- Creates user: es_user
- Initializes all tables

**Usage:** Double-click → enter PostgreSQL password → done

---

## 📖 Quick Reference

```
Daily Workflow:
1. Double-click: RUN-ES.bat (start work)
2. Make changes to code
3. Double-click: GIT-SAVE.bat (save work)
4. Press Ctrl+C in server window (stop work)
```

## 🔗 Links

- **GitHub:** https://github.com/camsalloum/propackhub-es.git
- **Web App:** http://localhost:5000
- **API:** http://localhost:5001/api/v1

---

## 💡 Manual Commands (if needed)

### Start Servers Manually
```bash
npm run start:servers
```

### Save to GitHub Manually
```bash
git add .
git commit -m "your message"
git push origin main
```

### Check Git Status
```bash
git status
```

---

**That's it! Just 2 shortcuts for daily work.**
