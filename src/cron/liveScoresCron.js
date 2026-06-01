/**
 * liveScoresCron.js — Cron Job: actualiza marcadores cada 5 minutos
 *
 * Para activar la integración con una API real:
 *   1. Configura FOOTBALL_API_KEY y FOOTBALL_API_URL en .env
 *   2. Reemplaza la función fetchLiveScores() con la llamada real
 *   3. Mapea el campo de ID externo al partido local (ver comentarios abajo)
 */
const cron   = require('node-cron');
const pool   = require('../config/database');
const { calcularYRepartirPuntos } = require('../services/scoringService');

// ─── Función stub para la API externa ────────────────────────────────────────
async function fetchLiveScores() {
  /**
   * INTEGRACIÓN CON API REAL (descomentar y ajustar según proveedor):
   *
   * const axios = require('axios');
   * const response = await axios.get(`${process.env.FOOTBALL_API_URL}/fixtures`, {
   *   headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY },
   *   params:  { league: process.env.FOOTBALL_TOURNAMENT_ID, live: 'all' }
   * });
   *
   * return response.data.response.map(fixture => ({
   *   // Ajusta estos campos al schema de la API elegida:
   *   equipoLocal:     fixture.teams.home.name,
   *   equipoVisitante: fixture.teams.away.name,
   *   golesLocal:      fixture.score.halftime.home,
   *   golesVisitante:  fixture.score.halftime.away,
   *   estado:          fixture.fixture.status.short, // 'HT' = medio tiempo, 'FT' = finalizado
   * }));
   */

  // Retorna array vacío hasta que se configure la API real
  return [];
}
// ─────────────────────────────────────────────────────────────────────────────

async function procesarMarcadores() {
  console.log('[Cron] Iniciando actualización de marcadores en vivo...');

  try {
    const liveScores = await fetchLiveScores();
    if (!liveScores.length) {
      console.log('[Cron] Sin partidos en vivo o API no configurada');
      return;
    }

    // Obtener partidos no finalizados de la BD
    const { rows: partidos } = await pool.query(
      "SELECT id, equipo_local, equipo_visitante FROM partidos WHERE estado != 'finalizado'"
    );

    for (const score of liveScores) {
      // Mapear por nombres de equipo (ajustar si la API provee un ID externo)
      const partido = partidos.find(
        p => p.equipo_local === score.equipoLocal && p.equipo_visitante === score.equipoVisitante
      );
      if (!partido) continue;

      if (score.estado === 'HT' && score.golesLocal !== null) {
        await pool.query(
          `UPDATE partidos
           SET goles_local_mt = $1, goles_visitante_mt = $2, estado = 'medio_tiempo', apuestas_abiertas = FALSE
           WHERE id = $3`,
          [score.golesLocal, score.golesVisitante, partido.id]
        );
        console.log(`[Cron] ⚽ Medio tiempo actualizado: partido ${partido.id}`);
      }

      if (score.estado === 'FT') {
        await pool.query(
          "UPDATE partidos SET estado = 'finalizado', apuestas_abiertas = FALSE WHERE id = $1",
          [partido.id]
        );
        await calcularYRepartirPuntos(partido.id);
        console.log(`[Cron] 🏁 Partido finalizado y puntos repartidos: partido ${partido.id}`);
      }
    }
  } catch (err) {
    console.error('[Cron] Error al procesar marcadores:', err.message);
  }
}

// Ejecutar cada 5 minutos
cron.schedule('*/5 * * * *', procesarMarcadores, { timezone: 'America/Lima' });

console.log('[Cron] Scheduler de marcadores activo (cada 5 minutos)');
module.exports = { procesarMarcadores };
