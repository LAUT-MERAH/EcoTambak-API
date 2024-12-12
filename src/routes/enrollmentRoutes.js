const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, enrollmentController.enrollInModule);

module.exports = router;
