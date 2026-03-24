const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function clearDB() {
  await client.connect();
  console.log("Connected to DB...");
  await client.query('TRUNCATE TABLE chat_history CASCADE;');
  await client.query('TRUNCATE TABLE leads_mk CASCADE;');
  console.log("🔥 Successfully wiped chat_history and leads_mk for a fresh trial!");
  await client.end();
}

clearDB().catch(console.error);
