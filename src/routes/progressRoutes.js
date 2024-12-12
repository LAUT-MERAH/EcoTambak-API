const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { verifyToken } = require('../middleware/authMiddleware');

// Mark lesson as completed
router.post('/lessons/:lessonUlid', verifyToken, progressController.markLessonCompleted);

module.exports = router;
