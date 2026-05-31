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

// Cron job de marcadores en vivo
require('./cron/liveScoresCron');

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'TalmaFM2026 v2.0' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 TalmaFM2026 Backend corriendo en http://localhost:${PORT}`));
