# Git Shortcuts Guide - Estimation Studio

Repository: https://github.com/camsalloum/propackhub-es.git

## Quick Reference

### 📝 GIT-STATUS.bat
**What it does:** Shows current changes, branch, and recent commits
**When to use:** Before committing to see what changed

### 💾 GIT-COMMIT.bat
**What it does:** Commits changes locally (does not push)
**When to use:** Save work without uploading to GitHub yet

### 🚀 GIT-PUSH.bat
**What it does:** Pushes committed changes to GitHub
**When to use:** After committing, to upload to GitHub

### ⚡ GIT-SAVE.bat (RECOMMENDED)
**What it does:** All-in-one: stages, commits, and pushes to GitHub
**When to use:** Quick save after work session

---

## Workflow

### Option 1: Quick Save (Fastest)
1. Double-click: **GIT-SAVE.bat**
2. Enter commit message (e.g., "Added database schema")
3. Done! ✅

### Option 2: Two-Step Save
1. Double-click: **GIT-COMMIT.bat**
   - Enter commit message
   - Commits locally
2. Double-click: **GIT-PUSH.bat**
   - Pushes to GitHub

### Option 3: Check First, Then Save
1. Double-click: **GIT-STATUS.bat**
   - Review what changed
2. Double-click: **GIT-SAVE.bat**
   - Save everything

---

## What Gets Committed?

### ✅ Included (tracked by git):
- Source code (packages/*)
- Documentation (docs/*.md)
- Configuration files (.prettierrc, tsconfig, etc.)
- Startup scripts (*.bat, *.ps1)
- Archive files (for reference)

### ❌ Excluded (ignored by git):
- node_modules/
- .env files (passwords/secrets)
- dist/ and build/ folders
- Database files (*.sql)
- Log files (*.log)
- package-lock.json

---

## Common Issues

### "Authentication failed"
**Solution:** Use GitHub Desktop or run in Git Bash:
```bash
git config --global credential.helper wincred
```

### "Push rejected"
**Solution:** Pull first, then push:
```bash
git pull origin main
git push origin main
```

### "Commit has no changes"
**Solution:** All files might be ignored. Check:
```bash
git status
```

---

## Manual Commands (if shortcuts fail)

```bash
# Check status
git status

# Stage all changes
git add .

# Commit
git commit -m "Your message"

# Push to GitHub
git push -u origin main

# Pull from GitHub
git pull origin main

# View history
git log --oneline -10
```

---

## Repository Info

- **Remote:** https://github.com/camsalloum/propackhub-es.git
- **Branch:** main (default)
- **Local Path:** d:\ProPackHub\apps\estimation-studio\

---

**Tip:** Use **GIT-SAVE.bat** at the end of each work session to keep GitHub updated!
