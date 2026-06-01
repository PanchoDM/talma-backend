const { Pool } = require('pg');

// Configuramos la conexión asegurando que el SSL esté activo (requerido por Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  console.error('Error inesperado en la base de datos:', err);
});

module.exports = pool;