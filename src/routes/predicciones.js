const router = require('express').Router();
const { verifyToken, noAdminBet } = require('../middleware/auth');
const { crear, getMias, getStreakEndpoint } = require('../controllers/prediccionesController');

router.post('/',          verifyToken, noAdminBet, crear);
router.get('/mias',       verifyToken,             getMias);
router.get('/mi-racha',   verifyToken,             getStreakEndpoint);

module.exports = router;
