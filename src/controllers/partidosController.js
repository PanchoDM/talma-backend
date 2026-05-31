const pool     = require('../config/database');
const { broadcast } = require('../services/sseService');
const { calcularYRepartirPuntos } = require('../services/scoringService');

async function getAll(req, res) {
  try {
    const isAdmin = req.user?.rol === 'admin';
    const whereClause = isAdmin ? '' : 'WHERE visible_usuarios = 1';
    const [rows] = await pool.query(
      `SELECT id, equipo_local, equipo_visitante, fecha_partido,
              goles_local_mt, goles_visitante_mt, estado, apuestas_abiertas, visible_usuarios
       FROM partidos ${whereClause} ORDER BY fecha_partido ASC`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ message: 'Error al obtener partidos' });
  }
}

async function getById(req, res) {
  try {
    const [[partido]] = await pool.query(
      'SELECT * FROM partidos WHERE id = ?', [req.params.id]
    );
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });
    res.json(partido);
  } catch {
    res.status(500).json({ message: 'Error interno' });
  }
}

// FUNCIONALIDAD ADMIN: crear nuevo partido
async function crear(req, res) {
  const { equipo_local, equipo_visitante, fecha_partido } = req.body;
  if (!equipo_local?.trim() || !equipo_visitante?.trim() || !fecha_partido)
    return res.status(400).json({ message: 'equipo_local, equipo_visitante y fecha_partido son requeridos' });

  try {
    const [rows] = await pool.query(
      'INSERT INTO partidos (equipo_local, equipo_visitante, fecha_partido) VALUES (?, ?, ?) RETURNING id',
      [equipo_local.trim(), equipo_visitante.trim(), fecha_partido]
    );
    const newPartido = {
      id: rows[0].id,
      equipo_local: equipo_local.trim(),
      equipo_visitante: equipo_visitante.trim(),
      fecha_partido,
      estado: 'pendiente',
      apuestas_abiertas: true,
    };
    // Notificar a todos los usuarios conectados que hay una nueva apuesta disponible
    broadcast('bet-opened', {
      partido_id: newPartido.id,
      match_name: `${newPartido.equipo_local} vs ${newPartido.equipo_visitante}`,
    });
    res.status(201).json(newPartido);
  } catch {
    res.status(500).json({ message: 'Error al crear partido' });
  }
}

// FUNCIONALIDAD ADMIN: toggle apuestas_abiertas + notificación SSE
async function toggleApuestas(req, res) {
  try {
    const [[partido]] = await pool.query(
      'SELECT id, equipo_local, equipo_visitante, apuestas_abiertas FROM partidos WHERE id = ?',
      [req.params.id]
    );
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });

    const nuevoEstado = !partido.apuestas_abiertas;
    await pool.query(
      'UPDATE partidos SET apuestas_abiertas = ? WHERE id = ?',
      [nuevoEstado, req.params.id]
    );

    const matchName = `${partido.equipo_local} vs ${partido.equipo_visitante}`;
    broadcast(nuevoEstado ? 'bet-opened' : 'bet-closed', {
      partido_id: partido.id,
      match_name: matchName,
    });

    res.json({ id: req.params.id, apuestas_abiertas: nuevoEstado });
  } catch {
    res.status(500).json({ message: 'Error al actualizar partido' });
  }
}

// FUNCIONALIDAD ADMIN: subir resultado en tiempo real
async function actualizarResultado(req, res) {
  const { goles_local_mt, goles_visitante_mt, estado } = req.body;
  const estadosValidos = ['pendiente', 'medio_tiempo', 'finalizado'];

  if (goles_local_mt === undefined || goles_visitante_mt === undefined || !estado)
    return res.status(400).json({ message: 'goles_local_mt, goles_visitante_mt y estado son requeridos' });
  if (!estadosValidos.includes(estado))
    return res.status(400).json({ message: 'Estado inválido' });

  try {
    const [[partido]] = await pool.query(
      'SELECT id, equipo_local, equipo_visitante, estado AS estadoActual FROM partidos WHERE id = ?',
      [req.params.id]
    );
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });

    // LOCK: solo se bloquea cuando el partido ya está finalizado
    if (partido.estadoActual === 'finalizado') {
      return res.status(400).json({
        message: 'El partido ya está finalizado. No se puede modificar el resultado.',
      });
    }

    await pool.query(
      `UPDATE partidos
       SET goles_local_mt = ?, goles_visitante_mt = ?, estado = ?,
           apuestas_abiertas = ?
       WHERE id = ?`,
      [
        Number(goles_local_mt),
        Number(goles_visitante_mt),
        estado,
        estado === 'pendiente' ? true : false,
        req.params.id,
      ]
    );

    // Repartir puntos cuando se registra el marcador de medio tiempo o finalizado
    if (estado === 'medio_tiempo' || estado === 'finalizado') {
      await calcularYRepartirPuntos(partido.id);
    }

    const matchName = `${partido.equipo_local} vs ${partido.equipo_visitante}`;
    broadcast('score-updated', {
      partido_id:        partido.id,
      match_name:        matchName,
      goles_local_mt:    Number(goles_local_mt),
      goles_visitante_mt: Number(goles_visitante_mt),
      estado,
    });

    res.json({ message: 'Resultado actualizado', partido_id: partido.id, estado });
  } catch (err) {
    console.error('[actualizarResultado]', err.message);
    res.status(500).json({ message: 'Error al actualizar resultado' });
  }
}

// FUNCIONALIDAD ADMIN: eliminar partido (solo si está pendiente)
async function eliminar(req, res) {
  try {
    const [[partido]] = await pool.query(
      'SELECT id, equipo_local, equipo_visitante, estado FROM partidos WHERE id = ?',
      [req.params.id]
    );
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });

    if (partido.estado !== 'pendiente') {
      return res.status(400).json({
        message: `No se puede eliminar: el partido ya tiene resultado registrado (${partido.estado}).`,
      });
    }

    await pool.query('DELETE FROM partidos WHERE id = ?', [req.params.id]);

    const matchName = `${partido.equipo_local} vs ${partido.equipo_visitante}`;
    broadcast('partido-eliminado', { partido_id: partido.id, match_name: matchName });

    res.json({ message: `Partido "${matchName}" eliminado correctamente` });
  } catch {
    res.status(500).json({ message: 'Error al eliminar partido' });
  }
}

// FUNCIONALIDAD ADMIN: mostrar/ocultar partido a los usuarios
async function toggleVisibilidad(req, res) {
  try {
    const [[partido]] = await pool.query(
      'SELECT id, visible_usuarios FROM partidos WHERE id = ?',
      [req.params.id]
    );
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado' });

    const nuevoEstado = !partido.visible_usuarios;
    await pool.query(
      'UPDATE partidos SET visible_usuarios = ? WHERE id = ?',
      [nuevoEstado, req.params.id]
    );
    res.json({ id: req.params.id, visible_usuarios: nuevoEstado });
  } catch {
    res.status(500).json({ message: 'Error al actualizar visibilidad' });
  }
}

module.exports = { getAll, getById, crear, toggleApuestas, actualizarResultado, eliminar, toggleVisibilidad };
