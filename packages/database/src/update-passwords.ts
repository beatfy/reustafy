import { Client } from 'pg';

async function updatePasswords() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:ZwPiPngDRJJSHdnWGZgIFnOsVEnHwTHW@tokaido.proxy.rlwy.net:40958/railway';
  console.log('Connecting to database to update user password hashes...');

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully. Setting bypass_rls context...');
    await client.query("SET app.bypass_rls = 'true'");
    
    console.log('Updating password hashes to match password123...');
    const result = await client.query(
      "UPDATE users SET password_hash = '$2a$10$6S30wILiammW//20yvTOlep.gULuf2NAu5qPyaMSUg0arbW9tHtG2'"
    );
    console.log(`Successfully updated ${result.rowCount} users!`);
  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    await client.end();
  }
}

updatePasswords();
