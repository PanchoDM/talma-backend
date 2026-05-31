const pool          = require('../config/database');
const { getStreak } = require('../services/streakService');

async function crear(req, res) {
  const { partido_id, goles_local_esperados_mt, goles_visitante_esperados_mt } = req.body;
  const usuarioId = req.user.id;

  if (partido_id == null || goles_local_esperados_mt == null || goles_visitante_esperados_mt == null)
    return res.status(400).json({ message: 'partido_id, goles_local y goles_visitante son requeridos' });

  try {
    // Verificar que las apuestas estén abiertas para ese partido
    const [[partido]] = await pool.query(
      'SELECT apuestas_abiertas, estado FROM partidos WHERE id = ?', [partido_id]
    );
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });
    if (!partido.apuestas_abiertas || partido.estado === 'finalizado')
      return res.status(403).json({ message: 'Las apuestas para este partido están cerradas' });

    const gl = Number(goles_local_esperados_mt);
    const gv = Number(goles_visitante_esperados_mt);
    const tendencia = gl > gv ? 'local' : gl < gv ? 'visitante' : 'empate';

    await pool.query(
      `INSERT INTO predicciones
         (usuario_id, partido_id, goles_local_esperados_mt, goles_visitante_esperados_mt, tendencia_apostada)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, partido_id, gl, gv, tendencia]
    );
    res.status(201).json({ message: 'Predicción guardada', tendencia });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ message: 'Ya tienes una predicción para este partido' });
    res.status(500).json({ message: 'Error interno' });
  }
}

async function getMias(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT pr.id, pr.partido_id, p.equipo_local, p.equipo_visitante, p.fecha_partido,
              pr.goles_local_esperados_mt, pr.goles_visitante_esperados_mt,
              pr.tendencia_apostada, pr.puntos_obtenidos
       FROM predicciones pr
       JOIN partidos p ON p.id = pr.partido_id
       WHERE pr.usuario_id = ?
       ORDER BY p.fecha_partido ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ message: 'Error interno' });
  }
}

async function getStreakEndpoint(req, res) {
  try {
    const result = await getStreak(req.user.id);
    res.json(result);
  } catch {
    res.status(500).json({ message: 'Error al obtener racha' });
  }
}

module.exports = { crear, getMias, getStreakEndpoint };
