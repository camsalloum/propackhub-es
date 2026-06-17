import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://es_user:es_password@localhost:5432/estimation_studio';

async function fixTenants() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Add missing columns to tenants (matching schema.ts)
    await client.query(`
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'individual';
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS exchange_rate_updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#0F1F3D';
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS footer_text TEXT;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_markup_percent DECIMAL(5, 2) DEFAULT 15.00;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_slab_template VARCHAR(50) DEFAULT 'standard';
    `);
    console.log('✓ Added missing columns to tenants');
    
    // Update existing rows
    await client.query(`
      UPDATE tenants SET type = 'company' WHERE type IS NULL;
    `);
    console.log('✓ Updated existing tenants');
    
    console.log('Done');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

fixTenants();