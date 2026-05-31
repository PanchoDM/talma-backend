const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ message: 'Token requerido' });

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ message: 'Acceso restringido a administradores' });
  }
  next();
}

// RESTRICCIÓN 1: el admin no puede apostar
function noAdminBet(req, res, next) {
  if (req.user?.rol === 'admin') {
    return res.status(403).json({ message: 'Los administradores no pueden realizar predicciones' });
  }
  next();
}

module.exports = { verifyToken, adminOnly, noAdminBet };
