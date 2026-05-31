const router = require('express').Router();
const { verifyToken, adminOnly } = require('../middleware/auth');
const { getAll, getById, crear, toggleApuestas, actualizarResultado, eliminar, toggleVisibilidad } = require('../controllers/partidosController');

router.get('/',    verifyToken,              getAll);
router.get('/:id', verifyToken,              getById);
router.post('/',   verifyToken, adminOnly,   crear);
router.patch('/:id/toggle-apuestas', verifyToken, adminOnly, toggleApuestas);
router.patch('/:id/resultado',       verifyToken, adminOnly, actualizarResultado);
router.delete('/:id',                        verifyToken, adminOnly, eliminar);
router.patch('/:id/toggle-visibilidad',      verifyToken, adminOnly, toggleVisibilidad);

module.exports = router;
