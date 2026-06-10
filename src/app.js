require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();
// CORS estricto: en producción solo el frontend de GitHub Pages; en local, localhost:4200
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Rutas
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/partidos',    require('./routes/partidos'));
app.use('/api/predicciones', require('./routes/predicciones'));
app.use('/api/leaderboard',     require('./routes/leaderboard'));
app.use('/api/notifications',   require('./routes/notifications'));

// Cron jobs
require('./cron/liveScoresCron');
require('./cron/closeApuestasCron');

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'PollaMundial2026 v2.0' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 PollaMundial2026 Backend corriendo en http://localhost:${PORT}`);

  // Keep-alive: evita que Render (free tier) hiberne el servidor por inactividad.
  // Requiere la variable de entorno APP_URL con la URL pública del servicio en Render.
  const APP_URL = process.env.APP_URL;
  if (APP_URL) {
    const { get } = APP_URL.startsWith('https') ? require('https') : require('http');
    setInterval(() => {
      get(`${APP_URL}/api/health`, res => {
        console.log(`[keep-alive] ping → ${res.statusCode}`);
        res.resume();
      }).on('error', err => console.error(`[keep-alive] error: ${err.message}`));
    }, 10 * 60 * 1000); // cada 10 minutos
    console.log(`[keep-alive] activo → ${APP_URL}/api/health`);
  }
});
