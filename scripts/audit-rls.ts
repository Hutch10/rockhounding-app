import fs from 'fs';
import path from 'path';

/**
 * RLS Audit Script
 * Scans migrations for tables missing ENABLE ROW LEVEL SECURITY.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

async function auditRls() {
  console.log('🔍 Starting RLS Audit of migrations...');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
  const tables: Set<string> = new Set();
  const rlsEnabled: Set<string> = new Set();

  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    // Match CREATE TABLE [IF NOT EXISTS] [schema.]table_name
    const createTableRegex =
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:"?(\w+)"?\.)?"?(\w+)"?)/gi;
    let match;
    while ((match = createTableRegex.exec(content)) !== null) {
      const schema = match[1];
      const tableName = match[2];
      if (tableName) {
        const fullTableName = schema ? `${schema}.${tableName}` : tableName;
        if (!schema || schema.toLowerCase() === 'public') {
          tables.add(tableName.toLowerCase());
        }
      }
    }

    // Match ALTER TABLE [schema.]table_name ENABLE ROW LEVEL SECURITY
    const enableRlsRegex =
      /ALTER\s+TABLE\s+(?:(?:"?(\w+)"?\.)?"?(\w+)"?)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
    while ((match = enableRlsRegex.exec(content)) !== null) {
      const tableName = match[2];
      if (tableName) rlsEnabled.add(tableName.toLowerCase());
    }
  }

  const missing = Array.from(tables).filter((t) => !rlsEnabled.has(t));

  console.log(`📊 Summary:`);
  console.log(`- Total tables found: ${tables.size}`);
  console.log(`- RLS enabled on: ${rlsEnabled.size}`);

  if (missing.length > 0) {
    console.error(`\n❌ CRITICAL: ${missing.length} tables are missing RLS!`);
    missing.forEach((t) => console.error(`  - ${t}`));
    process.exit(1);
  } else {
    console.log('\n✅ All tables have RLS enabled.');
  }
}

auditRls().catch((err) => {
  console.error(err);
  process.exit(1);
});
