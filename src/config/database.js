const { Pool } = require('pg');

// Conectamos escribiendo los datos directamente, saltándonos Render
const pool = new Pool({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.flvcxotyxesyvqbjqvxm',
  password: 'TalmaBase2026', // <-- BORRA ESTO Y PON TU CONTRASEÑA REAL AQUÍ
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

// Esta función hará una prueba de conexión apenas el servidor encienda
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ ERROR FATAL AL CONECTAR A LA BASE DE DATOS:', err);
  } else {
    console.log('✅ ¡CONEXIÓN A SUPABASE EXITOSA!');
    release();
  }
});

module.exports = pool;