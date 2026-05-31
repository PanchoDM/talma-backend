const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool     = require('../config/database');

async function register(req, res) {
  const { nombre_usuario, password } = req.body;
  if (!nombre_usuario || !password)
    return res.status(400).json({ message: 'nombre_usuario y password son requeridos' });

  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO usuarios (id, nombre_usuario, password_hash) VALUES (?, ?, ?)',
      [uuidv4(), nombre_usuario.trim(), hash]
    );
    res.status(201).json({ message: 'Usuario creado exitosamente' });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ message: 'El nombre de usuario ya existe' });
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

async function login(req, res) {
  const { nombre_usuario, password } = req.body;
  if (!nombre_usuario || !password)
    return res.status(400).json({ message: 'Credenciales requeridas' });

  try {
    const [[user]] = await pool.query(
      'SELECT id, nombre_usuario, password_hash, puntos_totales, aciertos_exactos, rol FROM usuarios WHERE nombre_usuario = ?',
      [nombre_usuario]
    );
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: user.id, nombre_usuario: user.nombre_usuario, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: {
        id:              user.id,
        nombre_usuario:  user.nombre_usuario,
        puntos_totales:  user.puntos_totales,
        aciertos_exactos: user.aciertos_exactos,
        rol:             user.rol,
      },
    });
  } catch {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

module.exports = { register, login };
