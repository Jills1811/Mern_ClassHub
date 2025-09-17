const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Auth routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.get('/me', auth, (req, res) => authController.getMe(req, res));
router.put('/update-profile', auth, (req, res) => authController.updateProfile(req, res));
router.put('/change-password', auth, (req, res) => authController.changePassword(req, res));

module.exports = router;