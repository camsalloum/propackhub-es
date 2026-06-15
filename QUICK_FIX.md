# Quick Fix - Get ES Running

## Issue
Server needs PostgreSQL database to start.

## ✅ PostgreSQL is Installed - Setup Database

Since you already have PostgreSQL running, just setup the database:

### Option A: Double-Click Setup (EASIEST)
1. Double-click: **SETUP-DATABASE.bat**
2. Enter your PostgreSQL admin password when prompted
3. Wait for completion
4. Double-click: **RUN-ES.bat** to start

### Option B: Manual Setup
Open Command Prompt or PowerShell:

```bash
# Create database and user
psql -U postgres -f setup-db.sql

# Initialize schema
cd packages\server
npm run db:push
cd ..\..

# Start servers
RUN-ES.bat
```

---

## Option 2: Use SQLite (Quick Dev Mode)

If you don't want to install PostgreSQL right now, we can switch to SQLite temporarily.

Let me know and I'll convert the schema for you.

---

## Check if PostgreSQL is Running

```bash
# Windows Service
sc query postgresql-x64-16

# Or check if port 5432 is open
netstat -an | findstr 5432
```

---

## What's Working Without DB

- ✅ Web UI loads (Login/Register pages)
- ❌ Authentication won't work (needs DB)
- ❌ Material library won't work (needs DB)
- ❌ Estimates won't work (needs DB)

The frontend will start but API calls will fail.
