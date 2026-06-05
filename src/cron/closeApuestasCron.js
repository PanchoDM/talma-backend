/**
 * closeApuestasCron.js — Cierra apuestas automáticamente al medio tiempo.
 *
 * Lógica:
 *   - Se ejecuta cada minuto.
 *   - Calcula el "umbral Lima" = hora actual UTC −5h −45min.
 *   - Cierra (apuestas_abiertas = FALSE) todo partido cuya fecha_partido ≤ umbral.
 *
 * Por qué así:
 *   - Las fechas en BD están guardadas como string en hora Lima (UTC-5), sin tz.
 *   - Restamos 5h para convertir UTC → Lima, y luego 45min para obtener el
 *     instante en que debería estar en el medio tiempo del partido.
 *   - Al comparar strings ISO-like 'YYYY-MM-DD HH:mm:ss' en Postgres,
 *     el orden lexicográfico es idéntico al cronológico → la comparación es correcta.
 */
const cron       = require('node-cron');
const pool       = require('../config/database');
const { broadcast } = require('../services/sseService');

const LIMA_OFFSET_MS  = 5 * 60 * 60 * 1000; // UTC-5 en milisegundos
const HALFTIME_MS     = 45 * 60 * 1000;       // 45 minutos en milisegundos

function limaThreshold() {
  const d = new Date(Date.now() - LIMA_OFFSET_MS - HALFTIME_MS);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
         `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

async function cerrarApuestasVencidas() {
  try {
    const umbral = limaThreshold();

    const { rows: cerrados } = await pool.query(
      `UPDATE partidos
       SET apuestas_abiertas = FALSE
       WHERE apuestas_abiertas = TRUE
         AND fecha_partido <= $1
       RETURNING id, equipo_local, equipo_visitante`,
      [umbral]
    );

    if (!cerrados.length) return;

    console.log(`[Cron:closeApuestas] ${cerrados.length} partido(s) cerrado(s) al umbral ${umbral}`);

    // Un evento 'bet-closed' por partido (mismo formato que el cierre manual)
    cerrados.forEach(p => {
      const match_name = `${p.equipo_local} vs ${p.equipo_visitante}`;
      console.log(`  ✓ #${p.id} ${match_name}`);
      broadcast('bet-closed', { partido_id: p.id, match_name });
    });
  } catch (err) {
    console.error('[Cron:closeApuestas] Error:', err.message);
  }
}

// Ejecutar cada minuto
cron.schedule('* * * * *', cerrarApuestasVencidas, { timezone: 'America/Lima' });

console.log('[Cron:closeApuestas] Scheduler activo — cierre automático de apuestas cada minuto');
module.exports = { cerrarApuestasVencidas };
