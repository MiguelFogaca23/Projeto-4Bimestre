const express = require('express');
const controller = require('../controllers/livrosController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.get('/', controller.listar);
router.post('/', requireAuth, requireRole('admin'), controller.criar);
router.put('/:id', requireAuth, requireRole('admin'), controller.atualizar);
router.delete('/:id', requireAuth, requireRole('admin'), controller.remover);

module.exports = router;
