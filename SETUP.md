# ProPackHub Estimation Studio - Setup Guide

## Prerequisites

- **Node.js 22+** — [Download](https://nodejs.org/)
- **PostgreSQL 15+** — [Download](https://www.postgresql.org/download/) or use Docker
- **npm** (comes with Node.js)

## Step 1: Setup PostgreSQL

### Option A: Local Installation
```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Windows
# Download installer from https://www.postgresql.org/download/windows/
# Follow installation wizard

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql-15
sudo systemctl start postgresql
```

### Option B: Docker
```bash
docker run --name estimation-studio-db \
  -e POSTGRES_USER=es_user \
  -e POSTGRES_PASSWORD=es_password \
  -e POSTGRES_DB=estimation_studio \
  -p 5432:5432 \
  -d postgres:15
```

### Create Database
```bash
# Using psql
psql -U postgres

# Then in psql:
CREATE DATABASE estimation_studio;
CREATE USER es_user WITH PASSWORD 'es_password';
GRANT ALL PRIVILEGES ON DATABASE estimation_studio TO es_user;
```

## Step 2: Environment Setup

### Server Configuration
```bash
cd packages/server
cp .env.example .env

# Edit .env and set:
# DATABASE_URL=postgresql://es_user:es_password@localhost:5432/estimation_studio
# JWT_SECRET=your-super-secret-key-change-this
# PORT=5001
# CORS_ORIGIN=http://localhost:5000
```

### Web Configuration
```bash
cd packages/web
cp .env.example .env

# Leave as default or change if API runs on different port:
# VITE_API_URL=http://localhost:5001
```

## Step 3: Install Dependencies

```bash
# From project root
npm install

# This installs dependencies for all packages (engine, server, web)
```

## Step 4: Initialize Database Schema

```bash
cd packages/server

# Generate migrations from schema
npm run db:generate

# Push schema to database
npm run db:push

# Or using Drizzle CLI directly:
npx drizzle-kit push:pg
```

**Expected output:**
```
✓ 0 migration(s) already applied
✓ Database schema is up to date
```

## Step 5: Start Development Servers

### Option A: Double-click Startup Scripts
- **`RUN-ES.bat`** (Windows) — Auto-opens browser
- **`start.bat`** (Windows) — Simple start

### Option B: Manual Start
```bash
# From project root
npm run start:servers

# Or individually:
npm run dev:server    # API on port 5001
npm run dev:web       # Web on port 5000
```

## Step 6: Access the Application

Open your browser:
- **Web App**: http://localhost:5000
- **API Health**: http://localhost:5001/health
- **API Docs**: http://localhost:5001/api/v1

## Step 7: First Time Setup

1. **Register a new account**
   - Email: `user@example.com`
   - Password: `password123`
   - Display Name: `Your Name`
   - Tenant Name: `My Company`

2. **Login**
   - Use same email/password

3. **Access Dashboard**
   - You should see empty dashboard
   - Ready to create estimates

## Troubleshooting

### Database Connection Error
```
error: ECONNREFUSED 127.0.0.1:5432
```
**Solution:**
- Check PostgreSQL is running: `psql -U postgres` should connect
- Verify `DATABASE_URL` in `.env`
- For Docker: `docker ps` should show running container

### Port Already in Use
```
error: EADDRINUSE :::5001
```
**Solution:**
- Change `PORT` in `packages/server/.env`
- Update `VITE_API_URL` in `packages/web/.env` to match

### JWT Secret Not Set
```
Error: JWT_SECRET environment variable is not set
```
**Solution:**
- Set `JWT_SECRET` in `packages/server/.env`
- For development: any string works

### Database Schema Not Found
```
error: relation "estimates" does not exist
```
**Solution:**
```bash
cd packages/server
npm run db:push
```

## Project Structure

```
packages/
├── engine/          # Pure costing calculation logic
│   └── src/
│       ├── calculator.ts
│       ├── types.ts
│       └── validator.ts
│
├── server/          # Fastify API server
│   └── src/
│       ├── db/
│       │   ├── schema.ts     # Drizzle schema
│       │   └── index.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── materials.ts
│       │   └── estimates.ts
│       ├── utils/
│       │   └── auth.ts
│       └── index.ts          # Server entrypoint
│
└── web/             # React SPA
    └── src/
        ├── pages/
        ├── components/
        ├── lib/
        │   └── api.ts
        └── main.tsx
```

## Database Schema

Key tables:
- `tenants` — Company/individual workspaces
- `users` — Team members with roles
- `materials` — Raw material library (USD)
- `estimates` — Cost estimates
- `layers` — Material layers in estimate
- `customers` — Customer contacts
- `processes` — Machine/operation costs
- `slabs` — Quantity pricing tiers
- `activity_logs` — Audit trail

## Next Steps

1. **Create a material** — Add PET, PE, Ink, Adhesive to library
2. **Create an estimate** — Build a structure and see real prices
3. **Review calculation** — Check that prices match Laravel formula
4. **Create slabs** — Add quantity pricing tiers
5. **Generate proposal** — Export PDF (coming soon)

## Development Commands

```bash
# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

## API Testing

Use Postman or curl:

### Register
```bash
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User",
    "tenantName": "Test Company"
  }'
```

### Login
```bash
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Materials
```bash
curl -X GET http://localhost:5001/api/v1/materials \
  -H "Authorization: Bearer <your-token>"
```

## Support

- **Issues?** Check error messages in terminal
- **Database?** Use `psql -U es_user -d estimation_studio` to inspect
- **API?** Check `http://localhost:5001/api/v1` for endpoint docs
