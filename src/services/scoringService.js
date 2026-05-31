const pool = require('../config/database');

/**
 * Calcula y reparte puntos para todas las predicciones de un partido finalizado.
 * Reglas:
 *   - Marcador exacto al medio tiempo → 10 puntos
 *   - Tendencia correcta (local/empate/visitante) → 3 puntos
 *   - Sin acierto → 0 puntos
 */
async function calcularYRepartirPuntos(partidoId) {
  const [[partido]] = await pool.query(
    'SELECT goles_local_mt, goles_visitante_mt FROM partidos WHERE id = ?',
    [partidoId]
  );
  if (!partido) throw new Error(`Partido ${partidoId} no encontrado`);

  const { goles_local_mt: gl, goles_visitante_mt: gv } = partido;
  if (gl === null || gv === null) throw new Error('El partido no tiene marcador registrado');

  const tendenciaReal = gl > gv ? 'local' : gl < gv ? 'visitante' : 'empate';

  const [predicciones] = await pool.query(
    'SELECT id, usuario_id, goles_local_esperados_mt, goles_visitante_esperados_mt, tendencia_apostada FROM predicciones WHERE partido_id = ? AND puntos_obtenidos IS NULL',
    [partidoId]
  );

  for (const pred of predicciones) {
    let puntos = 0;
    const esExacto = pred.goles_local_esperados_mt === gl && pred.goles_visitante_esperados_mt === gv;
    const esTendencia = pred.tendencia_apostada === tendenciaReal;

    if (esExacto)      puntos = 10;
    else if (esTendencia) puntos = 3;

    await pool.query(
      'UPDATE predicciones SET puntos_obtenidos = ? WHERE id = ?',
      [puntos, pred.id]
    );

    // Acumular en el perfil del usuario
    if (puntos > 0) {
      const aciertosExactos = esExacto ? 1 : 0;
      await pool.query(
        'UPDATE usuarios SET puntos_totales = puntos_totales + ?, aciertos_exactos = aciertos_exactos + ? WHERE id = ?',
        [puntos, aciertosExactos, pred.usuario_id]
      );
    }
  }

  console.log(`[Scoring] Puntos repartidos para partido ${partidoId} (${predicciones.length} predicciones)`);
}

module.exports = { calcularYRepartirPuntos };
