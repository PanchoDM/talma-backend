const pool = require('../config/database');

/**
 * Analiza las últimas 3 predicciones procesadas de un usuario.
 * Retorna:
 *   { streak: 'hot', message: '¡Eres un Dios apostando!' }      → 3 aciertos consecutivos (>0 pts)
 *   { streak: 'cold', message: 'Sigue intentando, podemos recuperarnos' } → 3 fallos consecutivos (0 pts)
 *   { streak: 'neutral', message: null }                         → sin racha
 */
async function getStreak(usuarioId) {
  const [rows] = await pool.query(
    `SELECT puntos_obtenidos
     FROM predicciones
     WHERE usuario_id = ? AND puntos_obtenidos IS NOT NULL
     ORDER BY id DESC
     LIMIT 3`,
    [usuarioId]
  );

  if (rows.length < 3) return { streak: 'neutral', message: null };

  const allHot  = rows.every(r => r.puntos_obtenidos > 0);
  const allCold = rows.every(r => r.puntos_obtenidos === 0);

  if (allHot)  return { streak: 'hot',  message: '¡Eres un Dios apostando!' };
  if (allCold) return { streak: 'cold', message: 'Sigue intentando, podemos recuperarnos' };

  return { streak: 'neutral', message: null };
}

module.exports = { getStreak };
