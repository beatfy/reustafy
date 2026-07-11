import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reustafy';
  console.log(`Connecting to database to run migrations...`);
  
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully. Reading migration file...');
    
    const migrationPath = path.join(__dirname, '../migrations/0000_init.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration script...');
    await client.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
