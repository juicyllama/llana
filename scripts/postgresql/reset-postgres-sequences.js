const { Client } = require('pg');

async function resetPostgresSequences() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'user',
    password: 'pass',
    database: 'llana'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Get all tables in the database
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('Tables found:', tables);

    // For each table, get primary key column and reset its sequence if it exists
    for (const table of tables) {
      try {
        // Get primary key column for the table
        const pkResult = await client.query(`
          SELECT a.attname as column_name
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = '"${table}"'::regclass
          AND i.indisprimary
        `);

        if (pkResult.rows.length > 0) {
          const pkColumn = pkResult.rows[0].column_name;
          console.log(`Table "${table}" has primary key: "${pkColumn}"`);

          // Check if sequence exists for this primary key
          const sequenceResult = await client.query(`
            SELECT pg_get_serial_sequence('"${table}"', '${pkColumn}') as sequence_name
          `);

          const sequenceName = sequenceResult.rows[0].sequence_name;
          
          if (sequenceName) {
            // Get max value from the table
            const maxResult = await client.query(`
              SELECT MAX("${pkColumn}") as max_value FROM "${table}"
            `);
            
            const maxValue = maxResult.rows[0].max_value || 0;
            
            // Reset the sequence
            const resetResult = await client.query(`
              SELECT setval('${sequenceName}', ${maxValue})
            `);
            
            console.log(`Reset sequence "${sequenceName}" to ${resetResult.rows[0].setval}`);
          } else {
            console.log(`No sequence found for "${table}.${pkColumn}"`);
          }
        } else {
          console.log(`No primary key found for table "${table}"`);
        }
      } catch (tableError) {
        console.error(`Error processing table "${table}":`, tableError.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Disconnected from PostgreSQL');
  }
}

resetPostgresSequences();