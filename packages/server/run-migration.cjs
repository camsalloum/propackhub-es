const { execSync } = require('child_process');

async function run() {
  console.log('Running drizzle-kit push...');
  execSync('npx drizzle-kit push', { stdio: 'inherit', cwd: __dirname });
  console.log('Migration complete!');
}

run().catch(e => { console.error(e); process.exit(1); });