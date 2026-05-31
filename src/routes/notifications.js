const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { addClient } = require('../services/sseService');

// SSE: EventSource no soporta headers custom, el JWT viene como query param
router.get('/stream', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Heartbeat cada 25 s para mantener la conexión viva
  const heartbeat = setInterval(() => { try { res.write(':heartbeat\n\n'); } catch { clearInterval(heartbeat); } }, 25000);

  addClient(res);
  req.on('close', () => clearInterval(heartbeat));
});

module.exports = router;
