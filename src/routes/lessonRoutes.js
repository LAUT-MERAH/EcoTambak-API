const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isInstructor } = require('../middleware/instructorMiddleware');

// Add a lesson to a module (Instructor Only)
router.post('/', verifyToken, isInstructor, lessonController.addLesson);

module.exports = router;
