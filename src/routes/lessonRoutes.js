const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { verifyToken } = require('../middleware/authMiddleware');
const { isInstructor } = require('../middleware/instructorMiddleware');

router.get('/:moduleUlid', verifyToken, lessonController.getLessons);
router.post('/', verifyToken, isInstructor, lessonController.addLesson);

module.exports = router;
