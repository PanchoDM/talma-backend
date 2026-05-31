const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Adapter: convierte placeholders ? de estilo MySQL a $1, $2, ... de PostgreSQL
// y devuelve [rows] para mantener la API compatible con todo el código existente.
async function query(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const result = await pool.query(pgSql, params);
  return [result.rows];
}

module.exports = { query };
