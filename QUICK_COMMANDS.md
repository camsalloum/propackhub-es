# Quick Commands Reference

## Database Setup

```bash
# Create database (one-time)
psql -U postgres -c "CREATE DATABASE estimation_studio;"
psql -U postgres -c "CREATE USER es_user WITH PASSWORD 'es_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE estimation_studio TO es_user;"

# Or using Docker
docker run --name es-db -e POSTGRES_USER=es_user -e POSTGRES_PASSWORD=es_password -e POSTGRES_DB=estimation_studio -p 5432:5432 -d postgres:15

# Verify connection
psql -U es_user -d estimation_studio -h localhost
```

## Environment Setup

```bash
# Server
cd packages/server
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET

# Web
cd packages/web
cp .env.example .env
```

## Database Migrations

```bash
cd packages/server

# Generate migrations from schema changes
npm run db:generate

# Apply migrations to database
npm run db:push

# Or using drizzle-kit directly
npx drizzle-kit push:pg
npx drizzle-kit studio  # GUI for viewing database
```

## Development

```bash
# From project root

# Install all dependencies
npm install

# Start both servers
npm run dev
npm run start:servers

# Start individually
npm run dev:server  # API on 5001
npm run dev:web     # Web on 5000

# Or use Windows batch files
RUN-ES.bat          # Auto-opens browser
start.bat           # Simple start
```

## Testing APIs

```bash
# Register new account
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"demo@example.com",
    "password":"password123",
    "displayName":"Demo User",
    "tenantName":"Demo Company"
  }'

# Login and get token
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'

# Use token to access protected routes
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/v1/materials

# Check API health
curl http://localhost:5001/health

# View API documentation
curl http://localhost:5001/api/v1
```

## Building for Production

```bash
# Build all packages
npm run build

# Build individual packages
npm run build --workspace=packages/engine
npm run build --workspace=packages/server
npm run build --workspace=packages/web

# Output locations:
# - engine: packages/engine/dist/
# - server: packages/server/dist/
# - web: packages/web/dist/
```

## Linting & Formatting

```bash
# Lint all code
npm run lint

# Format all code
npm run format

# Format specific directory
npx prettier --write packages/server/src
```

## Troubleshooting

```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT 1"

# View database schema (with Drizzle Studio)
cd packages/server
npx drizzle-kit studio

# Check if ports are in use
# Windows:
netstat -ano | findstr :5001
netstat -ano | findstr :5000

# Mac/Linux:
lsof -i :5001
lsof -i :5000

# Reinstall dependencies (clean slate)
rm -rf node_modules
npm install

# Check Node version
node --version  # Should be 22+

# View environment config
cd packages/server && cat .env
cd packages/web && cat .env
```

## Git & Version Control

```bash
# Check git status
git status

# Add changes
git add .

# Commit
git commit -m "feat: add authentication system"

# Push
git push origin main
```

## Useful Links

- Web app: http://localhost:5000
- API health: http://localhost:5001/health
- API docs: http://localhost:5001/api/v1
- Database (Drizzle Studio): `npx drizzle-kit studio`

## Environment Variables Reference

**Server (.env)**
```
DATABASE_URL=postgresql://es_user:es_password@localhost:5432/estimation_studio
PORT=5001
HOST=0.0.0.0
NODE_ENV=development
JWT_SECRET=your-secret-key-min-32-chars
CORS_ORIGIN=http://localhost:5000
```

**Web (.env)**
```
VITE_API_URL=http://localhost:5001
```

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `ECONNREFUSED 127.0.0.1:5432` | Start PostgreSQL: `brew services start postgresql@15` or Docker |
| `EADDRINUSE :::5001` | Change PORT in `.env` or kill process: `lsof -i :5001 \| kill PID` |
| `Unauthorized` | Check JWT_SECRET matches between frontend and backend |
| `Database not initialized` | Run `npm run db:push` in packages/server |
| `Module not found` | Run `npm install` in root directory |
| `Port 5000 already in use` | Check if another vite dev server is running |

## Performance Tips

- Database indexes are auto-created on tenant_id, status, created_at
- Connection pooling is configured
- JWT validation is < 1ms
- Calculation engine runs client-side (0ms API latency)

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (min 32 random chars)
- [ ] Enable `HTTPS` only
- [ ] Configure `CORS_ORIGIN` to exact domain
- [ ] Setup database backups
- [ ] Enable error logging (Sentry, etc.)
- [ ] Add rate limiting
- [ ] Configure health checks
- [ ] Setup monitoring/alerts
- [ ] Test backup/restore process

---

**Need help?** Check SETUP.md for detailed instructions or IMPLEMENTATION_COMPLETE.md for architecture overview.