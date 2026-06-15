# Quick Start - ProPackHub Estimation Studio

## Windows Startup Options

### Option 1: Simple Batch File (Recommended)
**Double-click:** `start.bat`
- Installs dependencies if needed
- Starts both servers
- Opens browser to web app

### Option 2: PowerShell Script
**Right-click** `START-ES.ps1` and select **"Run with PowerShell"**
- More features and error checking
- Color-coded output
- Better troubleshooting

### Option 3: Detailed Batch File
**Double-click:** `START-ES.cmd`
- Comprehensive error checking
- Node.js version validation
- Detailed troubleshooting

## What Starts

1. **API Server** on port 5001
   - Health check: http://localhost:5001/health
   - API docs: http://localhost:5001/api/v1

2. **Web Application** on port 5000
   - Main app: http://localhost:5000
   - Dashboard: http://localhost:5000/dashboard

## Requirements

- **Node.js 22** or later (check with `node --version`)
- **npm** (comes with Node.js)
- **Windows 10/11** with PowerShell 5.1+

## Troubleshooting

### If nothing happens when double-clicking:
1. **Check Node.js**: Open Command Prompt and type `node --version`
2. **Run manually**: Open Command Prompt in this folder and run:
   ```
   npm install
   npm run start:servers
   ```

### If ports are in use:
- Change ports in:
  - `packages/web/vite.config.ts` (line 10)
  - `packages/server/src/index.ts` (line 27)

### If you see errors:
1. **Delete node_modules** and try again:
   ```
   rmdir /s node_modules
   npm install
   ```

## Development Commands

```bash
# Manual start (if scripts don't work)
npm install
npm run dev:server  # API on port 5001
npm run dev:web     # Web on port 5000

# Or both at once
npm run start:servers

# Build for production
npm run build

# Run tests
npm run test
```

## Success Indicators

When servers start successfully, you'll see:
```
✓ Web: http://localhost:5000
✓ API: http://localhost:5001
✓ Both servers running
```

Open your browser to http://localhost:5000 to see the Estimation Studio dashboard!