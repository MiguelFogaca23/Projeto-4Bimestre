const express = require('express');
const controller = require('../controllers/emprestimosController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.get('/', controller.listar);
router.post('/', requireRole('leitor'), controller.solicitar);
router.put('/:id/devolver', controller.devolver);

module.exports = router;
