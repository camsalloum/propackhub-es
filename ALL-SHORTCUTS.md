# 🚀 All Shortcuts - Estimation Studio

Quick reference for all batch file shortcuts.

## 📂 Location
`d:\ProPackHub\apps\estimation-studio\`

---

## 🏃 Running the App

### RUN-ES.bat ⭐
**Double-click to start both servers**
- Web: http://localhost:5000
- API: http://localhost:5001
- Auto-opens browser after 3 seconds

### start.bat
Simple alternative to RUN-ES.bat

### START-ES.cmd
Comprehensive version with error checking

### START-ES.ps1
PowerShell version with color output

---

## 🗄️ Database Setup

### SETUP-DATABASE.bat
**One-time setup for PostgreSQL**
- Creates database: estimation_studio
- Creates user: es_user
- Initializes schema
- Run this ONCE before first use

---

## 📦 Git Operations

### GIT-SAVE.bat ⭐ (RECOMMENDED)
**Quick save: stage → commit → push in one go**
- Use at end of work session
- Uploads everything to GitHub

### GIT-COMMIT.bat
Commit changes locally (doesn't push)

### GIT-PUSH.bat
Push committed changes to GitHub

### GIT-STATUS.bat
View current changes and git status

---

## 📚 Documentation Files

### GIT-GUIDE.md
Complete guide to Git shortcuts

### QUICK-START.md
Quick start guide for first-time setup

### SETUP.md
Detailed setup instructions

### IMPLEMENTATION_COMPLETE.md
Technical overview of what was built

### DATABASE_READY.md
Database setup confirmation

### QUICK_COMMANDS.md
Command reference for npm scripts

### QUICK_FIX.md
Troubleshooting guide

---

## 💡 Recommended Workflow

### First Time Setup:
1. **SETUP-DATABASE.bat** (one time only)
2. **RUN-ES.bat** (start servers)
3. Open http://localhost:5000
4. Register account

### Daily Work:
1. **RUN-ES.bat** (start servers)
2. Make changes
3. **GIT-SAVE.bat** (save to GitHub)

### Check Status:
1. **GIT-STATUS.bat** (see changes)
2. **GIT-SAVE.bat** (commit if happy)

---

## 🔗 Important Links

- **GitHub:** https://github.com/camsalloum/propackhub-es.git
- **Web App:** http://localhost:5000
- **API:** http://localhost:5001/api/v1
- **Health Check:** http://localhost:5001/health

---

## 📋 What's Protected (Not Committed)

✅ Ignored by git:
- node_modules/
- .env files
- dist/ folders
- Database files
- Log files

✅ Committed to git:
- Source code
- Documentation
- Batch shortcuts
- Configuration
- Archive files

---

**Quick Tip:** Bookmark this file for easy reference!
