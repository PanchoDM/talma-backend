const pool = require('../config/database');

async function getLeaderboard(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT nombre_usuario, puntos_totales, aciertos_exactos, rol,
              RANK() OVER (ORDER BY puntos_totales DESC, aciertos_exactos DESC) AS posicion
       FROM usuarios
       WHERE rol = 'user'
       ORDER BY puntos_totales DESC, aciertos_exactos DESC`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ message: 'Error al obtener tabla de posiciones' });
  }
}

module.exports = { getLeaderboard };
