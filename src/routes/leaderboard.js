const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { getLeaderboard } = require('../controllers/leaderboardController');

router.get('/', verifyToken, getLeaderboard);

module.exports = router;
