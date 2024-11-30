const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register Route
router.post('/register', authController.register);
// Login Route
router.post('/login', authController.login);
// Logout Route
router.post('/logout', authController.logout);

module.exports = router;
