const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mkm:mkm2026@localhost:5433/mkm_crm',
});

async function setupBlogDB() {
  try {
    await client.connect();
    console.log('Connected to DB');

    const query = `
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        theme VARCHAR(255),
        target_keywords TEXT,
        human_insert TEXT,
        content TEXT,
        meta_description TEXT,
        featured_image VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(query);
    console.log('Articles table created or already exists.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await client.end();
  }
}

setupBlogDB();
