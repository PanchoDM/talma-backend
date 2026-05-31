/**
 * setup.js — Ejecutar UNA SOLA VEZ para crear schema + seed + admin por defecto en Supabase
 * Uso: node database/setup.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs   = require('fs');
const path = require('path');

async function setup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Conexion PostgreSQL (Supabase) establecida');

  // Ejecutar schema: dividir por ; y correr cada sentencia
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const schemaStatements = schema.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of schemaStatements) {
    await pool.query(stmt);
  }
  console.log('Schema aplicado');

  // Insertar partidos iniciales
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await pool.query(seed);
  console.log('Partidos iniciales insertados');

  // Crear administrador por defecto si no existe
  const { rows } = await pool.query(
    'SELECT id FROM usuarios WHERE nombre_usuario = $1', ['admin']
  );
  if (rows.length === 0) {
    const hash = await bcrypt.hash('Talma2026!', 12);
    await pool.query(
      'INSERT INTO usuarios (id, nombre_usuario, password_hash, rol) VALUES ($1, $2, $3, $4)',
      [uuidv4(), 'admin', hash, 'admin']
    );
    console.log('Admin creado  ->  usuario: admin  |  password: Talma2026!');
  } else {
    console.log('Admin ya existe, omitido');
  }

  await pool.end();
  console.log('\nSetup completado. El backend esta listo para iniciarse.');
}

setup().catch(err => { console.error('Error en setup:', err.message); process.exit(1); });
