const express = require('express');
const controller = require('../controllers/authController');

const router = express.Router();
router.post('/login', controller.login);
router.post('/register', controller.register);
router.post('/logout', controller.logout);
router.get('/me', controller.currentUser);

module.exports = router;
